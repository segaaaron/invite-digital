import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { Momento } from '../domain/cronograma'
import type { MiembroDelCortejo, Proveedor } from '../domain/equipo-del-dia'
import type { Partida } from '../domain/presupuesto'
import type { DiaStore, Documento } from './dia-ports'
import { emitirEnlaceDeProveedor, purgeDocuments, readDocument, saveDocument, setVendorArrived, fechaDeEnsayo, saveCourtMember, saveMoment, saveRehearsal, saveVendor, seedMoments, verComoProveedor } from './dia-use-cases'
import type { PlannerStore } from './ports'

function memoria() {
  const vendors: Array<Proveedor & { eventId: string; hash: Buffer | null }> = []
  const momentos: Array<Momento & { eventId: string }> = []
  const cortejo: Array<MiembroDelCortejo & { eventId: string }> = []
  const partidas: Array<Partida & { eventId: string }> = []
  const ensayos: Array<{ eventId: string; date: Date; asistentes: readonly string[] }> = []
  const documentos: Array<Documento & { eventId: string }> = []
  const disco = new Map<string, Uint8Array>()
  let n = 0
  const id = () => `id${++n}`
  const dia: DiaStore = {
    listVendors: async (e) => vendors.filter((v) => v.eventId === e),
    insertVendor: async (e, v) => {
      const nuevo = { ...v, id: id(), eventId: e, hash: null, conEnlace: false, arrivedAt: null }
      vendors.push(nuevo)
      return nuevo.id
    },
    updateVendor: async (e, i, patch) => {
      const v = vendors.find((x) => x.id === i && x.eventId === e)
      if (!v) return false
      Object.assign(v, patch)
      return true
    },
    removeVendor: async () => true,
    setVendorToken: async (e, i, hash) => {
      const v = vendors.find((x) => x.id === i && x.eventId === e)
      if (!v) return false
      v.hash = hash
      return true
    },
    findVendorByTokenHash: async (hash) => {
      const v = vendors.find((x) => x.hash?.equals(hash))
      return v ? { vendor: v, eventId: v.eventId } : null
    },
    listMoments: async (e) => momentos.filter((m) => m.eventId === e),
    insertMoments: async (e, ms) => {
      for (const m of ms) momentos.push({ ...m, id: id(), eventId: e })
    },
    updateMoment: async () => true,
    removeMoment: async () => true,
    listCourt: async (e) => cortejo.filter((c) => c.eventId === e),
    insertCourtMember: async (e, m) => {
      cortejo.push({ ...m, id: id(), eventId: e })
    },
    updateCourtMember: async () => true,
    removeCourtMember: async () => true,
    listRehearsals: async () => [],
    insertRehearsal: async (e, r) => {
      ensayos.push({ eventId: e, date: r.date, asistentes: r.asistentes })
    },
    removeRehearsal: async () => true,
    setVendorArrived: async (e, i, at) => {
      const v = vendors.find((x) => x.id === i && x.eventId === e)
      if (!v) return false
      Object.assign(v, { arrivedAt: at })
      return true
    },
    listDocuments: async (e) => documentos.filter((d) => d.eventId === e),
    insertDocument: async (e, d) => {
      documentos.push({ ...d, eventId: e, createdAt: new Date() })
    },
    removeDocument: async (e, i) => {
      const k = documentos.findIndex((d) => d.id === i && d.eventId === e)
      if (k < 0) return false
      documentos.splice(k, 1)
      return true
    },
  }
  const store = {
    listBudget: async (e: string) => partidas.filter((p) => p.eventId === e),
    insertItem: async (e: string, item: Omit<Partida, 'id' | 'pagos'>) => {
      const nueva = { ...item, id: id(), eventId: e, pagos: [] }
      partidas.push(nueva)
      return nueva.id
    },
    updateItem: async (e: string, i: string, item: Omit<Partida, 'id' | 'pagos'>) => {
      const p = partidas.find((x) => x.id === i && x.eventId === e)
      if (!p) return false
      Object.assign(p, item)
      return true
    },
  } as unknown as PlannerStore
  const minter = { hashOf: (t: string) => createHash('sha256').update(t).digest(), mint: () => ({ token: 'token-del-dj', hash: createHash('sha256').update('token-del-dj').digest() }) }
  const archivos = {
    put: async (k: string, b: Uint8Array) => {
      disco.set(k, b)
    },
    get: async (k: string) => disco.get(k) ?? null,
    remove: async (k: string) => {
      disco.delete(k)
    },
  }
  const sniff = (b: Uint8Array) => (b[0] === 0x25 ? ('application/pdf' as const) : null)
  return { deps: { dia, store, minter, archivos, sniff, ids: id, clock: () => new Date('2027-05-15T23:00:00Z') }, vendors, momentos, cortejo, partidas, ensayos, documentos, disco }
}

