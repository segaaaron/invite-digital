'use server'

import { revalidatePath } from 'next/cache'
import { guests } from '@/app/composition/container'
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
  const result = await guests.add({
    eventId: String(formData.get('eventId') ?? ''),
    label: String(formData.get('label') ?? ''),
    seats: Number(formData.get('seats') ?? 0),
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
