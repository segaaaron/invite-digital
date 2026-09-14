import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { events, identity } from '@/app/composition/container'
import { PATHNAME_HEADER } from '@/shared/config/headers'
import { isErr } from '@/shared/result'
import { type Actor, type EventSection, isAdmin, parseRole } from './domain/access'

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
/** Adonde se manda a quien todavía usa la contraseña que le escribió otro. */
const CAMBIAR_CONTRASENA = '/panel/cuenta'

export async function requireSession(): Promise<Actor> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value ?? null
  const result = await identity.authenticateSession(token)

  if (isErr(result)) redirect('/panel/entrar')

  const usuario = await identity.actorOf(result.value.userId)
  // Sesión válida cuyo usuario ya no existe: lo borró el admin mientras miraba. Vuelve a
  // la puerta en vez de seguir con un actor a medias.
  if (usuario === null) redirect('/panel/entrar')

  // Su contraseña la escribió otro y viajó por correo: hasta que elija una suya, el panel
  // no le deja hacer nada más que cambiarla. Quien la escribió podría entrar como él.
  //
  // **La excepción la decide la ruta, no quien llama.** Antes había que pedirla página por
  // página, y el layout de `(atelier)` —que se evalúa antes que la página de cuenta y no
  // la pedía— redirigía a esa misma dirección: bucle infinito, y con él las diez páginas
  // de esa carcasa inalcanzables. Leyendo la ruta, olvidarse deja de ser posible.
  const ruta = (await headers()).get(PATHNAME_HEADER) ?? ''
  if (usuario.mustChangePassword && !ruta.startsWith(CAMBIAR_CONTRASENA)) {
    redirect(CAMBIAR_CONTRASENA)
  }

  return {
    userId: usuario.id,
    email: usuario.email,
    role: parseRole(usuario.role),
    mustChangePassword: usuario.mustChangePassword,
  }
}

/**
 * Puerta de la administración. Un usuario normal recibe **404**, no 403: un 403
 * confirmaría que la sección existe, y para quien no es admin no existe.
 */
export async function requireAdmin(): Promise<Actor> {
  const actor = await requireSession()
  if (!isAdmin(actor)) notFound()
  return actor
}

/**
 * La guardia de las Server Actions del panel: este evento es tuyo, o eres admin.
 *
 * **Lanza en vez de devolver un estado de error, y es a propósito.** Un usuario legítimo
 * no puede llegar aquí desde ninguna pantalla: el evento ajeno ni siquiera aparece en su
 * bandeja. Meter un mensaje de «esto no es tuyo» en las cincuenta y cuatro acciones sería
 * mantener texto para un estado inalcanzable por la interfaz. Lo que importa es que **no
 * se escribe nada**, y eso lo garantiza el lanzar.
 *
 * Quien llega aquí a mano —con `fetch` y el identificador de otro— recibe un fallo
 * genérico, que es todo lo que merece saber.
 */
export async function requireEventAccess(
  actor: Actor,
  ref: { eventId?: string | undefined; eventSlug?: string | undefined; section?: EventSection },
): Promise<void> {
  const permitido = await events.canTouch(actor, ref)
  if (!permitido) {
    console.error('acceso denegado a evento ajeno', actor.email, ref.eventSlug ?? ref.eventId ?? '(sin referencia)')
    throw new Error('Evento no encontrado')
  }
}
