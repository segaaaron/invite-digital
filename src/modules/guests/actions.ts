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

/**
 * Marca el reparto de una invitación. Devuelve estado: si el servidor rechaza, el atelier
 * tiene que enterarse, porque la columna «Enviado» es la que usa para saber a quién le
 * falta el enlace.
 */
export async function markInvitationSentAction(input: {
  eventSlug: string
  id: string
  sent: boolean
}): Promise<PersonActionState> {
  await requireSession()

  const result = await guests.markSent({ id: input.id, sent: input.sent })
  if (isErr(result)) {
    console.error('marca de envío rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}

export type ResendState =
  | { status: 'idle' }
  // El enlace nuevo viaja una sola vez, igual que al crear el grupo.
  | { status: 'success'; label: string; url: string }
  | { status: 'error'; message: string }

/**
 * Vuelve a repartir la invitación de un grupo. **Rota el token**: el enlace anterior deja
 * de abrir nada, y quien lo tuviera —incluido el propio invitado— tendrá que usar el
 * nuevo. La pantalla lo avisa antes de que nadie pulse.
 */
export async function resendInvitationAction(_previous: ResendState, formData: FormData): Promise<ResendState> {
  await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  const result = await guests.resend({ id: String(formData.get('groupId') ?? '') })

  if (isErr(result)) {
    console.error('reenvío rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return { status: 'success', label: result.value.label, url: invitationUrl(result.value.token, env.SITE_URL) }
}

export type ImportState =
  | { status: 'idle' }
  | { status: 'success'; created: number; rejected: number; rows: readonly ImportRowView[] }
  | { status: 'error'; message: string }

export type ImportRowView = {
  line: number
  label: string
  seats: number
  url: string | null
  problem: string | null
}

/**
 * Importa un CSV de invitados y devuelve **la tabla entera**, fila por fila.
 *
 * Un «se importaron 37 de 50» obliga a comparar dos listas a mano para saber cuáles
 * faltan. Aquí cada fila dice si entró, con su enlace, o por qué no.
 */
export async function importGuestsAction(_previous: ImportState, formData: FormData): Promise<ImportState> {
  await requireSession()

  const eventId = String(formData.get('eventId') ?? '')
  const eventSlug = String(formData.get('eventSlug') ?? '')

  const capacidad = await plans.allowanceFor(eventId)
  const actuales = await guests.list(eventId)

  const result = await guests.importCsv({
    eventId,
    csv: String(formData.get('csv') ?? ''),
    allowance: { maxGuestGroups: isErr(capacidad) ? null : capacidad.value.maxGuestGroups },
    currentGroups: isErr(actuales) ? 0 : actuales.value.length,
  })

  if (isErr(result)) {
    console.error('importación rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return {
    status: 'success',
    created: result.value.created,
    rejected: result.value.rejected,
    rows: result.value.rows.map((fila) => ({
      line: fila.line,
      label: fila.label,
      seats: fila.seats,
      url: fila.token === null ? null : invitationUrl(fila.token, env.SITE_URL),
      problem: fila.problem,
    })),
  }
}

/** El teléfono del grupo, para abrir WhatsApp con el destinatario ya puesto. */
export async function setGroupPhoneAction(input: {
  eventSlug: string
  id: string
  phone: string
}): Promise<PersonActionState> {
  await requireSession()

  const limpio = input.phone.trim()
  try {
    await guests.setPhone(input.id, limpio === '' ? null : limpio)
  } catch (cause) {
    console.error('no se pudo guardar el teléfono', cause)
    return { status: 'error', message: 'No se pudo guardar el teléfono.' }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}
