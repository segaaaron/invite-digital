import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { identity } from '@/app/composition/container'
import { isErr } from '@/shared/result'

export const SESSION_COOKIE = 'invite_session'

export const sessionCookieOptions = (expiresAt: Date) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  }) as const

/**
 * Puerta de todas las páginas del panel. Devuelve el usuario o redirige: nunca devuelve
 * `null`, para que ninguna página pueda olvidarse de comprobarlo.
 *
 * La renovación deslizante escribe en la base pero no reescribe la cookie: Next prohíbe
 * tocarla desde un Server Component. Con ventana de 30 días y renovación a los 15, la
 * siguiente acción del panel la refresca mucho antes de que nadie pierda la sesión.
 */
export async function requireSession(): Promise<{ userId: string }> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value ?? null
  const result = await identity.authenticateSession(token)

  if (isErr(result)) redirect('/panel/entrar')

  return { userId: result.value.userId }
}
