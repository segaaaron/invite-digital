'use server'

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { admin, events, identity, notifications } from '@/app/composition/container'
import type { Actor } from '@/modules/identity'
import { requireAdmin, requireSession, SESSION_COOKIE } from '@/app/_acciones/sesion'
import { campo } from '@/shared/forms/campo'
import { isErr } from '@/shared/result'

// ============================================================================
// Modo soporte: el admin entra **como el cliente** a su evento, sin conocer su contraseña, y regresa
// como admin. **Sin motivo** (pedido del usuario, 28 de septiembre): un clic, y cada entrada y salida
// queda en la auditoría («Entró como el cliente» · evento · cuenta). Sin límite de tiempo. Vive en la
// sesión del admin.
//
// **Las dos acciones devuelven adónde ir y navega el navegador** (`location.assign`), nunca `redirect()`:
// con `redirect` la página de destino se pinta **en la misma petición**, y `requireSession` (en `cache`
// de React) seguía devolviendo al actor de antes. Entrar daba 404 —el admin no abre los datos de una
// boda— y solo al volver atrás, ya en otra petición, se veía el panel del cliente.
// ============================================================================

export type SupportState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string; password?: string }

export type Navegar = { status: 'ok'; href: string } | { status: 'error'; message: string }

/** La sesión de la cookie: el modo soporte se abre y se cierra en ella, no en el actor. */
async function sesionActual(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null
  const sesion = await identity.authenticateSession(token)
  return isErr(sesion) ? null : sesion.value.sessionId
}

export async function enterAsClientAction(input: { eventId: string; clientUserId: string }): Promise<Navegar> {
  const actor = await requireAdmin()

  const evento = await events.getByIdUnscoped(input.eventId)
  if (isErr(evento)) return { status: 'error', message: 'Ese evento ya no existe.' }

  // Solo como **el anfitrión de ese evento**: el id llega del navegador y no se le cree.
  const clases = await events.staff.membershipsOf(evento.value.id, input.clientUserId)
  if (!clases.includes('cliente')) return { status: 'error', message: 'Esa persona no es anfitriona de este evento.' }
  const cliente = await identity.actorOf(input.clientUserId)
  if (cliente === null) return { status: 'error', message: 'Esa cuenta ya no existe.' }

  const sessionId = await sesionActual()
  if (sessionId === null) return { status: 'ok', href: '/panel/entrar' }

  await identity.support.open({ sessionId, adminUserId: actor.userId, adminEmail: actor.email, clientUserId: cliente.id, eventId: evento.value.id, reason: 'Entrada del admin' })
  await admin.record(actor, { action: 'soporte.entrada', subject: evento.value.slug, detail: `como ${cliente.email}` })
  return { status: 'ok', href: `/panel/eventos/${evento.value.slug}` }
}

export async function leaveSupportAction(): Promise<Navegar> {
  const actor = await requireSession()
  // Solo existe en modo soporte. Un cliente de verdad no llega aquí a nada: 404.
  if (actor.soporte === undefined) notFound()

  const sessionId = await sesionActual()
  if (sessionId !== null) await identity.support.close(sessionId, new Date())

  const elAdmin: Actor = { userId: actor.soporte.adminUserId, email: actor.soporte.adminEmail, role: 'admin', mustChangePassword: false }
  await admin.record(elAdmin, { action: 'soporte.salida', subject: null, detail: `como ${actor.email}` })
  return { status: 'ok', href: '/panel/admin/eventos' }
}

/**
 * «Restablecer acceso» del anfitrión de una boda: provisional nueva que debe cambiar, sus
 * sesiones cerradas, correo con la contraseña y registro. La pantalla la enseña **solo** si el
 * correo no salió, y una sola vez.
 */
export async function resetClientAccessAction(_previo: SupportState, fd: FormData): Promise<SupportState> {
  const actor = await requireAdmin()

  const evento = await events.getByIdUnscoped(campo(fd, 'eventId'))
  if (isErr(evento)) return { status: 'error', message: 'Ese evento ya no existe.' }
  const clientUserId = campo(fd, 'clientUserId')
  if (!(await events.staff.membershipsOf(evento.value.id, clientUserId)).includes('cliente')) {
    return { status: 'error', message: 'Esa persona no es anfitriona de esta boda.' }
  }

  const hecho = await identity.resetClientAccess(clientUserId)
  if (isErr(hecho)) {
    console.error('restablecer acceso rechazado', hecho.error.kind, hecho.error.detail)
    return { status: 'error', message: 'No se pudo restablecer ese acceso.' }
  }

  await admin.record(actor, { action: 'acceso.restablecido', subject: evento.value.slug, detail: hecho.value.email })

  let avisado = false
  try {
    avisado = await notifications.sendClientAccess({ to: hecho.value.email, password: hecho.value.password, eventTitle: evento.value.title })
  } catch (causa) {
    console.error('no se pudo mandar el acceso restablecido a %s:', hecho.value.email, causa)
  }

  return avisado
    ? { status: 'success', message: `Le mandamos a ${hecho.value.email} una contraseña provisional. La cambia al entrar.` }
    : { status: 'success', message: `El correo no salió. Pásale esta contraseña provisional a ${hecho.value.email}; no se vuelve a mostrar.`, password: hecho.value.password }
}
