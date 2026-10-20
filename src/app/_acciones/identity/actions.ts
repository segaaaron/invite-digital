'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { events, identity, notifications } from '@/app/composition/container'
import { cuboDeLaPeticion } from '@/shared/http/client-ip'
import { enSegundoPlano } from '@/shared/http/en-segundo-plano'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { isErr } from '@/shared/result'
import { guardedSignIn } from '@/modules/identity/application/guarded-sign-in'
import { parseRole } from '@/modules/identity/domain/access'
import { describirDispositivo } from '@/modules/identity/domain/dispositivo'
import { SESSION_COOKIE, requireSession, sessionCookieOptions } from '@/app/_acciones/sesion'
import { campo } from '@/shared/forms/campo'
import { registrarFallo } from '@/shared/observability/fallos'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

export type SignInActionState = {
  status: 'idle' | 'error'
  message: 'invalid_credentials' | 'too_many_attempts' | 'storage_failure' | ''
}

// Cinco intentos por minuto y por IP; tres por minuto y por cuenta. Los limitadores viven
// fuera de la petición: dentro se reiniciarían en cada intento.
const limiteIp = createRateLimiter({ windowMs: 60_000, max: 5 })
const limiteCuenta = createRateLimiter({ windowMs: 60_000, max: 3 })
const attemptSignIn = (device: string) =>
  guardedSignIn({
    ipLimiter: limiteIp,
    accountLimiter: limiteCuenta,
    signIn: (input) => identity.signIn({ ...input, device }),
    clock: () => Date.now(),
    log: (message, kind, detail) => registrarFallo('identity/actions', message, kind, detail),
  })

export async function signInAction(_previous: SignInActionState, formData: FormData): Promise<SignInActionState> {
  const headerBag = await headers()
  const ip = cuboDeLaPeticion({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })

  const outcome = await attemptSignIn(describirDispositivo(headerBag.get('user-agent') ?? ''))({ ip, payload: Object.fromEntries(formData) })
  if (outcome.status === 'error') return { status: 'error', message: outcome.message }

  const jar = await cookies()
  // «Recordarme en este aparato» (E14): sin marcar, la cookie no lleva caducidad y se va al cerrar el navegador.
  const { expires, ...soloEstaVez } = sessionCookieOptions(outcome.expiresAt)
  jar.set(SESSION_COOKIE, outcome.token, formData.get('recordarme') === 'on' ? { ...soloEstaVez, expires } : soloEstaVez)
  // El idioma del aparato con que entra queda en la cuenta: es el de sus correos.
  const sesion = await identity.authenticateSession(outcome.token)
  if (!isErr(sesion)) await identity.guardarIdioma(sesion.value.userId, await idiomaDeLaPeticion()).catch((e: unknown) => registrarFallo('identity/actions', 'no se pudo guardar el idioma de la cuenta', 'storage_failure', e))
  return entrarCon(outcome.token)
}

