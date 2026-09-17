import type { Fiesta } from '@/modules/events'
import { extensionDeDocumento, leerDocumento } from '../domain/dia-d'
import { horaValida } from '../domain/cronograma'
import { leerProveedor, type ProveedorInput, TIPOS_DE_CORTEJO, type TipoDeCortejo } from '../domain/equipo-del-dia'
import { categoriasDe } from '../domain/presupuesto'
import type { DiaStore } from './dia-ports'
import type { PlannerResult } from './planner-use-cases'
import type { PlannerStore } from './ports'

type Deps = {
  dia: DiaStore
  store: PlannerStore
  minter: { hashOf(token: string): Buffer; mint(): { token: string; hash: Buffer } }
  /** Los ficheros de los documentos, fuera de `public/`. */
  archivos: { put(key: string, bytes: Uint8Array): Promise<void>; get(key: string): Promise<Uint8Array | null>; remove(key: string): Promise<void> }
  /** El tipo por los primeros bytes: PDF, JPEG, PNG o WEBP. Nunca por el nombre. */
  sniff: (bytes: Uint8Array) => 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | null
  ids: () => string
  clock: () => Date
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

type MomentoForm = { startsAt: string; durationMin: string; title: string; place: string; owner: string; vendorIds: readonly string[]; cue: string; notes: string; enInvitacion?: boolean; icono?: string }

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
      enInvitacion: input.enInvitacion === true,
      icono: opcional(input.icono ?? '', 40),
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

// ─── Día D y documentos ──────────────────────────────────────────────────────

export const setVendorArrived =
  ({ dia, clock }: Deps) =>
  async (eventId: string, id: string, llego: boolean): Promise<PlannerResult> =>
    (await dia.setVendorArrived(eventId, id, llego ? clock() : null)) ? { ok: true } : fallo(NO_ESTA)

const claveDe = (id: string, mime: string) => `${id}.${extensionDeDocumento(mime)}`

/**
 * Sube un documento privado. El tope se mira **antes** de leer el fichero a memoria, el tipo
 * lo deciden sus primeros bytes y el fichero se escribe **antes** que la fila: al revés, un
 * fallo de disco dejaría una fila apuntando a nada.
 */
export const saveDocument =
  ({ dia, store, archivos, sniff, ids }: Deps) =>
  async (
    eventId: string,
    input: { kind: string; topic: string; vendorId: string; budgetItemId: string },
    archivo: { name: string; size: number; bytes: () => Promise<Uint8Array> },
  ): Promise<PlannerResult> => {
    const leido = leerDocumento({ kind: input.kind, topic: input.topic, size: archivo.size })
    if (!leido.ok) return fallo(leido.mensaje)
    const bytes = await archivo.bytes()
    const mime = sniff(bytes)
    if (mime === null) return fallo('Ese archivo no vale: sube un PDF o una imagen (JPG, PNG, WEBP).')

    const vendorId = input.vendorId !== '' && (await dia.listVendors(eventId)).some((v) => v.id === input.vendorId) ? input.vendorId : null
    const budgetItemId = input.budgetItemId !== '' && (await store.listBudget(eventId)).some((p) => p.id === input.budgetItemId) ? input.budgetItemId : null

    const id = ids()
    await archivos.put(claveDe(id, mime), bytes)
    await dia.insertDocument(eventId, {
      id,
      kind: leido.kind,
      topic: leido.topic,
      originalName: archivo.name.trim().slice(0, 255) || 'documento',
      contentType: mime,
      byteSize: bytes.byteLength,
      vendorId,
      budgetItemId,
    })
    return { ok: true }
  }

/** El documento de **este** evento, con sus bytes. De otro evento no existe. */
export const readDocument =
  ({ dia, archivos }: Deps) =>
  async (eventId: string, id: string) => {
    const doc = (await dia.listDocuments(eventId)).find((d) => d.id === id)
    if (!doc) return null
    const bytes = await archivos.get(claveDe(doc.id, doc.contentType))
    return bytes === null ? null : { ...doc, bytes }
  }

/** Borra el fichero primero: si falla, la fila queda y se puede reintentar. */
export const removeDocument =
  ({ dia, archivos }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> => {
    const doc = (await dia.listDocuments(eventId)).find((d) => d.id === id)
    if (!doc) return fallo(NO_ESTA)
    await archivos.remove(claveDe(doc.id, doc.contentType))
    await dia.removeDocument(eventId, id)
    return { ok: true }
  }

/** La retención: todos los documentos del evento, del disco y de la base. */
export const purgeDocuments =
  (deps: Deps) =>
  async (eventId: string): Promise<number> => {
    const docs = await deps.dia.listDocuments(eventId)
    for (const doc of docs) await removeDocument(deps)(eventId, doc.id)
    return docs.length
  }
