import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { Momento } from '../domain/cronograma'
import type { MiembroDelCortejo, Proveedor } from '../domain/equipo-del-dia'
import type { Partida } from '../domain/presupuesto'
import type { DiaStore } from './dia-ports'
import { emitirEnlaceDeProveedor, fechaDeEnsayo, saveCourtMember, saveMoment, saveRehearsal, saveVendor, seedMoments, verComoProveedor } from './dia-use-cases'
import type { PlannerStore } from './ports'

function memoria() {
  const vendors: Array<Proveedor & { eventId: string; hash: Buffer | null }> = []
  const momentos: Array<Momento & { eventId: string }> = []
  const cortejo: Array<MiembroDelCortejo & { eventId: string }> = []
  const partidas: Array<Partida & { eventId: string }> = []
  const ensayos: Array<{ eventId: string; date: Date; asistentes: readonly string[] }> = []
  let n = 0
  const id = () => `id${++n}`
  const dia: DiaStore = {
    listVendors: async (e) => vendors.filter((v) => v.eventId === e),
    insertVendor: async (e, v) => {
      const nuevo = { ...v, id: id(), eventId: e, hash: null, conEnlace: false }
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
  return { deps: { dia, store, minter }, vendors, momentos, cortejo, partidas, ensayos }
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
      { id: 'm1', eventId: 'e1', startsAt: '20:00', durationMin: 10, title: 'Vals', place: null, owner: 'Ana', vendorIds: [vendors[0]!.id], cue: 'Tiempo de vals', notes: 'privado', sortOrder: 0 },
      { id: 'm2', eventId: 'e1', startsAt: '21:00', durationMin: 10, title: 'Torta', place: null, owner: null, vendorIds: [], cue: null, notes: null, sortOrder: 1 },
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
