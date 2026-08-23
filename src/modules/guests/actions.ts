'use server'

import { revalidatePath } from 'next/cache'
import { guests, plans } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import type { GuestErrorKind } from './domain/errors'
import { invitationUrl } from './domain/invitation-url'

export type AddGuestGroupState =
  | { status: 'idle' }
  // El enlace viaja al cliente una sola vez, justo tras crearlo: después ya no existe en
  // ninguna parte, porque en la base solo queda el hash.
  | { status: 'success'; label: string; url: string }
  | { status: 'error'; message: GuestErrorKind }

export async function addGuestGroupAction(_previous: AddGuestGroupState, formData: FormData): Promise<AddGuestGroupState> {
  await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  const eventId = String(formData.get('eventId') ?? '')

  // La acción vive en la frontera y puede hablar con el contenedor, así que es ella
  // quien resuelve la capacidad y se la pasa al caso de uso. `guests` no importa
  // `plans`: el límite es una regla comercial que va a cambiar y no puede quedar atada
  // al alta de un grupo.
  //
  // Y se comprueba **aquí, en el servidor**. El formulario deshabilitado que verá el
  // atelier no protege de nada: una Server Action es un extremo HTTP público.
  const allowance = await plans.allowanceFor(eventId)
  if (isErr(allowance)) {
    console.error('no se pudo resolver el plan del evento', allowance.error.kind, allowance.error.detail)
    return { status: 'error', message: 'storage_failure' }
  }

  const existentes = await guests.list(eventId)
  if (isErr(existentes)) {
    console.error('no se pudieron contar los grupos', existentes.error.kind, existentes.error.detail)
    return { status: 'error', message: 'storage_failure' }
  }

  const result = await guests.add({
    eventId,
    label: String(formData.get('label') ?? ''),
    seats: Number(formData.get('seats') ?? 0),
    allowance: { maxGuestGroups: allowance.value.maxGuestGroups },
    currentGroups: existentes.value.length,
  })

  if (isErr(result)) {
    console.error('alta de grupo rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${eventSlug}`)
  return { status: 'success', label: result.value.group.label, url: invitationUrl(result.value.token, env.SITE_URL) }
}

export type RevokeInvitationState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: GuestErrorKind }

/**
 * Devuelve estado, no `void`. Antes registraba el fallo en la consola del servidor y
 * respondía lo mismo tanto si había revocado como si no: el atelier se quedaba creyendo
 * que había cortado el acceso a alguien cuando no lo había cortado.
 *
 * El detalle no cruza —puede llevar identificadores—; cruza la clase, y la pantalla la
 * traduce.
 */
export async function revokeInvitationAction(
  _previous: RevokeInvitationState,
  formData: FormData,
): Promise<RevokeInvitationState> {
  await requireSession()

  const result = await guests.revoke(String(formData.get('groupId') ?? ''))
  if (isErr(result)) {
    console.error('revocación rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${String(formData.get('eventSlug') ?? '')}`)
  return { status: 'success' }
}

// ============================================================================
// PERSONAS DEL GRUPO — todas del panel, todas con sesión.
//
// El invitado no toca estas: su enlace confirma cupos, no edita la lista de nombres.
// ============================================================================

export type PersonActionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

/**
 * Devuelven estado, no `void`. El tope del cupo se rechaza en el servidor y quien lo
 * intenta tiene que enterarse: si el fallo solo fuera a `console.error`, el atelier
 * creería que cargó a un invitado que la base no tiene, y esa persona aparecería el día
 * del evento sin estar en ninguna lista.
 */
export async function addPersonAction(_previous: PersonActionState, formData: FormData): Promise<PersonActionState> {
  await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  const result = await guests.addPerson({
    guestGroupId: String(formData.get('guestGroupId') ?? ''),
    fullName: String(formData.get('fullName') ?? ''),
    isCompanion: formData.get('isCompanion') === 'on',
    dietaryNote: String(formData.get('dietaryNote') ?? ''),
    vip: formData.get('vip') === 'on',
  })

  if (isErr(result)) {
    console.error('alta de persona rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return { status: 'success' }
}

export async function updatePersonAction(input: {
  eventSlug: string
  id: string
  fullName?: string
  dietaryNote?: string | null
  vip?: boolean
  isCompanion?: boolean
  attending?: string | null
}): Promise<PersonActionState> {
  await requireSession()

  const { eventSlug, ...patch } = input
  const result = await guests.updatePerson(patch)

  if (isErr(result)) {
    console.error('edición de persona rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return { status: 'success' }
}

export async function removePersonAction(input: { eventSlug: string; id: string }): Promise<PersonActionState> {
  await requireSession()

  const result = await guests.removePerson(input.id)
  if (isErr(result)) {
    console.error('baja de persona rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}
