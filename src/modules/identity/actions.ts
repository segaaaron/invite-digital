'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { events, identity } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { isErr } from '@/shared/result'
import { guardedSignIn } from './application/guarded-sign-in'
import { parseRole } from './domain/access'
import { SESSION_COOKIE, sessionCookieOptions } from './session-cookie'

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
      : await events.listFor({ userId: usuario.id, email: usuario.email, role: parseRole(usuario.role) })
  const activo = listados === null || isErr(listados) ? null : (listados.value[0] ?? null)

  // `redirect` lanza para hacer su trabajo: va después de escribir la cookie y nunca
  // dentro de un try.
  redirect(activo === null ? '/panel' : `/panel/eventos/${activo.slug}`)
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token !== undefined) await identity.signOut(token)
  jar.delete(SESSION_COOKIE)
  redirect('/panel/entrar')
}
