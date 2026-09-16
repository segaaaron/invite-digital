import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { admin, events, identity } from '@/app/composition/container'
import { PATHNAME_HEADER } from '@/shared/config/headers'
import { isErr } from '@/shared/result'
import { type Actor, type EventSection, isAdmin, parseRole } from '@/modules/identity/domain/access'
import { actorDeSesion } from '@/modules/identity/domain/support'

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
/** Pantalla propia, fuera del panel: con la provisional no se entra a ninguna otra. */
const CAMBIAR_CONTRASENA = '/panel/nueva-contrasena'
/** La cuenta de quien entró. En modo soporte no se toca, y tampoco la pantalla de arriba. */
const CUENTA = '/panel/cuenta'

/**
 * **Una vez por petición** (`cache` de React): la carcasa y la página la piden las dos, y cada
 * resolución son dos o tres viajes a la base —sesión, renovación y actor—. El resultado, o la
 * redirección, es el mismo dentro de una petición; entre peticiones no se comparte nada.
 */
export const requireSession = cache(leerSesion)

async function leerSesion(): Promise<Actor> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value ?? null
  const result = await identity.authenticateSession(token)

  if (isErr(result)) redirect('/panel/entrar')

  const fila = await identity.actorOf(result.value.userId)
  // Sesión válida cuyo usuario ya no existe: lo borró el admin mientras miraba. Vuelve a
  // la puerta en vez de seguir con un actor a medias.
  if (fila === null) redirect('/panel/entrar')
  const usuario = aActor(fila)

  // Modo soporte: el admin actúa como el cliente. Solo se consulta si la sesión lo tiene.
  const abierto = result.value.supportSessionId === null ? null : await identity.support.activeFor(result.value.sessionId)
  const cliente = abierto === null ? null : await identity.actorOf(abierto.clientUserId)
  const { actor, limpiar } = actorDeSesion(
    usuario,
    abierto === null ? null : { id: abierto.id, adminEmail: abierto.adminEmail, cliente: cliente === null ? null : aActor(cliente) },
  )
  if (limpiar || (result.value.supportSessionId !== null && abierto === null)) await identity.support.close(result.value.sessionId, new Date())

  const cabeceras = await headers()
  const ruta = cabeceras.get(PATHNAME_HEADER) ?? ''

  if (actor.soporte !== undefined) {
    // La cuenta del cliente —su contraseña, su correo— no se toca en modo soporte.
    if (ruta.startsWith(CUENTA) || ruta.startsWith(CAMBIAR_CONTRASENA)) notFound()
    // Cada cambio hecho como el cliente queda firmado por el admin. Una Server Action es la
    // única forma de escribir, y trae `next-action`: un solo sitio, no ochenta acciones.
    if (cabeceras.get('next-action') !== null) {
      await admin.record(
        { userId: actor.soporte.adminUserId, email: actor.soporte.adminEmail, role: 'admin', mustChangePassword: false },
        { action: 'soporte.accion', subject: ruta || null, detail: `como ${actor.email}` },
      )
    }
    return actor
  }

  // Su contraseña la escribió otro y viajó por correo: hasta que elija una suya, el panel
  // no le deja hacer nada más que cambiarla. Quien la escribió podría entrar como él.
  //
  // **La excepción la decide la ruta, no quien llama.** Antes había que pedirla página por
  // página, y el layout de `(atelier)` —que se evalúa antes que la página de cuenta y no
  // la pedía— redirigía a esa misma dirección: bucle infinito, y con él las diez páginas
  // de esa carcasa inalcanzables. Leyendo la ruta, olvidarse deja de ser posible.
  if (actor.mustChangePassword && !ruta.startsWith(CAMBIAR_CONTRASENA)) {
    redirect(CAMBIAR_CONTRASENA)
  }

  return actor
}

const aActor = (fila: { id: string; email: string; role: string; mustChangePassword: boolean }): Actor => ({
  userId: fila.id,
  email: fila.email,
  role: parseRole(fila.role),
  mustChangePassword: fila.mustChangePassword,
})

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
