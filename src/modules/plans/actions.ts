'use server'

import { revalidatePath } from 'next/cache'
import { plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'
import type { PlansErrorKind } from './domain/errors'

export type PlanChangeState = { status: 'idle' } | { status: 'success'; planSlug: string } | { status: 'error'; kind: PlansErrorKind }

/**
 * Registra la solicitud de cambio. No cobra nada: el atelier la resuelve fuera del
 * sistema y luego la aplica desde la misma página.
 */
export async function requestPlanChangeAction(_previous: PlanChangeState, formData: FormData): Promise<PlanChangeState> {
  const actor = await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  await requireEventAccess(actor, { eventSlug })
  const nota = String(formData.get('note') ?? '').trim()

  const result = await plans.requestChange({
    eventId: String(formData.get('eventId') ?? ''),
    requestedPlanId: String(formData.get('planId') ?? ''),
    note: nota === '' ? null : nota,
  })

  if (isErr(result)) {
    console.error('solicitud de cambio de plan rechazada', result.error.kind, result.error.detail)
    return { status: 'error', kind: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/plan`)
  return { status: 'success', planSlug: result.value.requestedPlanSlug }
}

/**
 * Aplica la solicitud, ya cobrada fuera del sistema. Revalida también la página del
 * evento: los límites que se enseñan allí acaban de cambiar.
 */
/**
 * Resolver una solicitud devuelve estado, no `void`. Un cambio de plan que se cree
 * aplicado y no lo está es dinero cobrado por un cupo que el evento no tiene.
 */
export type PlanDecisionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; kind: PlansErrorKind }

export async function applyPlanChangeAction(
  _previous: PlanDecisionState,
  formData: FormData,
): Promise<PlanDecisionState> {
  const actor = await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  await requireEventAccess(actor, { eventSlug })
  const result = await plans.applyChange(String(formData.get('requestId') ?? ''))
  if (isErr(result)) {
    console.error('cambio de plan no aplicado', result.error.kind, result.error.detail)
    return { status: 'error', kind: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/plan`)
  revalidatePath(`/panel/eventos/${eventSlug}`)
  return { status: 'success' }
}

export async function rejectPlanChangeAction(
  _previous: PlanDecisionState,
  formData: FormData,
): Promise<PlanDecisionState> {
  const actor = await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  await requireEventAccess(actor, { eventSlug })
  const result = await plans.rejectChange(String(formData.get('requestId') ?? ''))
  if (isErr(result)) {
    console.error('solicitud no rechazada', result.error.kind, result.error.detail)
    return { status: 'error', kind: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/plan`)
  return { status: 'success' }
}