/** Adónde lleva entrar con esta sesión. `redirect` lanza: siempre es lo último. */
async function entrarCon(token: string): Promise<never> {
  // Entrar deja al atelier en el resumen del evento activo —el de fecha más próxima—,
  // que es la pantalla de la maqueta y la que se mira todos los días. La bandeja de
  // eventos sigue en `/panel`, en «Todos los eventos» de la barra, y es adonde se cae
  // cuando todavía no hay ningún evento creado o la base no responde.
  // El actor se resuelve del token recién acuñado, no de la cookie: escribirla y leerla
  // en la misma petición funciona, pero apoyarse en eso es apoyarse en un detalle del
  // framework para decidir qué eventos enseñar.
  const sesion = await identity.authenticateSession(token)
  const usuario = isErr(sesion) ? null : await identity.actorOf(sesion.value.userId)
  const listados =
    usuario === null
      ? null
      : await events.listFor({
          userId: usuario.id,
          email: usuario.email,
          role: parseRole(usuario.role),
          mustChangePassword: usuario.mustChangePassword,
        })
  const activo = listados === null || isErr(listados) ? null : (listados.value[0] ?? null)

  // `redirect` lanza para hacer su trabajo: va después de escribir la cookie y nunca
  // dentro de un try.
  // El personal de puerta cae directamente en su check-in: el resumen del evento le
  // daría 404, que es lo correcto pero una bienvenida pésima.
  const esPuerta = usuario !== null && parseRole(usuario.role) === 'puerta'

  // Con la contraseña provisional se va **directo** a cambiarla. El guard lo rebotaría
  // igual desde cualquier página, pero mandarlo primero a su evento para devolverlo acto
  // seguido es un parpadeo que no explica nada.
  if (usuario !== null && usuario.mustChangePassword) redirect('/panel/nueva-contrasena')

  // El admin no entra a los datos de ninguna boda: su puerta es la administración.
  if (usuario !== null && parseRole(usuario.role) === 'admin') redirect('/panel/admin')

  // El cliente con más de un evento (compró otro) elige en «Mis eventos».
  const varios = usuario !== null && parseRole(usuario.role) === 'cliente' && listados !== null && !isErr(listados) && listados.value.length > 1

  redirect(
    activo === null || varios
      ? '/panel'
      : esPuerta
        ? `/panel/eventos/${activo.slug}/checkin`
        : `/panel/eventos/${activo.slug}`,
  )
}

export type ChangePasswordState = { status: 'idle' | 'error'; message: string }

/**
 * Cambia la contraseña de **quien la pide**, nunca la de otro: el correo sale de la
 * sesión y no del formulario.
 *
 * Solo la provisional, y sin volver a pedirla: acaba de entrar con ella. Al guardar se cierran
 * todas sus sesiones —la clave viajó por correo— y se le abre una nueva con la suya, así que
 * entra directo al panel sin escribirla otra vez.
 */
export async function changePasswordAction(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const t = await tr()
  const actor = await requireSession()
  // Solo la provisional se cambia con sesión. Con la cuenta compartida por la familia, cualquiera
  // que entre podría quitarle el control a quien la compró: el resto va por «¿Olvidaste tu contraseña?»,
  // con el código que llega a su correo.
  if (!actor.mustChangePassword) return { status: 'error', message: t('La contraseña se cambia desde «¿Olvidaste tu contraseña?», con el código de tu correo.', 'The password is changed from “Forgot your password?”, with the code from your email.') }

  const result = await identity.changePassword({
    userId: actor.userId,
    email: actor.email,
    current: null,
    next: campo(formData, 'next'),
  })

  if (isErr(result)) {
    registrarFallo('identity/actions', 'cambio de contraseña rechazado', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'weak_password'
          ? t('La contraseña nueva necesita al menos 12 caracteres.', 'The new password needs at least 12 characters.')
          : t('No pudimos guardarla. Inténtalo en un momento.', 'We couldn’t save it. Try again in a moment.'),
    }
  }

  const bolsa = await headers()
  const jar = await cookies()
  const nueva = await identity.signIn({ email: actor.email, password: campo(formData, 'next'), device: describirDispositivo(bolsa.get('user-agent') ?? '') })
  if (isErr(nueva)) {
    // Guardada sí; la sesión no se abrió. Que entre con la suya.
    jar.delete(SESSION_COOKIE)
    redirect('/panel/entrar')
  }
  jar.set(SESSION_COOKIE, nueva.value.token, sessionCookieOptions(nueva.value.expiresAt))
  return entrarCon(nueva.value.token)
}

// ============================================================================
// La recuperación de contraseña. **Públicas**: quien las llama no tiene sesión —la ha
// perdido, de eso se trata—, así que van con límite de tasa por IP y no dicen nunca si un
// correo existe.
// ============================================================================

