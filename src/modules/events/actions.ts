'use server'

import { revalidatePath } from 'next/cache'
import { events as eventUseCases } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'
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
