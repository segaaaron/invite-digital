import type { Fiesta } from '@/modules/events'
import { horaValida, plantillaDeCronograma } from '../domain/cronograma'
import { leerProveedor, type ProveedorInput, TIPOS_DE_CORTEJO, type TipoDeCortejo } from '../domain/equipo-del-dia'
import { categoriasDe } from '../domain/presupuesto'
import type { DiaStore } from './dia-ports'
import type { PlannerResult } from './planner-use-cases'
import type { PlannerStore } from './ports'

type Deps = {
  dia: DiaStore
  store: PlannerStore
  minter: { hashOf(token: string): Buffer; mint(): { token: string; hash: Buffer } }
}

const fallo = (mensaje: string): PlannerResult => ({ ok: false, mensaje })
const NO_ESTA = 'Ya no está. Recarga la página.'
const opcional = (v: string, max: number) => v.trim().slice(0, max) || null

// ─── Proveedores ─────────────────────────────────────────────────────────────

/**
 * Guarda un proveedor. **Su dinero vive en el presupuesto**: con precio, se crea su partida
 * —o se actualiza la que ya tiene— y se enlaza. Así el precio, los pagos y lo que falta
 * salen de un solo sitio, y el presupuesto no se descuadra con una segunda lista de pagos.
 */
export const saveVendor =
  ({ dia, store }: Deps) =>
  async (eventId: string, fiesta: Fiesta, id: string | null, input: ProveedorInput, dinero: { precioCents: number | null; categoria: string }): Promise<PlannerResult> => {
    const leido = leerProveedor(input)
    if (!leido.ok) return fallo(leido.mensaje)

    const actual = id === null ? null : ((await dia.listVendors(eventId)).find((v) => v.id === id) ?? null)
    if (id !== null && actual === null) return fallo(NO_ESTA)

    let budgetItemId = actual?.budgetItemId ?? null
    if (dinero.precioCents !== null) {
      const concept = [leido.valor.service, leido.valor.company].filter(Boolean).join(' · ').slice(0, 160)
      const partida = budgetItemId === null ? null : ((await store.listBudget(eventId)).find((p) => p.id === budgetItemId) ?? null)
      if (partida !== null) {
        await store.updateItem(eventId, partida.id, {
          category: partida.category,
          concept: partida.concept,
          estimatedCents: partida.estimatedCents,
          contractedCents: dinero.precioCents,
          payer: partida.payer,
          padrinoLabel: partida.padrinoLabel,
          notes: partida.notes,
        })
      } else {
        const category = categoriasDe(fiesta).some((c) => c.clave === dinero.categoria) ? dinero.categoria : 'otros'
        budgetItemId = await store.insertItem(eventId, {
          category,
          concept,
          estimatedCents: dinero.precioCents,
          contractedCents: dinero.precioCents,
          payer: 'anfitriones',
          padrinoLabel: null,
          notes: null,
        })
      }
    }

    if (id === null) {
      await dia.insertVendor(eventId, { ...leido.valor, budgetItemId })
      return { ok: true }
    }
    return (await dia.updateVendor(eventId, id, { ...leido.valor, budgetItemId })) ? { ok: true } : fallo(NO_ESTA)
  }

export const setVendorStatus =
  ({ dia }: Deps) =>
  async (eventId: string, id: string, status: string): Promise<PlannerResult> => {
    if (!['cotizando', 'reservado', 'contratado', 'confirmado'].includes(status)) return fallo('Elige el estado.')
    return (await dia.updateVendor(eventId, id, { status: status as 'cotizando' })) ? { ok: true } : fallo(NO_ESTA)
  }