/** Tres códigos por minuto y por IP: cada uno manda un correo. */
const limiteCodigo = createRateLimiter({ windowMs: 60_000, max: 3 })
/** Y diez intentos de confirmación: el tope por código lo lleva la propia tabla. */
const limiteConfirmacion = createRateLimiter({ windowMs: 60_000, max: 10 })

export type ResetState = { status: 'idle' | 'sent' | 'done' | 'error'; message: string }

/**
 * La clave del limitador para esta petición: la IP y, en IPv6, su bloque de 64 bits. Con la
 * dirección completa no limitaba nada —a cualquiera le dan un bloque entero y rotarlo es gratis—,
 * que es cómo el escaneo estimaba miles de ciclos por minuto contra el código (F7).
 */
async function ipActual(): Promise<string> {
  const bolsa = await headers()
  return cuboDeLaPeticion({ realIp: bolsa.get('x-real-ip'), forwardedFor: bolsa.get('x-forwarded-for') })
}

/**
 * Pide el código.
 *
 * **Responde igual exista o no la cuenta.** Decir «ese correo no está registrado»
 * convertiría esta pantalla en una forma de averiguar quién es cliente del atelier.
 */
export async function requestPasswordResetAction(_previo: ResetState, formData: FormData): Promise<ResetState> {
  const t = await tr()
  if (limiteCodigo.isLimited(await ipActual(), Date.now())) {
    return { status: 'error', message: t('Demasiados códigos seguidos. Espera un minuto.', 'Too many codes in a row. Wait a minute.') }
  }

  const email = campo(formData, 'email')
  const emitido = await identity.requestPasswordReset(email)

  if (isErr(emitido)) {
    registrarFallo('identity/actions', 'no se pudo emitir el código', emitido.error.kind, emitido.error.detail)
    return { status: 'error', message: t('No pudimos enviarte el código. Inténtalo en un momento.', 'We couldn’t send you the code. Try again in a moment.') }
  }

  // `null` es «ese correo no tiene cuenta» (o su cupo de la hora), y no se distingue del caso bueno.
  //
  // El correo **no se espera**: la ida y vuelta a Resend son cientos de milisegundos, y esperarla
  // solo cuando la cuenta existe convertía el tiempo de respuesta en la respuesta que la pantalla
  // se calla (F14). Sale en segundo plano y, si no sale, queda en el registro de fallos.
  if (emitido.value !== null) {
    const codigo = emitido.value.code
    const destino = email.trim().toLowerCase()
    enSegundoPlano(async () => {
      const enviado = await notifications.sendPasswordCode({ to: destino, code: codigo })
      if (!enviado) registrarFallo('identity/actions', 'no se pudo enviar el código de recuperación', 'email_failure', 'el remitente devolvió falso')
    })
  }

  return { status: 'sent', message: t('Si ese correo tiene cuenta, le acabamos de enviar un código.', 'If that email has an account, we just sent it a code.') }
}

/** Confirma el código y escribe la contraseña nueva. */
export async function confirmPasswordResetAction(_previo: ResetState, formData: FormData): Promise<ResetState> {
  const t = await tr()
  if (limiteConfirmacion.isLimited(await ipActual(), Date.now())) {
    return { status: 'error', message: t('Demasiados intentos. Espera un minuto.', 'Too many attempts. Wait a minute.') }
  }

  const result = await identity.confirmPasswordReset({
    email: campo(formData, 'email'),
    code: campo(formData, 'code'),
    password: campo(formData, 'password'),
  })

  if (isErr(result)) {
    registrarFallo('identity/actions', 'recuperación rechazada', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'weak_password'
          ? t('La contraseña nueva necesita al menos 12 caracteres.', 'The new password needs at least 12 characters.')
          : // Los dos motivos van en el mismo texto a propósito: en una pantalla sin sesión, decir
            // «esta cuenta agotó sus intentos» confirmaría que la cuenta existe. Pero ya no manda
            // a pedir otro código como única salida, que con el cupo agotado no sirve de nada.
            t(
              'El código no es válido, ya se usó, caducó o se agotaron los intentos de la última hora. Pide uno nuevo o inténtalo más tarde.',
              'The code is not valid, was already used, expired, or the attempts for the last hour ran out. Request a new one or try again later.',
            ),
    }
  }

  return { status: 'done', message: t('Contraseña cambiada. Ya puedes entrar con ella.', 'Password changed. You can now sign in with it.') }
}

