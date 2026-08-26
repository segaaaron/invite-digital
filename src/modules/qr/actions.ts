'use server'

import { revalidatePath } from 'next/cache'
import { qr } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'
import { QR_KINDS, type QrKind } from './domain/qr-code'

export type QrActionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

// ============================================================================
// Todas del panel: `requireSession()` y luego `requireEventAccess`, sin sección, así que
// heredan `full`. El personal de puerta no administra códigos.
// ============================================================================

const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

const refrescar = (eventSlug: string) => revalidatePath(`/panel/eventos/${eventSlug}/qr`)

export async function createQrCodeAction(_previous: QrActionState, formData: FormData): Promise<QrActionState> {
  const actor = await requireSession()

  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug })

  const kindRaw = texto(formData, 'kind')
  const kind: QrKind = (QR_KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as QrKind) : 'custom'

  const result = await qr.create({
    userId: actor.userId,
    eventId,
    label: texto(formData, 'label'),
    kind,
    target: texto(formData, 'target'),
  })

  if (isErr(result)) {
    console.error('alta de código QR rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar(eventSlug)
  return { status: 'success' }
}

export async function updateQrCodeAction(_previous: QrActionState, formData: FormData): Promise<QrActionState> {
  const actor = await requireSession()

  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug })

  const result = await qr.update({
    eventId,
    id: texto(formData, 'id'),
    label: texto(formData, 'label'),
    target: texto(formData, 'target'),
  })

  if (isErr(result)) {
    console.error('edición de código QR rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar(eventSlug)
  return { status: 'success' }
}

export async function toggleQrCodeAction(_previous: QrActionState, formData: FormData): Promise<QrActionState> {
  const actor = await requireSession()

  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug })

  const result = await qr.toggle({ eventId, id: texto(formData, 'id'), active: texto(formData, 'active') === 'true' })

  if (isErr(result)) {
    console.error('cambio de estado de código QR rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar(eventSlug)
  return { status: 'success' }
}
