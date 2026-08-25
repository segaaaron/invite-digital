import { describe, expect, it } from 'vitest'
import { isOk } from '@/shared/result'
import { getDoorManifest } from './get-door-manifest'
import { getDoorState } from './get-door-state'
import type { ArrivalRepository, ArrivalRow, DoorGroupReader, DoorGroupRow } from './ports'

const group: DoorGroupRow = {
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  attending: 3,
  revoked: false,
  tokenHash: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
  leadName: null,
  tableLabel: 'Mesa 03',
}

const arrival: ArrivalRow = {
  scanId: 's1',
  guestGroupId: 'g1',
  arrivedCount: 3,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
  voidedAt: null,
}

const fakes = (rows: ArrivalRow[] = []) => ({
  groups: {
    async findByTokenHash() {
      return group
    },
    async findGroupById() {
      return group
    },
    async listByEvent() {
      return [group]
    },
  } as DoorGroupReader,
  arrivals: {
    async insertIfAbsent() {
      return true
    },
    async listByEvent() {
      return rows
    },
    async findByScanId() {
      return null
    },
    async adjust() {},
    async void() {},
  } as ArrivalRepository,
})

describe('getDoorManifest', () => {
  it('el manifiesto trae la etiqueta de la mesa del grupo', async () => {
    const { groups, arrivals } = fakes()
    const r = await getDoorManifest({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.groups[0]?.tableLabel).toBe('Mesa 03')
  })

  it('un grupo sin mesa sigue apareciendo, con la mesa en nulo', async () => {
    const sinMesa = { ...group, tableLabel: null }
    const groups: DoorGroupReader = {
      async findByTokenHash() {
        return sinMesa
      },
      async findGroupById() {
        return sinMesa
      },
      async listByEvent() {
        return [sinMesa]
      },
    }
    const { arrivals } = fakes()
    const r = await getDoorManifest({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.groups).toHaveLength(1)
    expect(isOk(r) && r.value.groups[0]?.tableLabel).toBeNull()
  })

  it('entrega el hash en hexadecimal, nunca un token en claro', async () => {
    const { groups, arrivals } = fakes()
    const r = await getDoorManifest({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.groups[0]?.tokenHashHex).toBe('deadbeef')
  })

  it('el manifiesto no expone ningún campo llamado token', async () => {
    const { groups, arrivals } = fakes()
    const r = await getDoorManifest({ groups, arrivals })('e1')
    const json = JSON.stringify(isOk(r) ? r.value : {})
    expect(json).not.toContain('"token"')
    expect(json).not.toContain('tokenHash"')
  })

  it('incluye las llegadas ya resueltas para arrancar con el contador puesto', async () => {
    const { groups, arrivals } = fakes([arrival])
    const r = await getDoorManifest({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.arrivals[0]?.arrivedCount).toBe(3)
  })
})

describe('getDoorState', () => {
  it('devuelve el conteo con las llegadas aplicadas', async () => {
    const { groups, arrivals } = fakes([arrival])
    const r = await getDoorState({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.tally.arrivedGroups).toBe(1)
    expect(isOk(r) && r.value.tally.headsInside).toBe(3)
    expect(isOk(r) && r.value.tally.expectedHeads).toBe(3)
  })
})
