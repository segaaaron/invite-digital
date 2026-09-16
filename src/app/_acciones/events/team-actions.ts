'use server'

import { revalidatePath } from 'next/cache'
import { admin, events, notifications, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import { campo } from '@/shared/forms/campo'

export type TeamActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string; password?: string }
  | { status: 'error'; message: string }

// ============================================================================
// El equipo del evento lo suma **el anfitrión** —sección `equipo`—: co-anfitriones y su
// planner contratado, con el tope de su plan. El dueño y el admin también pueden. Un
// co-anfitrión o una planner no suman a nadie: nadie da más permisos de los que tiene.
// Todo cambio queda en la auditoría.
// ============================================================================


export async function addTeamMemberAction(_previo: TeamActionState, fd: FormData): Promise<TeamActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'equipo' })

  // Ya no se suman co-anfitriones: la familia entra con la cuenta del cliente.
  if (campo(fd, 'kind') !== 'planner') return { status: 'error', message: 'Elige qué hará en el evento.' }
  const kind = 'planner'
  const capacidad = await plans.allowanceFor(eventId)
  if (isErr(capacidad)) return { status: 'error', message: 'No pudimos leer tu plan. Vuelve a intentarlo en un momento.' }

  const alta = await events.team.add({
    eventId,
    email: campo(fd, 'email'),
    kind,
    limite: capacidad.value.maxHiredPlanners,
  })
  if (!alta.ok) return { status: 'error', message: alta.mensaje }

  await admin.record(actor, { action: 'equipo.alta', subject: eventSlug, detail: `${kind} · ${alta.email}` })

  // El correo nunca tumba el alta: si no sale, la contraseña se enseña aquí una vez.
  let avisado = false
  try {
    const evento = await events.getByIdUnscoped(eventId)
    if (!isErr(evento)) avisado = await notifications.sendClientAccess({ to: alta.email, password: alta.password, eventTitle: evento.value.title })
  } catch (causa) {
    console.error('no se pudo avisar por correo a %s:', alta.email, causa)
  }

  revalidatePath(`/panel/eventos/${eventSlug}/equipo`)
  const quien = 'planner'
  if (alta.password === null) {
    return { status: 'success', message: `${alta.email} ya tenía cuenta: entra como ${quien} con su contraseña de siempre.${avisado ? ' Le avisamos por correo.' : ''}` }
  }
  return {
    status: 'success',
    message: avisado
      ? `${alta.email} entra como ${quien}. Le mandamos su contraseña provisional por correo; la cambia al entrar.`
      : `${alta.email} entra como ${quien} con esta contraseña provisional. No se vuelve a mostrar: pásasela y la cambia al entrar.`,
    ...(avisado ? {} : { password: alta.password }),
  }
}

export async function removeTeamMemberAction(_previo: TeamActionState, fd: FormData): Promise<TeamActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'equipo' })

  const baja = await events.team.remove(eventId, campo(fd, 'userId'))
  if (!baja.ok) return { status: 'error', message: baja.mensaje }

  await admin.record(actor, { action: 'equipo.baja', subject: eventSlug, detail: campo(fd, 'email') })
  revalidatePath(`/panel/eventos/${eventSlug}/equipo`)
  return { status: 'success', message: 'Quitado del equipo. Su cuenta sigue: puede estar en otro evento.' }
}
