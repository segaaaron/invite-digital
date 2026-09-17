'use server'

import { revalidatePath } from 'next/cache'
import { events, planner, plans } from '@/app/composition/container'
import { fiestaDeTema } from '@/modules/events'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import type { PlanFeature } from '@/modules/plans'
import { parseAmount } from '@/shared/money'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import type { PlannerResult } from '@/modules/planner/application/planner-use-cases'
import { campo } from '@/shared/forms/campo'

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
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte

  let precioCents: number | null = null
  if (campo(fd, 'price').trim() !== '') {
    const leido = parseAmount(campo(fd, 'price'))
    if (isErr(leido)) return { status: 'error', message: leido.error.detail, valores: valoresDe(fd) }
    precioCents = leido.value
  }
  const id = campo(fd, 'vendorId')
  const resultado = await planner.dia.saveVendor(
    eventId,
    await fiestaDe(actor, eventId),
    id === '' ? null : id,
    {
      service: campo(fd, 'service'),
      company: campo(fd, 'company'),
      contactName: campo(fd, 'contactName'),
      whatsapp: campo(fd, 'whatsapp'),
      email: campo(fd, 'email'),
      status: campo(fd, 'status'),
      arrivalTime: campo(fd, 'arrivalTime'),
      setupNotes: campo(fd, 'setupNotes'),
    },
    { precioCents, categoria: campo(fd, 'category') },
  )
  return responder(resultado, eventSlug, fd)
}

export async function setVendorStatusAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  return responder(await planner.dia.setVendorStatus(eventId, campo(fd, 'vendorId'), campo(fd, 'status')), eventSlug)
}

export async function removeVendorAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  return responder(await planner.dia.removeVendor(eventId, campo(fd, 'vendorId')), eventSlug)
}

/** El enlace de solo lectura del proveedor. Se enseña una vez: en la base queda su hash. */
export async function emitVendorLinkAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerTotal')
  if (corte) return corte
  const emitido = await planner.dia.emitVendorLink(eventId, campo(fd, 'vendorId'))
  if (!emitido.ok) return { status: 'error', message: emitido.mensaje }
  revalidatePath(`/panel/eventos/${eventSlug}/planner/proveedores`)
  return { status: 'success', enlace: `${env.SITE_URL.replace(/\/+$/, '')}/v/${emitido.token}` }
}

export async function revokeVendorLinkAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  return responder(await planner.dia.revokeVendorLink(eventId, campo(fd, 'vendorId')), eventSlug)
}

// ─── Cronograma ──────────────────────────────────────────────────────────────

export async function saveMomentAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  const id = campo(fd, 'momentId')
  const resultado = await planner.dia.saveMoment(eventId, id === '' ? null : id, {
    startsAt: campo(fd, 'startsAt'),
    durationMin: campo(fd, 'durationMin'),
    title: campo(fd, 'title'),
    place: campo(fd, 'place'),
    owner: campo(fd, 'owner'),
    vendorIds: fd.getAll('vendorIds').map(String),
    cue: campo(fd, 'cue'),
    notes: campo(fd, 'notes'),
    enInvitacion: campo(fd, 'enInvitacion') === 'on',
    icono: campo(fd, 'icono'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function removeMomentAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  return responder(await planner.dia.removeMoment(eventId, campo(fd, 'momentId')), eventSlug)
}

// ─── Cortejo y ensayos ───────────────────────────────────────────────────────

export async function saveCourtMemberAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  const id = campo(fd, 'memberId')
  const resultado = await planner.dia.saveCourtMember(eventId, await fiestaDe(actor, eventId), id === '' ? null : id, {
    kind: campo(fd, 'kind'),
    name: campo(fd, 'name'),
    whatsapp: campo(fd, 'whatsapp'),
    sponsors: campo(fd, 'sponsors'),
    size: campo(fd, 'size'),
    budgetItemId: campo(fd, 'budgetItemId'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function setCourtConfirmedAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  return responder(await planner.dia.setCourtConfirmed(eventId, campo(fd, 'memberId'), campo(fd, 'confirmed') === 'true'), eventSlug)
}

export async function removeCourtMemberAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  return responder(await planner.dia.removeCourtMember(eventId, campo(fd, 'memberId')), eventSlug)
}

export async function saveRehearsalAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  const resultado = await planner.dia.saveRehearsal(eventId, {
    date: campo(fd, 'date'),
    place: campo(fd, 'place'),
    notes: campo(fd, 'notes'),
    asistentes: fd.getAll('asistentes').map(String),
  })
  return responder(resultado, eventSlug, fd)
}

export async function removeRehearsalAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  return responder(await planner.dia.removeRehearsal(eventId, campo(fd, 'rehearsalId')), eventSlug)
}

// ─── Día D y documentos ──────────────────────────────────────────────────────

export async function setVendorArrivedAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const corte = await incluido(eventId, 'plannerTotal')
  if (corte) return corte
  return responder(await planner.dia.setVendorArrived(eventId, campo(fd, 'vendorId'), campo(fd, 'arrived') === 'true'), eventSlug)
}

export async function uploadDocumentAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  const corte = await incluido(eventId, 'plannerCompleto')
  if (corte) return corte
  const archivo = fd.get('file')
  if (!(archivo instanceof File) || archivo.size === 0) return { status: 'error', message: 'Elige un archivo.' }
  const resultado = await planner.dia.saveDocument(
    eventId,
    { kind: campo(fd, 'kind'), topic: campo(fd, 'topic'), vendorId: campo(fd, 'vendorId'), budgetItemId: campo(fd, 'budgetItemId') },
    { name: archivo.name, size: archivo.size, bytes: async () => new Uint8Array(await archivo.arrayBuffer()) },
  )
  return responder(resultado, eventSlug)
}

export async function removeDocumentAction(_previo: DiaActionState, fd: FormData): Promise<DiaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })
  return responder(await planner.dia.removeDocument(eventId, campo(fd, 'documentId')), eventSlug)
}