// ============================================================================
// La seguridad de la cuenta con sesión. **Piden el código del correo**: con la contraseña
// compartida todos entran como la misma cuenta, y el correo es lo único del dueño.
// ============================================================================

/** Un código por minuto por cuenta: cada uno manda un correo. */
const limiteCodigoDeCuenta = createRateLimiter({ windowMs: 60_000, max: 1 })

/**
 * El cupo de la hora es **de la cuenta** y lo comparten los tres flujos de código (recuperar,
 * cerrar sesiones y cambiar el correo). Por eso el texto **no acusa a quien lo lee**: lo agota
 * cualquiera que conozca el correo, y a quien se lo encuentra al entrar le decía «pediste
 * demasiados códigos», que ni es verdad ni ayuda.
 */
const ESPERA_DEL_CUPO = (t: (es: string, en: string) => string): string =>
  t(
    'Se alcanzó el tope de códigos e intentos de esta cuenta en la última hora. Espera un rato y vuelve a intentarlo; nada de tu cuenta ha cambiado.',
    'This account reached its limit of codes and attempts for the last hour. Wait a while and try again; nothing in your account has changed.',
  )

export type CodigoDeCuentaState = { status: 'idle' | 'sent' | 'done' | 'error'; message: string }

export async function requestAccountCodeAction(): Promise<CodigoDeCuentaState> {
  const t = await tr()
  const actor = await requireSession()
  if (limiteCodigoDeCuenta.isLimited(actor.userId, Date.now())) {
    return { status: 'error', message: t('Ya te mandamos un código hace menos de un minuto. Revisa tu correo.', 'We sent you a code less than a minute ago. Check your email.') }
  }
  const emitido = await identity.requestAccountCode(actor.userId)
  if (isErr(emitido)) {
    // El cupo de la hora (`0097`) no es un fallo del servicio: se dice y no se registra como tal.
    if (emitido.error.kind === 'too_many_attempts') {
      return {
        status: 'error',
        message: ESPERA_DEL_CUPO(t),
      }
    }
    registrarFallo('identity/actions', 'no se pudo emitir el código de cuenta', emitido.error.kind, emitido.error.detail)
    return { status: 'error', message: t('No pudimos enviarte el código. Inténtalo en un momento.', 'We couldn’t send you the code. Try again in a moment.') }
  }
  const enviado = await notifications.sendPasswordCode({ to: actor.email, code: emitido.value })
  if (!enviado) return { status: 'error', message: t('No pudimos enviar el correo. Escríbenos por WhatsApp.', 'We couldn’t send the email. Message us on WhatsApp.') }
  return { status: 'sent', message: t(`Te mandamos un código a ${actor.email}. Caduca en 10 minutos.`, `We sent a code to ${actor.email}. It expires in 10 minutes.`) }
}

/** Cierra todas las sesiones de la cuenta menos esta. */
export async function closeOtherSessionsAction(_previo: CodigoDeCuentaState, formData: FormData): Promise<CodigoDeCuentaState> {
  const t = await tr()
  const actor = await requireSession()
  const sesion = await identity.authenticateSession((await cookies()).get(SESSION_COOKIE)?.value ?? null)
  if (isErr(sesion)) redirect('/panel/entrar')

  const cerradas = await identity.closeOtherSessions({ userId: actor.userId, sessionId: sesion.value.sessionId, code: campo(formData, 'code') })
  if (isErr(cerradas)) {
    return {
      status: 'error',
      message:
        cerradas.error.kind === 'storage_failure'
          ? t('No pudimos cerrarlas. Inténtalo en un momento.', 'We couldn’t sign them out. Try again in a moment.')
          : cerradas.error.kind === 'too_many_attempts'
            ? ESPERA_DEL_CUPO(t)
            : t('El código no es válido, ya se usó o caducó. Pide uno nuevo.', 'The code is not valid, was already used or expired. Request a new one.'),
    }
  }
  revalidatePath('/panel/cuenta')
  return { status: 'done', message: t('Listo: solo queda abierta tu sesión en este dispositivo.', 'Done: only your session on this device remains open.') }
}

