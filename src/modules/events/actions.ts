'use server'

import { revalidatePath } from 'next/cache'
import { events as eventUseCases } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import { shareUrl } from './domain/client-share'
import type { EventErrorKind } from './domain/errors'

export type EventActionState = { status: 'idle' | 'error' | 'success'; message: EventErrorKind | '' }

const readForm = (formData: FormData) => ({
  slug: String(formData.get('slug') ?? ''),
  title: String(formData.get('title') ?? ''),
  eventDate: String(formData.get('eventDate') ?? ''),
  rsvpDeadline: String(formData.get('rsvpDeadline') ?? ''),
  locale: String(formData.get('locale') ?? 'es'),
  themeKey: String(formData.get('themeKey') ?? 'clasico'),
  status: String(formData.get('status') ?? 'draft'),
  retentionDays: Number(formData.get('retentionDays') ?? 90),
  currency: String(formData.get('currency') ?? 'BOB'),
})

// Cada acción empieza por requireSession: una Server Action es un extremo HTTP público,
// y que el formulario viva tras el inicio de sesión no la protege.
export async function createEventAction(_previous: EventActionState, formData: FormData): Promise<EventActionState> {
  await requireSession()

  const result = await eventUseCases.create(readForm(formData))
  if (isErr(result)) {
    console.error('alta de evento rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath('/panel')
  return { status: 'success', message: '' }
}

export async function updateEventAction(_previous: EventActionState, formData: FormData): Promise<EventActionState> {
  await requireSession()

  const result = await eventUseCases.update({ ...readForm(formData), id: String(formData.get('id') ?? '') })
  if (isErr(result)) {
    console.error('edición de evento rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath('/panel')
  revalidatePath(`/panel/eventos/${result.value.slug}`)
  return { status: 'success', message: '' }
}

export type ClientShareState =
  | { status: 'idle' }
  // Igual que el enlace del invitado: viaja al cliente una sola vez, porque en la base
  // solo queda el hash.
  | { status: 'success'; url: string; expiresAt: string }
  | { status: 'error' }

export async function createClientShareAction(_previous: ClientShareState, formData: FormData): Promise<ClientShareState> {
  await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  const result = await eventUseCases.createShare({ eventId: String(formData.get('eventId') ?? '') })

  if (isErr(result)) {
    console.error('alta de enlace de cliente rechazada', result.error.kind, result.error.detail)
    return { status: 'error' }
  }

  revalidatePath(`/panel/eventos/${eventSlug}`)
  return {
    status: 'success',
    url: shareUrl(result.value.token, env.SITE_URL),
    expiresAt: result.value.expiresAt.toISOString().slice(0, 10),
  }
}

export type RevokeShareState = { status: 'idle' } | { status: 'success' } | { status: 'error' }

/**
 * Devuelve estado, no `void`. Antes, si la revocación fallaba, el panel volvía a
 * pintarse igual y el enlace del cliente seguía vivo sin que nadie lo supiera.
 */
export async function revokeClientShareAction(
  _previous: RevokeShareState,
  formData: FormData,
): Promise<RevokeShareState> {
  await requireSession()

  const result = await eventUseCases.revokeShare(String(formData.get('shareId') ?? ''))
  if (isErr(result)) {
    console.error('revocación de enlace rechazada', result.error.kind, result.error.detail)
    return { status: 'error' }
  }

  revalidatePath(`/panel/eventos/${String(formData.get('eventSlug') ?? '')}`)
  return { status: 'success' }
}
