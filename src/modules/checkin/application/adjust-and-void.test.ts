import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { adjustArrival } from './adjust-arrival'
import { voidArrival } from './void-arrival'
import type { ArrivalRepository, ArrivalRow, DoorGroupReader, DoorGroupRow } from './ports'

const group: DoorGroupRow = {
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  attending: 4,
  revoked: false,
  tokenHash: Buffer.alloc(0),
}

const fakes = (initial: ArrivalRow[] = []) => {
  const rows = [...initial]
  const arrivals: ArrivalRepository = {
    async insertIfAbsent() {
      return true
    },
    async listByEvent() {
      return rows
    },
    async findByScanId(scanId) {
      return rows.find((r) => r.scanId === scanId) ?? null
    },
    async adjust(scanId, arrivedCount) {
      const i = rows.findIndex((r) => r.scanId === scanId)
      if (i >= 0) rows[i] = { ...rows[i]!, arrivedCount }
    },
    async void(scanId, at) {
      const i = rows.findIndex((r) => r.scanId === scanId)
      if (i >= 0) rows[i] = { ...rows[i]!, voidedAt: at }
    },
  }
  const groups: DoorGroupReader = {
    async findByTokenHash() {
      return group
    },
    async findGroupById(id) {
      return id === group.id ? group : null
    },
    async listByEvent() {
      return [group]
    },
  }
  return { arrivals, groups, rows }
}

const row: ArrivalRow = {
  scanId: 's1',
  guestGroupId: 'g1',
  arrivedCount: 4,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
  voidedAt: null,
}

describe('adjustArrival', () => {
  it('baja la cantidad cuando llegaron menos', async () => {
    const { arrivals, groups, rows } = fakes([row])
    const r = await adjustArrival({ arrivals, groups })({ scanId: 's1', arrivedCount: 2 })
    expect(isOk(r)).toBe(true)
    expect(rows[0]?.arrivedCount).toBe(2)
  })

  it('rechaza pasarse de los cupos del grupo', async () => {
    const { arrivals, groups, rows } = fakes([row])
    const r = await adjustArrival({ arrivals, groups })({ scanId: 's1', arrivedCount: 9 })
    expect(isErr(r) && r.error.kind).toBe('invalid_count')
    expect(rows[0]?.arrivedCount).toBe(4)
  })

  it('busca los cupos por el id del grupo de la llegada, no por el evento', async () => {
    const { arrivals, groups, rows } = fakes([row])
    const pedidos: string[] = []
    const espia: DoorGroupReader = {
      ...groups,
      findGroupById: async (id) => (pedidos.push(id), groups.findGroupById(id)),
    }
    await adjustArrival({ arrivals, groups: espia })({ scanId: 's1', arrivedCount: 3 })
    expect(pedidos).toEqual(['g1'])
    expect(rows[0]?.arrivedCount).toBe(3)
  })

  it('un escaneo que no existe da not_found', async () => {
    const { arrivals, groups } = fakes([])
    const r = await adjustArrival({ arrivals, groups })({ scanId: 'nope', arrivedCount: 2 })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

describe('voidArrival', () => {
  it('deshacer pone lápida, no borra', async () => {
    const { arrivals, rows } = fakes([row])
    const r = await voidArrival({ arrivals, clock: () => new Date('2026-10-18T22:00:00Z') })({ scanId: 's1' })
    expect(isOk(r)).toBe(true)
    expect(rows[0]?.voidedAt?.toISOString()).toBe('2026-10-18T22:00:00.000Z')
  })

  it('deshacer dos veces no falla', async () => {
    const { arrivals } = fakes([row])
    const run = voidArrival({ arrivals, clock: () => new Date() })
    await run({ scanId: 's1' })
    expect(isOk(await run({ scanId: 's1' }))).toBe(true)
  })

  it('un escaneo que no existe da not_found', async () => {
    const { arrivals } = fakes([])
    const r = await voidArrival({ arrivals, clock: () => new Date() })({ scanId: 'nope' })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})