export type MisDatosState = { status: 'idle' | 'success' | 'error'; message?: string }

/** «Tus datos» (Mi cuenta): nombre y teléfono de la propia cuenta. En modo soporte no se tocan los del cliente. */
export async function guardarMisDatosAction(_previo: MisDatosState, formData: FormData): Promise<MisDatosState> {
  const t = await tr()
  const actor = await requireSession()
  if (actor.soporte) return { status: 'error', message: t('En modo soporte no se cambian los datos del cliente.', 'In support mode the client’s details are not changed.') }
  const nombre = campo(formData, 'nombre').trim().replace(/\s+/g, ' ')
  const telefono = campo(formData, 'telefono').replace(/[^\d+]/g, '')
  if (nombre.length > 120) return { status: 'error', message: t('El nombre puede tener hasta 120 letras.', 'The name can have up to 120 letters.') }
  if (telefono !== '' && (telefono.replace('+', '').length < 7 || telefono.length > 20)) return { status: 'error', message: t('Revisa el teléfono: son de 7 a 15 números, con el código del país si es de fuera.', 'Check the phone: 7 to 15 digits, with the country code if it is from abroad.') }
  try {
    await identity.guardarMisDatos(actor.userId, { nombre: nombre === '' ? null : nombre, telefono: telefono === '' ? null : telefono })
  } catch (e) {
    registrarFallo('identity/actions', 'no se pudieron guardar los datos de la cuenta', 'storage_failure', e)
    return { status: 'error', message: t('No pudimos guardarlos. Inténtalo en un momento.', 'We couldn’t save them. Try again in a moment.') }
  }
  revalidatePath('/panel', 'layout')
  return { status: 'success', message: t('Guardado.', 'Saved.') }
}

/**
 * Cambia el correo de la propia cuenta con el código que llegó al correo **actual** (`requestAccountCodeAction`).
 * Antes Mi cuenta decía «crea otra cuenta y borra esta» (16 oct). En modo soporte no: es la cuenta del cliente.
 */
/**
 * **Paso 1 del cambio de correo**: manda el código **a la dirección nueva**.
 *
 * Es lo que prueba que esa dirección es de quien la pide (F12). El correo sale en segundo plano,
 * como el de recuperación: la pantalla no espera a Resend.
 */
