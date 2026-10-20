import { timingSafeEqual } from 'node:crypto'
import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createCredential, esCorreo } from '../domain/credential'
import { identityError, type IdentityError } from '../domain/errors'
import { newOtp, normalizeOtp, otpExpiry } from '../domain/password-reset'
import type { PasswordHasher, PasswordResetRepository, SessionRepository, TokenMinter, UserRepository } from './ports'

type Deps = {
  users: UserRepository
  resets: PasswordResetRepository
  minter: TokenMinter
  clock: () => Date
}

/**
 * Pide un código para recuperar la contraseña.
 *
 * **Devuelve el código en claro una sola vez**, para que la frontera lo mande por correo.
 * En la base solo queda su SHA-256, como los tokens de sesión y los de invitado: de ahí no
 * se saca ninguno.
 *
 * **Un correo que no existe se responde igual que uno que sí.** Quien pide el código no
 * puede averiguar quién tiene cuenta aquí — sería una lista de clientes del atelier — así
 * que devuelve `ok` con `code: null` y quien llama manda o no manda, sin decir nada
 * distinto en pantalla.
 */
export const requestPasswordReset =
  (deps: Deps) =>
  async (rawEmail: string): Promise<Result<{ userId: string; code: string } | null, IdentityError>> =>
    attempt(
      async () => {
        const email = rawEmail.trim().toLowerCase()
        const userId = await deps.users.findIdByEmail(email)
        if (userId === null) return ok(null)

        const code = newOtp()
        const emitido = await deps.resets.issue({
          userId,
          codeHash: deps.minter.hashOf(code),
          expiresAt: otpExpiry(deps.clock()),
          now: deps.clock(),
        })

        // Agotado el cupo de la hora se responde **igual que un correo sin cuenta**: decir
        // «demasiados códigos para esta cuenta» confirmaría que la cuenta existe, que es justo
        // lo que esta pantalla no puede filtrar. Quien de verdad los pidió recibió cinco.
        if (emitido === 'demasiados') return ok(null)

        return ok({ userId, code })
      },
      (cause) => identityError('storage_failure', `No se pudo emitir el código: ${String(cause)}`),
    )

/**
 * Cambia la contraseña presentando el código.
 *
 * El código se compara en **tiempo constante**: con `===` sobre el hash, el tiempo de
 * respuesta filtra cuántos bytes coinciden. Es la misma razón por la que la cookie de
 * desbloqueo de un evento se compara así.
 *
 * Al acertar se gasta el código, se escribe la contraseña —que apaga la marca de
 * provisional— y **se cierran todas las sesiones**: si alguien había entrado con la
 * anterior, deja de estar dentro en ese mismo instante.
 */
export const confirmPasswordReset =
  (deps: Deps & { sessions: SessionRepository; hasher: PasswordHasher }) =>
  async (input: { email: string; code: string; password: string }): Promise<Result<null, IdentityError>> =>
    attempt(
      async () => {
        const email = input.email.trim().toLowerCase()
        const code = normalizeOtp(input.code)
        if (code === null) return err(identityError('invalid_credentials', 'El código no tiene forma de código.'))

        const userId = await deps.users.findIdByEmail(email)
        if (userId === null) return err(identityError('invalid_credentials', `Sin cuenta para ${email}`))

        const gastado = await gastarCodigo(deps, userId, code)
        if (isErr(gastado)) return gastado

        // La nueva pasa por la misma puerta que un alta: mismo mínimo, mismas reglas.
        const credential = createCredential({ email, password: input.password })
        if (isErr(credential)) return credential

        await deps.resets.consume(gastado.value, deps.clock())
        await deps.users.updatePassword(userId, await deps.hasher.hash(credential.value.password))
        await deps.sessions.deleteByUser(userId)

        return ok(null)
      },
      (cause) => identityError('storage_failure', `No se pudo cambiar la contraseña: ${String(cause)}`),
    )

