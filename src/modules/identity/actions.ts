'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { events, identity, notifications } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { isErr } from '@/shared/result'
import { guardedSignIn } from './application/guarded-sign-in'
import { parseRole } from './domain/access'
import { SESSION_COOKIE, requireSession, sessionCookieOptions } from './session-cookie'

export type SignInActionState = {
  status: 'idle' | 'error'
  message: 'invalid_credentials' | 'too_many_attempts' | 'storage_failure' | ''
}

// Cinco intentos por minuto y por IP; tres por minuto y por cuenta.
const attemptSignIn = guardedSignIn({
  ipLimiter: createRateLimiter({ windowMs: 60_000, max: 5 }),
  accountLimiter: createRateLimiter({ windowMs: 60_000, max: 3 }),
  signIn: (input) => identity.signIn(input),
  clock: () => Date.now(),
  log: (message, kind, detail) => console.error(message, kind, detail),
})

export async function signInAction(_previous: SignInActionState, formData: FormData): Promise<SignInActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })

  const outcome = await attemptSignIn({ ip, payload: Object.fromEntries(formData) })
  if (outcome.status === 'error') return { status: 'error', message: outcome.message }

  const jar = await cookies()
  jar.set(SESSION_COOKIE, outcome.token, sessionCookieOptions(outcome.expiresAt))

  // Entrar deja al atelier en el resumen del evento activo —el de fecha más próxima—,
  // que es la pantalla de la maqueta y la que se mira todos los días. La bandeja de
  // eventos sigue en `/panel`, en «Todos los eventos» de la barra, y es adonde se cae
  // cuando todavía no hay ningún evento creado o la base no responde.
  // El actor se resuelve del token recién acuñado, no de la cookie: escribirla y leerla
  // en la misma petición funciona, pero apoyarse en eso es apoyarse en un detalle del
  // framework para decidir qué eventos enseñar.
  const sesion = await identity.authenticateSession(outcome.token)
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
  if (usuario !== null && usuario.mustChangePassword) redirect('/panel/cuenta')

  redirect(
    activo === null
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
 * Al terminar, todas las sesiones de ese usuario están cerradas —la suya incluida—, así
 * que redirige a la puerta para volver a entrar con la nueva. Es la mitad del trabajo:
 * cambiar una contraseña filtrada sin echar al que la tiene no cierra nada.
 */
export async function changePasswordAction(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const actor = await requireSession()

  const result = await identity.changePassword({
    userId: actor.userId,
    email: actor.email,
    current: String(formData.get('current') ?? ''),
    next: String(formData.get('next') ?? ''),
  })

  if (isErr(result)) {
    console.error('cambio de contraseña rechazado', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'weak_password'
          ? 'La contraseña nueva necesita al menos 12 caracteres.'
          : result.error.kind === 'invalid_credentials'
            ? 'La contraseña actual no es correcta.'
            : 'No pudimos guardarla. Inténtalo en un momento.',
    }
  }

  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  // `redirect` lanza para hacer su trabajo: va al final y nunca dentro de un try.
  redirect('/panel/entrar')
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
  if (limiteCodigo.isLimited(await ipActual(), Date.now())) {
    return { status: 'error', message: 'Demasiados códigos seguidos. Espera un minuto.' }
  }

  const email = String(formData.get('email') ?? '')
  const emitido = await identity.requestPasswordReset(email)

  if (isErr(emitido)) {
    console.error('no se pudo emitir el código', emitido.error.kind, emitido.error.detail)
    return { status: 'error', message: 'No pudimos enviarte el código. Inténtalo en un momento.' }
  }

  // `null` es «ese correo no tiene cuenta», y no se distingue del caso bueno.
  if (emitido.value !== null) {
    await notifications.sendPasswordCode({ to: email.trim().toLowerCase(), code: emitido.value.code })
  }

  return { status: 'sent', message: 'Si ese correo tiene cuenta, le acabamos de enviar un código.' }
}

/** Confirma el código y escribe la contraseña nueva. */
export async function confirmPasswordResetAction(_previo: ResetState, formData: FormData): Promise<ResetState> {
  if (limiteConfirmacion.isLimited(await ipActual(), Date.now())) {
    return { status: 'error', message: 'Demasiados intentos. Espera un minuto.' }
  }

  const result = await identity.confirmPasswordReset({
    email: String(formData.get('email') ?? ''),
    code: String(formData.get('code') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  if (isErr(result)) {
    console.error('recuperación rechazada', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'weak_password'
          ? 'La contraseña nueva necesita al menos 12 caracteres.'
          : 'El código no es válido, ya se usó o caducó. Pide uno nuevo.',
    }
  }

  return { status: 'done', message: 'Contraseña cambiada. Ya puedes entrar con ella.' }
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token !== undefined) await identity.signOut(token)
  jar.delete(SESSION_COOKIE)
  redirect('/panel/entrar')
}
