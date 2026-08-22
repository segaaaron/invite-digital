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

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  await requireSession()

  const result = await guests.revoke(String(formData.get('groupId') ?? ''))
  if (isErr(result)) console.error('revocación rechazada', result.error.kind, result.error.detail)

  revalidatePath(`/panel/eventos/${String(formData.get('eventSlug') ?? '')}`)
}
