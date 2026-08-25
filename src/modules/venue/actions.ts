'use server'

import { revalidatePath } from 'next/cache'
import { plans, venue } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'
import type { TableShape } from './domain/venue-table'
import type { ZoneKind } from './domain/venue-zone'
import type { ElementMove } from './application/move-element'

/**
 * Lo que la UI recibe de vuelta. Un fallo del salón no es excepcional —una etiqueta
 * repetida, un grupo que no cabe— y el atelier tiene que leerlo en el formulario, no en
 * una pantalla de error.
 */
export type VenueActionResult = { ok: true; message?: string } | { ok: false; kind: string; message: string }

const refresh = (slug: string) => revalidatePath(`/panel/eventos/${slug}/mesas`)

/**
 * El plano del salón solo lo traen algunos planes. La comprobación va **aquí**, en la
 * acción, y no en el dominio del salón: que las mesas vengan con un plan y no con otro
 * es una decisión comercial y no tiene nada que ver con las reglas de una mesa.
 *
 * Y va en el servidor, no en la pantalla. Ocultar la sección del panel no protege de
 * nada: una Server Action es un extremo HTTP público y quien conozca su nombre puede
 * llamarla sin pasar por ninguna página.
 */
const sinSalon = async (eventId: string): Promise<VenueActionResult | null> => {
  const permitido = await plans.requireFeature(eventId, 'seating')
  return isErr(permitido) ? { ok: false, kind: permitido.error.kind, message: permitido.error.detail } : null
}

export async function addTableAction(input: {
  eventId: string
  eventSlug: string
  label: string
  capacity: number
  shape: TableShape
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.addTable({
    eventId: input.eventId,
    label: input.label,
    capacity: input.capacity,
    shape: input.shape,
  })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  // Se dice cuál se creó y dónde mirarla: sin aviso, quien pulsa «Añadir mesa» no sabe
  // si pasó algo hasta que encuentra el círculo nuevo en el plano.
  return { ok: true, message: `«${result.value.label}» creada. Ya está en el plano; arrástrala a su sitio.` }
}

export async function updateTableAction(input: {
  id: string
  eventId: string
  eventSlug: string
  label: string
  capacity: number
  shape: TableShape
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.updateTable(input)
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return { ok: true }
}

export async function removeTableAction(input: {
  id: string
  eventId: string
  eventSlug: string
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.removeTable({ id: input.id, eventId: input.eventId })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return {
    ok: true,
    message:
      result.value.orphaned === 0
        ? 'Mesa eliminada.'
        : `Mesa eliminada. ${result.value.orphaned} grupo${result.value.orphaned === 1 ? '' : 's'} quedó sin mesa.`,
  }
}

export async function assignGroupAction(input: {
  eventId: string
  eventSlug: string
  groupId: string
  tableId: string
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.assign({ eventId: input.eventId, groupId: input.groupId, tableId: input.tableId })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return { ok: true }
}

export async function unassignGroupAction(input: {
  eventId: string
  eventSlug: string
  groupId: string
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.unassign({ eventId: input.eventId, groupId: input.groupId })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return { ok: true }
}

export async function autoAssignAction(input: { eventId: string; eventSlug: string }): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.autoAssign({ eventId: input.eventId })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  const { assigned, unplaced } = result.value
  return {
    ok: true,
    message:
      unplaced.length === 0
        ? `${assigned} grupo${assigned === 1 ? '' : 's'} repartido${assigned === 1 ? '' : 's'}.`
        : `${assigned} repartido${assigned === 1 ? '' : 's'}. Sin sitio: ${unplaced.map((g) => g.label).join(', ')}.`,
  }
}

export async function addZoneAction(input: {
  eventId: string
  eventSlug: string
  kind: ZoneKind
  label: string
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.addZone({
    eventId: input.eventId,
    kind: input.kind,
    label: input.label,
    x: 40,
    y: 40,
    w: 20,
    h: 15,
  })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return { ok: true }
}

/**
 * Renombrar o recolocar una zona. El sitio y el tamaño viajan tal cual desde el plano:
 * el caso de uso rehace la zona entera, y no mandarlos la devolvería al centro. Cada
 * corrección de un nombre descolocaría el salón.
 */
export async function updateZoneAction(input: {
  id: string
  eventId: string
  eventSlug: string
  kind: ZoneKind
  label: string
  x: number
  y: number
  w: number
  h: number
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.updateZone(input)
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return { ok: true }
}

export async function removeZoneAction(input: {
  id: string
  eventId: string
  eventSlug: string
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.removeZone({ id: input.id, eventId: input.eventId })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return { ok: true }
}

/**
 * Un solo viaje con todas las posiciones cambiadas. El plano no guarda al arrastrar ni
 * al soltar: acumula y manda el lote cuando el atelier pulsa «Guardar». Una llamada por
 * mesa movida serían decenas de viajes por cada recolocación del salón.
 */
export async function moveElementsAction(input: {
  eventId: string
  eventSlug: string
  moves: ElementMove[]
}): Promise<VenueActionResult> {
  await requireSession()

  const cerrado = await sinSalon(input.eventId)
  if (cerrado) return cerrado

  const result = await venue.moveElements({ eventId: input.eventId, moves: input.moves })
  if (isErr(result)) return { ok: false, kind: result.error.kind, message: result.error.detail }

  refresh(input.eventSlug)
  return { ok: true }
}