const proveedor = { service: 'DJ', company: 'Beat', contactName: '', whatsapp: '', email: '', status: 'contratado', arrivalTime: '17:30', setupNotes: '' }

describe('proveedores', () => {
  it('con precio, su dinero nace como partida del presupuesto; al editar el precio, la partida cambia', async () => {
    const { deps, vendors, partidas } = memoria()
    expect(await saveVendor(deps)('e1', 'xv', null, proveedor, { precioCents: 3_500_00, categoria: 'dj' })).toEqual({ ok: true })
    expect(partidas).toHaveLength(1)
    expect(partidas[0]).toMatchObject({ concept: 'DJ · Beat', category: 'dj', contractedCents: 3_500_00, estimatedCents: 3_500_00 })
    expect(vendors[0]?.budgetItemId).toBe(partidas[0]?.id)

    await saveVendor(deps)('e1', 'xv', vendors[0]!.id, proveedor, { precioCents: 4_000_00, categoria: 'dj' })
    expect(partidas).toHaveLength(1)
    expect(partidas[0]?.contractedCents).toBe(4_000_00)
  })

  it('una categoría de otra fiesta cae a «otros»', async () => {
    const { deps, partidas } = memoria()
    await saveVendor(deps)('e1', 'boda', null, proveedor, { precioCents: 1, categoria: 'chambelanes' })
    expect(partidas[0]?.category).toBe('otros')
  })

  it('el enlace se entrega una vez y enseña solo los momentos de ese proveedor', async () => {
    const { deps, momentos } = memoria()
    await saveVendor(deps)('e1', 'xv', null, proveedor, { precioCents: null, categoria: '' })
    const { vendors } = { vendors: await deps.dia.listVendors('e1') }
    momentos.push(
      { id: 'm1', eventId: 'e1', startsAt: '20:00', durationMin: 10, title: 'Vals', place: null, owner: 'Ana', vendorIds: [vendors[0]!.id], cue: 'Tiempo de vals', notes: 'privado', sortOrder: 0, enInvitacion: false, icono: null },
      { id: 'm2', eventId: 'e1', startsAt: '21:00', durationMin: 10, title: 'Torta', place: null, owner: null, vendorIds: [], cue: null, notes: null, sortOrder: 1, enInvitacion: false, icono: null },
    )
    const enlace = await emitirEnlaceDeProveedor(deps)('e1', vendors[0]!.id)
    expect(enlace).toEqual({ ok: true, token: 'token-del-dj' })

    const vista = await verComoProveedor(deps)('token-del-dj')
    expect(vista?.momentos.map((m) => m.title)).toEqual(['Vals'])
    expect(vista?.momentos[0]).not.toHaveProperty('notes')
    expect(await verComoProveedor(deps)('otro-token')).toBeNull()
  })
})

describe('cronograma', () => {
  it('sembrar trae la plantilla de su fiesta una sola vez', async () => {
    const { deps, momentos } = memoria()
    await seedMoments(deps)('e1', 'xv')
    const cuantos = momentos.length
    await seedMoments(deps)('e1', 'xv')
    expect(momentos).toHaveLength(cuantos)
    expect(momentos.some((m) => m.title === 'Cambio de zapatillas')).toBe(true)
  })

  it('valida hora y duración, y solo acepta proveedores de este evento', async () => {
    const { deps, momentos } = memoria()
    const base = { startsAt: '20:00', durationMin: '15', title: 'Brindis', place: '', owner: '', vendorIds: [] as string[], cue: '', notes: '' }
    expect(await saveMoment(deps)('e1', null, { ...base, startsAt: '8pm' })).toMatchObject({ ok: false })
    expect(await saveMoment(deps)('e1', null, { ...base, durationMin: '0' })).toMatchObject({ ok: false })
    await saveMoment(deps)('e1', null, { ...base, vendorIds: ['ajeno'] })
    expect(momentos[0]?.vendorIds).toEqual([])
  })
})

