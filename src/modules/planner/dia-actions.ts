'use server'

import { revalidatePath } from 'next/cache'
import { events, planner, plans } from '@/app/composition/container'
import { fiestaDeTema } from '@/modules/events'
import { requireEventAccess, requireSession } from '@/modules/identity/session-cookie'
import type { PlanFeature } from '@/modules/plans'
import { parseAmount } from '@/modules/registry'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import type { PlannerResult } from './application/planner-use-cases'

export type DiaActionState =
  | { status: 'idle' }
  | { status: 'success'; enlace?: string }
  | { status: 'error'; message: string; valores?: Record<string, string> }

// ============================================================================
// El día del evento. Todas empiezan por `requireSession()` y su guardia de sección:
// proveedores y cronograma son del anfitrión y su planner (`planner`); el cortejo, también
// del co-anfitrión (`cliente`). Y el plan se corta aquí, en el servidor: `plannerCompleto`
// para todo esto, `plannerTotal` para el enlace de proveedores.
// ============================================================================

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? '')
const valoresDe = (fd: FormData): Record<string, string> =>
  Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string') as [string, string][])

const NO_INCLUIDO: Record<'plannerCompleto' | 'plannerTotal', string> = {
  plannerCompleto: 'Tu plan no incluye proveedores, cronograma ni cortejo.',
  plannerTotal: 'Tu plan no incluye los enlaces para proveedores.',
}

async function incluido(eventId: string, feature: Extract<PlanFeature, 'plannerCompleto' | 'plannerTotal'>): Promise<DiaActionState | null> {
  return isErr(await plans.requireFeature(eventId, feature)) ? { status: 'error', message: NO_INCLUIDO[feature] } : null
}

async function fiestaDe(actor: Awaited<ReturnType<typeof requireSession>>, eventId: string) {
  const evento = await events.getByIdFor(actor, eventId, { section: 'cliente' })
  if (isErr(evento)) throw new Error(evento.error.detail)
  return fiestaDeTema(evento.value.themeKey)
}

function responder(resultado: PlannerResult, eventSlug: string, fd?: FormData): DiaActionState {
  if (!resultado.ok) return { status: 'error', message: resultado.mensaje, ...(fd ? { valores: valoresDe(fd) } : {}) }
  revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
  return { status: 'success' }
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

export async function saveVendorAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte

  let precioCents: number | null = null
  if (texto(fd, 'price').trim() !== '') {
    const leido = parseAmount(texto(fd, 'price'))
    if (isErr(leido)) return { status: 'error', message: leido.error.detail, valores: valoresDe(fd) }
    precioCents = leido.value
  }
  const id = texto(fd, 'vendorId')
  const resultado = await planner.dia.saveVendor(
    eventId,
    await fiestaDe(actor, eventId),
    id === '' ? null : id,
    {
      service: texto(fd, 'service'),
      company: texto(fd, 'company'),
      contactName: texto(fd, 'contactName'),
      whatsapp: texto(fd, 'whatsapp'),
      email: texto(fd, 'email'),
      status: texto(fd, 'status'),
      arrivalTime: texto(fd, 'arrivalTime'),
      setupNotes: texto(fd, 'setupNotes'),
    },
    { precioCents, categoria: texto(fd, 'category') },
  )
  return responder(resultado, eventSlug, fd)
}

export async function setVendorStatusAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  return responder(await planner.dia.setVendorStatus(eventId, texto(fd, 'vendorId'), texto(fd, 'status')), eventSlug)
}

export async function removeVendorAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  return responder(await planner.dia.removeVendor(eventId, texto(fd, 'vendorId')), eventSlug)
}

/** El enlace de solo lectura del proveedor. Se enseña una vez: en la base queda su hash. */
export async function emitVendorLinkAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerTotal')
  if (corte) return corte
  const emitido = await planner.dia.emitVendorLink(eventId, texto(fd, 'vendorId'))
  if (!emitido.ok) return { status: 'error', message: emitido.mensaje }
  revalidatePath(`/panel/eventos/${eventSlug}/planner/proveedores`)
  return { status: 'success', enlace: `${env.SITE_URL.replace(/\/+$/, '')}/v/${emitido.token}` }
}

export async function revokeVendorLinkAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  return responder(await planner.dia.revokeVendorLink(eventId, texto(fd, 'vendorId')), eventSlug)
}

// ─── Cronograma ──────────────────────────────────────────────────────────────

export async function seedMomentsAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  return responder(await planner.dia.seedMoments(eventId, await fiestaDe(actor, eventId)), eventSlug)
}

export async function saveMomentAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  const id = texto(fd, 'momentId')
  const resultado = await planner.dia.saveMoment(eventId, id === '' ? null : id, {
    startsAt: texto(fd, 'startsAt'),
    durationMin: texto(fd, 'durationMin'),
    title: texto(fd, 'title'),
    place: texto(fd, 'place'),
    owner: texto(fd, 'owner'),
    vendorIds: fd.getAll('vendorIds').map(String),
    cue: texto(fd, 'cue'),
    notes: texto(fd, 'notes'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function removeMomentAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  return responder(await planner.dia.removeMoment(eventId, texto(fd, 'momentId')), eventSlug)
}

// ─── Cortejo y ensayos ───────────────────────────────────────────────────────

export async function saveCourtMemberAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  const id = texto(fd, 'memberId')
  const resultado = await planner.dia.saveCourtMember(eventId, await fiestaDe(actor, eventId), id === '' ? null : id, {
    kind: texto(fd, 'kind'),
    name: texto(fd, 'name'),
    whatsapp: texto(fd, 'whatsapp'),
    sponsors: texto(fd, 'sponsors'),
    size: texto(fd, 'size'),
    budgetItemId: texto(fd, 'budgetItemId'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function setCourtConfirmedAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  return responder(await planner.dia.setCourtConfirmed(eventId, texto(fd, 'memberId'), texto(fd, 'confirmed') === 'true'), eventSlug)
}

export async function removeCourtMemberAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  return responder(await planner.dia.removeCourtMember(eventId, texto(fd, 'memberId')), eventSlug)
}

export async function saveRehearsalAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  const resultado = await planner.dia.saveRehearsal(eventId, {
    date: texto(fd, 'date'),
    place: texto(fd, 'place'),
    notes: texto(fd, 'notes'),
    asistentes: fd.getAll('asistentes').map(String),
  })
  return responder(resultado, eventSlug, fd)
}

export async function removeRehearsalAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = texto(fd, 'eventId')
  const eventSlug = texto(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  return responder(await planner.dia.removeRehearsal(eventId, texto(fd, 'rehearsalId')), eventSlug)
}