export const removeVendor =
  ({ dia }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> =>
    (await dia.removeVendor(eventId, id)) ? { ok: true } : fallo(NO_ESTA)

/**
 * Emite el enlace de solo lectura del proveedor. Se devuelve **una vez**: en la base queda su
 * hash. Emitir otro invalida el anterior.
 */
export const emitirEnlaceDeProveedor =
  ({ dia, minter }: Deps) =>
  async (eventId: string, id: string): Promise<{ ok: true; token: string } | { ok: false; mensaje: string }> => {
    const { token, hash } = minter.mint()
    return (await dia.setVendorToken(eventId, id, hash)) ? { ok: true, token } : { ok: false, mensaje: NO_ESTA }
  }

export const quitarEnlaceDeProveedor =
  ({ dia }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> =>
    (await dia.setVendorToken(eventId, id, null)) ? { ok: true } : fallo(NO_ESTA)

/**
 * Lo que ve un proveedor con su enlace: su ficha y **sus** momentos del cronograma, sin
 * notas internas. Nada de invitados, dinero ni otros proveedores.
 */
export const verComoProveedor =
  ({ dia, minter }: Deps) =>
  async (token: string) => {
    const encontrado = await dia.findVendorByTokenHash(minter.hashOf(token))
    if (encontrado === null) return null
    const momentos = (await dia.listMoments(encontrado.eventId))
      .filter((m) => m.vendorIds.includes(encontrado.vendor.id))
      .map(({ id, startsAt, durationMin, title, place, owner, cue }) => ({ id, startsAt, durationMin, title, place, owner, cue }))
    return { eventId: encontrado.eventId, proveedor: encontrado.vendor, momentos }
  }

// ─── Cronograma ──────────────────────────────────────────────────────────────

export const seedMoments =
  ({ dia }: Deps) =>
  async (eventId: string, fiesta: Fiesta): Promise<PlannerResult> => {
    if ((await dia.listMoments(eventId)).length > 0) return { ok: true }
    await dia.insertMoments(
      eventId,
      plantillaDeCronograma(fiesta).map((m, i) => ({ ...m, place: null, owner: null, vendorIds: [], cue: null, notes: null, sortOrder: i })),
    )
    return { ok: true }
  }

type MomentoForm = { startsAt: string; durationMin: string; title: string; place: string; owner: string; vendorIds: readonly string[]; cue: string; notes: string }

export const saveMoment =
  ({ dia }: Deps) =>
  async (eventId: string, id: string | null, input: MomentoForm): Promise<PlannerResult> => {
    if (!horaValida(input.startsAt)) return fallo('La hora va como 20:30.')
    const duracion = Number(input.durationMin)
    if (!Number.isInteger(duracion) || duracion < 1 || duracion > 600) return fallo('La duración va en minutos, de 1 a 600.')
    const title = input.title.trim()
    if (title.length === 0 || title.length > 160) return fallo('Di qué pasa en ese momento.')
    // Solo proveedores de este evento: un id ajeno no se cuela en el cronograma.
    const propios = new Set((await dia.listVendors(eventId)).map((v) => v.id))
    const momento = {
      startsAt: input.startsAt,
      durationMin: duracion,
      title,
      place: opcional(input.place, 120),
      owner: opcional(input.owner, 120),
      vendorIds: input.vendorIds.filter((v) => propios.has(v)),
      cue: opcional(input.cue, 200),
      notes: opcional(input.notes, 2000),
    }
    if (id === null) {
      const sortOrder = (await dia.listMoments(eventId)).reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1
      await dia.insertMoments(eventId, [{ ...momento, sortOrder }])
      return { ok: true }
    }
    return (await dia.updateMoment(eventId, id, momento)) ? { ok: true } : fallo(NO_ESTA)
  }

export const removeMoment =
  ({ dia }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> =>
    (await dia.removeMoment(eventId, id)) ? { ok: true } : fallo(NO_ESTA)

// ─── Cortejo y ensayos ───────────────────────────────────────────────────────

type MiembroForm = { kind: string; name: string; whatsapp: string; sponsors: string; size: string; budgetItemId: string }

export const saveCourtMember =
  ({ dia, store }: Deps) =>
  async (eventId: string, fiesta: Fiesta, id: string | null, input: MiembroForm): Promise<PlannerResult> => {
    if (!TIPOS_DE_CORTEJO[fiesta].includes(input.kind as TipoDeCortejo)) return fallo('Elige un papel del cortejo de esta fiesta.')
    const name = input.name.trim()
    if (name.length === 0 || name.length > 120) return fallo('Escribe su nombre.')
    // Lo que apadrina enlaza con su partida, y solo con una de este evento.
    const partida = input.budgetItemId === '' ? null : ((await store.listBudget(eventId)).find((p) => p.id === input.budgetItemId)?.id ?? null)
    const miembro = {
      kind: input.kind as TipoDeCortejo,
      name,
      whatsapp: input.whatsapp.replace(/[^\d+]/g, '').slice(0, 20) || null,
      sponsors: opcional(input.sponsors, 200),
      size: opcional(input.size, 20),
      budgetItemId: partida,
    }
    if (id === null) {
      await dia.insertCourtMember(eventId, { ...miembro, confirmed: false })
      return { ok: true }
    }
    return (await dia.updateCourtMember(eventId, id, miembro)) ? { ok: true } : fallo(NO_ESTA)
  }

export const setCourtConfirmed =
  ({ dia }: Deps) =>
  async (eventId: string, id: string, confirmed: boolean): Promise<PlannerResult> =>
    (await dia.updateCourtMember(eventId, id, { confirmed })) ? { ok: true } : fallo(NO_ESTA)

export const removeCourtMember =
  ({ dia }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> =>
    (await dia.removeCourtMember(eventId, id)) ? { ok: true } : fallo(NO_ESTA)

/** `YYYY-MM-DDTHH:MM` de un `datetime-local`, leído en hora de Bolivia (UTC−4, sin horario de verano). */
export function fechaDeEnsayo(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null
  const fecha = new Date(`${valor}:00-04:00`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export const saveRehearsal =
  ({ dia }: Deps) =>
  async (eventId: string, input: { date: string; place: string; notes: string; asistentes: readonly string[] }): Promise<PlannerResult> => {
    const date = fechaDeEnsayo(input.date)
    if (date === null) return fallo('Elige fecha y hora del ensayo.')
    await dia.insertRehearsal(eventId, { date, place: opcional(input.place, 120), notes: opcional(input.notes, 2000), asistentes: input.asistentes })
    return { ok: true }
  }

export const removeRehearsal =
  ({ dia }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> =>
    (await dia.removeRehearsal(eventId, id)) ? { ok: true } : fallo(NO_ESTA)