describe('cortejo y ensayos', () => {
  it('un chambelán no entra en una boda', async () => {
    const { deps } = memoria()
    const miembro = { kind: 'chambelan', name: 'Diego', whatsapp: '', sponsors: '', size: '', budgetItemId: '' }
    expect(await saveCourtMember(deps)('e1', 'boda', null, miembro)).toMatchObject({ ok: false })
    expect(await saveCourtMember(deps)('e1', 'xv', null, miembro)).toEqual({ ok: true })
  })

  it('la fecha del ensayo se lee en hora de Bolivia', () => {
    expect(fechaDeEnsayo('2027-04-01T19:00')?.toISOString()).toBe('2027-04-01T23:00:00.000Z')
    expect(fechaDeEnsayo('ayer')).toBeNull()
  })

  it('un ensayo sin fecha no se guarda', async () => {
    const { deps, ensayos } = memoria()
    expect(await saveRehearsal(deps)('e1', { date: '', place: '', notes: '', asistentes: [] })).toMatchObject({ ok: false })
    expect(ensayos).toHaveLength(0)
  })
})

describe('documentos', () => {
  const PDF = new TextEncoder().encode('%PDF-1.7 contrato')
  const archivo = (bytes: Uint8Array, size = bytes.length) => ({ name: 'contrato.pdf', size, bytes: async () => bytes })

  it('guarda el fichero con nombre de identificador y la fila después', async () => {
    const { deps, documentos, disco } = memoria()
    expect(await saveDocument(deps)('e1', { kind: 'contrato', topic: '', vendorId: '', budgetItemId: '' }, archivo(PDF))).toEqual({ ok: true })
    expect(documentos[0]).toMatchObject({ kind: 'contrato', contentType: 'application/pdf', originalName: 'contrato.pdf' })
    expect([...disco.keys()]).toEqual([`${documentos[0]!.id}.pdf`])
  })

  it('lo que no es PDF ni imagen por sus bytes no entra, aunque se llame .pdf', async () => {
    const { deps, documentos } = memoria()
    expect(await saveDocument(deps)('e1', { kind: 'contrato', topic: '', vendorId: '', budgetItemId: '' }, archivo(new TextEncoder().encode('<?php')))).toMatchObject({ ok: false })
    expect(documentos).toHaveLength(0)
  })

  it('no lee el fichero si pesa de más, y un proveedor ajeno no se enlaza', async () => {
    const { deps, documentos } = memoria()
    const bytes = vi.fn(async () => PDF)
    expect(await saveDocument(deps)('e1', { kind: 'contrato', topic: '', vendorId: '', budgetItemId: '' }, { name: 'x.pdf', size: 50 * 1024 * 1024, bytes })).toMatchObject({ ok: false })
    expect(bytes).not.toHaveBeenCalled()
    await saveDocument(deps)('e1', { kind: 'factura', topic: '', vendorId: 'ajeno', budgetItemId: '' }, archivo(PDF))
    expect(documentos[0]?.vendorId).toBeNull()
  })

  it('leer un documento de otro evento no devuelve nada; purgar borra ficheros y filas', async () => {
    const { deps, documentos, disco } = memoria()
    await saveDocument(deps)('e1', { kind: 'contrato', topic: '', vendorId: '', budgetItemId: '' }, archivo(PDF))
    const id = documentos[0]!.id
    expect(await readDocument(deps)('e2', id)).toBeNull()
    expect(await readDocument(deps)('e1', id)).toMatchObject({ contentType: 'application/pdf' })
    expect(await purgeDocuments(deps)('e1')).toBe(1)
    expect(documentos).toHaveLength(0)
    expect(disco.size).toBe(0)
  })

  it('el Día D marca la llegada de un proveedor', async () => {
    const { deps, vendors } = memoria()
    await saveVendor(deps)('e1', 'boda', null, proveedor, { precioCents: null, categoria: '' })
    expect(await setVendorArrived(deps)('e1', vendors[0]!.id, true)).toEqual({ ok: true })
    expect(vendors[0]?.arrivedAt).toBeInstanceOf(Date)
  })
})