/**
 * Comprueba el código del correo de ese usuario. Devuelve el id del código para gastarlo
 * **después** de validar lo demás.
 *
 * El intento **se cobra primero**, en la base y en la misma sentencia que devuelve el código
 * (`cobrarIntento`): leer, comparar y contar después dejaba un hueco por el que varias peticiones
 * en paralelo metían más intentos de los permitidos (F8), y el contador es lo único que impide
 * probar el millón de combinaciones de seis dígitos.
 *
 * Sin código vivo, caducado o gastado se responde lo mismo: la pantalla no dice en qué estado está.
 * **El cupo de fallos de la cuenta agotado sí se distingue** (`too_many_attempts`), porque es el
 * único caso en que el consejo cambia —esperar, no pedir otro código—. Quien no tiene sesión recibe
 * igual el texto común: en la pantalla pública, decir «esta cuenta agotó sus intentos» confirmaría
 * que la cuenta existe.
 *
 * Se compara en **tiempo constante**: con `===` sobre el hash, el tiempo de respuesta filtra
 * cuántos bytes coinciden.
 */
async function gastarCodigo(
  deps: { resets: PasswordResetRepository; minter: TokenMinter; clock: () => Date },
  userId: string,
  code: string,
  /**
   * Para qué se emitió el código. Un código del correo actual —recuperar la contraseña, cerrar
   * sesiones— **no** vale para cambiar la dirección, y el de un cambio de dirección no vale para
   * lo demás: cada uno viaja a un buzón distinto, así que confundirlos sería regalar el de al lado.
   */
  proposito: { tipo: 'cuenta' } | { tipo: 'cambio-de-correo'; email: string } = { tipo: 'cuenta' },
): Promise<Result<string, IdentityError>> {
  const reset = await deps.resets.cobrarIntento(userId, deps.clock())
  // El cupo de fallos de la cuenta se distingue del resto: es el único estado en que pedir otro
  // código no arregla nada, y lo que hay que decir es cuánto falta, no «pide uno nuevo».
  if (reset.estado === 'sin_intentos') {
    const minutos = Math.max(1, Math.ceil((reset.hasta.getTime() - deps.clock().getTime()) / 60_000))
    return err(identityError('too_many_attempts', `Cupo de fallos de la cuenta agotado; se abre en ${minutos} min.`))
  }
  if (reset.estado === 'sin_codigo') {
    return err(identityError('invalid_credentials', 'Código caducado, gastado o agotado.'))
  }
  const esperado = proposito.tipo === 'cambio-de-correo' ? proposito.email : null
  if ((reset.pendingEmail ?? null) !== esperado) {
    return err(identityError('invalid_credentials', 'Ese código se emitió para otra cosa.'))
  }
  const entrante = deps.minter.hashOf(code)
  const coincide = entrante.length === reset.codeHash.length && timingSafeEqual(entrante, reset.codeHash)
  if (!coincide) return err(identityError('invalid_credentials', 'Código incorrecto.'))
  return ok(reset.id)
}

/**
 * Cierra las demás sesiones de la cuenta, con el código que llegó a su correo.
 *
 * Con la contraseña compartida todos entran como la misma cuenta: lo único que distingue al
 * dueño es su correo. Sin el código, cualquiera que entrara podría echar a los demás, y al
 * dueño el primero.
 */
export const closeOtherSessions =
  (deps: { resets: PasswordResetRepository; sessions: SessionRepository; minter: TokenMinter; clock: () => Date }) =>
  async (input: { userId: string; sessionId: string; code: string }): Promise<Result<null, IdentityError>> =>
    attempt(
      async () => {
        const code = normalizeOtp(input.code)
        if (code === null) return err(identityError('invalid_credentials', 'El código no tiene forma de código.'))
        const gastado = await gastarCodigo(deps, input.userId, code)
        if (isErr(gastado)) return gastado
        await deps.resets.consume(gastado.value, deps.clock())
        await deps.sessions.deleteOthers(input.userId, input.sessionId)
        return ok(null)
      },
      (cause) => identityError('storage_failure', `No se pudieron cerrar las sesiones: ${String(cause)}`),
    )

/**
 * Pide un código para una cuenta con sesión: el correo sale de la sesión, nunca del formulario.
 *
 * Aquí sí se puede decir la verdad cuando se agota el cupo —quien pregunta ya entró, no hay nada
 * que filtrar sobre quién tiene cuenta—, así que el cupo lleno vuelve como `too_many_attempts` y
 * la pantalla lo explica.
 */