export async function pedirCodigoDeCorreoNuevoAction(_previo: CodigoDeCuentaState, formData: FormData): Promise<CodigoDeCuentaState> {
  const t = await tr()
  const actor = await requireSession()
  if (actor.soporte) return { status: 'error', message: t('En modo soporte no se cambia el correo del cliente.', 'In support mode the client’s email is not changed.') }

  const emitido = await identity.pedirCodigoDeCorreoNuevo({ userId: actor.userId, email: campo(formData, 'correo') })
  if (isErr(emitido)) {
    if (emitido.error.kind === 'storage_failure') registrarFallo('identity/actions', 'no se pudo emitir el código del correo nuevo', emitido.error.kind, emitido.error.detail)
    const mensaje: Record<string, string> = {
      invalid_email: t('Revisa el correo nuevo: no tiene forma de correo.', 'Check the new email: it doesn’t look like an email.'),
      email_taken: t('Ese correo ya es de otra cuenta.', 'That email already belongs to another account.'),
      too_many_attempts: ESPERA_DEL_CUPO(t),
    }
    return { status: 'error', message: mensaje[emitido.error.kind] ?? t('No pudimos enviarte el código. Inténtalo en un momento.', 'We couldn’t send you the code. Try again in a moment.') }
  }

  // **Aquí el envío sí se espera**, al contrario que en la recuperación. El segundo plano de
  // `requestPasswordReset` existe para que el tiempo de respuesta no revele si la cuenta existe
  // (F14); aquí ya hay sesión y el correo nuevo lo acaba de escribir quien está mirando, así que
  // no hay nada que ocultar — y sí hay algo que decir: si el código no salió, mandarle a escribirlo
  // lo deja esperando un correo que no va a llegar.
  const { email: destino, code } = emitido.value
  const enviado = await notifications.sendPasswordCode({ to: destino, code })
  if (!enviado) {
    registrarFallo('identity/actions', 'no se pudo enviar el código del correo nuevo', 'email_failure', 'el remitente devolvió falso')
    return { status: 'error', message: t(`No pudimos enviar el código a ${destino}. Revisa la dirección e inténtalo en un momento.`, `We couldn’t send the code to ${destino}. Check the address and try again in a moment.`) }
  }

  return { status: 'sent', message: t(`Te mandamos un código a ${destino}. Escríbelo aquí para confirmar que es tuyo.`, `We sent a code to ${destino}. Enter it here to confirm it is yours.`) }
}

export async function cambiarCorreoAction(_previo: CodigoDeCuentaState, formData: FormData): Promise<CodigoDeCuentaState> {
  const t = await tr()
  const actor = await requireSession()
  if (actor.soporte) return { status: 'error', message: t('En modo soporte no se cambia el correo del cliente.', 'In support mode the client’s email is not changed.') }
  const hecho = await identity.cambiarCorreo({ userId: actor.userId, email: campo(formData, 'correo'), code: campo(formData, 'code') })
  if (isErr(hecho)) {
    if (hecho.error.kind === 'storage_failure') registrarFallo('identity/actions', 'no se pudo cambiar el correo de la cuenta', hecho.error.kind, hecho.error.detail)
    const mensaje: Record<string, string> = {
      invalid_email: t('Revisa el correo nuevo: no tiene forma de correo.', 'Check the new email: it doesn’t look like an email.'),
      email_taken: t('Ese correo ya es de otra cuenta.', 'That email already belongs to another account.'),
      invalid_credentials: t('El código no es válido, ya se usó o caducó. Pide uno nuevo.', 'The code is not valid, was already used or expired. Request a new one.'),
      too_many_attempts: ESPERA_DEL_CUPO(t),
    }
    return { status: 'error', message: mensaje[hecho.error.kind] ?? t('No pudimos cambiarlo. Inténtalo en un momento.', 'We couldn’t change it. Try again in a moment.') }
  }
  // Al buzón que tenía la cuenta: si el cambio no lo hizo su dueño, es la única forma de que se
  // entere. Va en segundo plano y queda en el registro si no sale.
  const anterior = actor.email
  if (anterior !== hecho.value) {
    enSegundoPlano(async () => {
      const avisado = await notifications.sendEmailChanged({ to: anterior, nuevo: hecho.value })
      if (!avisado) registrarFallo('identity/actions', 'no se pudo avisar al correo anterior del cambio', 'email_failure', 'el remitente devolvió falso')
    })
  }

  revalidatePath('/panel', 'layout')
  return { status: 'done', message: t(`Listo: ahora entras con ${hecho.value}.`, `Done: you now sign in with ${hecho.value}.`) }
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token !== undefined) {
    // Cerrar sesión cierra también el modo soporte: queda la hora de salida en su registro.
    const sesion = await identity.authenticateSession(token)
    if (!isErr(sesion) && sesion.value.supportSessionId !== null) await identity.support.close(sesion.value.sessionId, new Date())
    await identity.signOut(token)
  }
  jar.delete(SESSION_COOKIE)
  redirect('/panel/entrar')
}
