'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { events, identity, notifications } from '@/app/composition/container'
import { clientIpFrom } from '@/shared/http/client-ip'
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
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })

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

async function ipActual(): Promise<string> {
  const bolsa = await headers()
  return clientIpFrom({ realIp: bolsa.get('x-real-ip'), forwardedFor: bolsa.get('x-forwarded-for') })
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

  // `null` es «ese correo no tiene cuenta», y no se distingue del caso bueno.
  if (emitido.value !== null) {
    await notifications.sendPasswordCode({ to: email.trim().toLowerCase(), code: emitido.value.code })
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
          : t('El código no es válido, ya se usó o caducó. Pide uno nuevo.', 'The code is not valid, was already used or expired. Request a new one.'),
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

export type CodigoDeCuentaState = { status: 'idle' | 'sent' | 'done' | 'error'; message: string }

export async function requestAccountCodeAction(): Promise<CodigoDeCuentaState> {
  const t = await tr()
  const actor = await requireSession()
  if (limiteCodigoDeCuenta.isLimited(actor.userId, Date.now())) {
    return { status: 'error', message: t('Ya te mandamos un código hace menos de un minuto. Revisa tu correo.', 'We sent you a code less than a minute ago. Check your email.') }
  }
  const emitido = await identity.requestAccountCode(actor.userId)
  if (isErr(emitido)) {
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
      message: cerradas.error.kind === 'storage_failure' ? t('No pudimos cerrarlas. Inténtalo en un momento.', 'We couldn’t sign them out. Try again in a moment.') : t('El código no es válido, ya se usó o caducó. Pide uno nuevo.', 'The code is not valid, was already used or expired. Request a new one.'),
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