export const requestAccountCode = (deps: Deps) => async (userId: string): Promise<Result<string, IdentityError>> =>
  attempt(
    async () => {
      const code = newOtp()
      const emitido = await deps.resets.issue({ userId, codeHash: deps.minter.hashOf(code), expiresAt: otpExpiry(deps.clock()), now: deps.clock() })
      if (emitido === 'demasiados') return err(identityError('too_many_attempts', 'Demasiados códigos para esta cuenta en la última hora.'))
      return ok(code)
    },
    (cause) => identityError('storage_failure', `No se pudo emitir el código: ${String(cause)}`),
  )

/**
 * **Cambia el correo de la cuenta** (16 oct; antes Mi cuenta mandaba a crear otra cuenta y borrar esta). Lo autoriza
 * el código que llega al correo **actual**, como cerrar las demás sesiones: con la contraseña compartida, cualquiera
 * que entrara podría quedarse con la cuenta. El nuevo no puede ser el de otra cuenta, y lo demás se valida **antes**
 * de gastar el código.
 */
type DepsDeCorreo = {
  resets: PasswordResetRepository
  minter: TokenMinter
  clock: () => Date
  emails: { findIdByEmail(email: string): Promise<string | null>; updateEmail(userId: string, email: string): Promise<void> }
}

/**
 * **Paso 1 del cambio de correo**: emite un código **para la dirección nueva**, que es donde quien
 * llama tiene que mandarlo.
 *
 * Es lo que convierte el cambio en una prueba de que esa dirección es tuya (F12 del escaneo). Sin
 * esto, cualquiera con una cuenta podía ponerse el correo de alguien que estaba por comprar y
 * heredar su acceso al evento cuando el admin lo diera de alta por ese correo.
 */
export const requestEmailChange =
  (deps: DepsDeCorreo) =>
  async (input: { userId: string; email: string }): Promise<Result<{ email: string; code: string }, IdentityError>> =>
    attempt(
      async () => {
        const email = input.email.trim().toLowerCase()
        if (!esCorreo(email)) return err(identityError('invalid_email', `Correo sin forma de correo: ${email}`))
        const dueno = await deps.emails.findIdByEmail(email)
        if (dueno !== null && dueno !== input.userId) return err(identityError('email_taken', 'Ese correo ya es de otra cuenta.'))

        const code = newOtp()
        const emitido = await deps.resets.issue({
          userId: input.userId,
          codeHash: deps.minter.hashOf(code),
          expiresAt: otpExpiry(deps.clock()),
          now: deps.clock(),
          pendingEmail: email,
        })
        if (emitido === 'demasiados') return err(identityError('too_many_attempts', 'Demasiados códigos para esta cuenta en la última hora.'))

        return ok({ email, code })
      },
      (cause) => identityError('storage_failure', `No se pudo emitir el código: ${String(cause)}`),
    )

/**
 * **Paso 2**: cambia el correo si el código es el que se emitió **para esa misma dirección**.
 *
 * Devuelve también el correo anterior, para avisar ahí: un cambio de credenciales se dice en el
 * buzón que lo tenía, que es la única forma de que el dueño se entere si no fue él.
 */
export const changeEmail =
  (deps: DepsDeCorreo) =>
  async (input: { userId: string; email: string; code: string }): Promise<Result<string, IdentityError>> =>
    attempt(
      async () => {
        const email = input.email.trim().toLowerCase()
        if (!esCorreo(email)) return err(identityError('invalid_email', `Correo sin forma de correo: ${email}`))
        const dueno = await deps.emails.findIdByEmail(email)
        if (dueno !== null && dueno !== input.userId) return err(identityError('email_taken', 'Ese correo ya es de otra cuenta.'))
        const code = normalizeOtp(input.code)
        if (code === null) return err(identityError('invalid_credentials', 'El código no tiene forma de código.'))
        // El código tiene que ser **el de esta dirección**: uno del correo actual no cambia nada.
        const gastado = await gastarCodigo(deps, input.userId, code, { tipo: 'cambio-de-correo', email })
        if (isErr(gastado)) return gastado
        await deps.resets.consume(gastado.value, deps.clock())
        await deps.emails.updateEmail(input.userId, email)
        return ok(email)
      },
      (cause) => identityError('storage_failure', `No se pudo cambiar el correo: ${String(cause)}`),
    )
