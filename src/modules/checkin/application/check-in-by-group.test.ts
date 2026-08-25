import { describe, expect, it } from 'vitest'
import { isOk } from '@/shared/result'
import { checkInByGroup } from './check-in-by-group'
import type { ArrivalRepository, DoorGroupReader } from './ports'

const groupRow = {
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  attending: 3,
  revoked: false,
  leadName: null,
  tableLabel: 'Mesa 03',
  tokenHash: Buffer.alloc(0),
}

const ajeno = { ...groupRow, id: 'g9', eventId: 'OTRO-EVENTO' }

const fakes = () => {
  const rows: Parameters<ArrivalRepository['insertIfAbsent']>[0][] = []
  const groups: DoorGroupReader = {
    async findByTokenHash() {
      return null
    },
    async findGroupById(id) {
      if (id === groupRow.id) return groupRow
      if (id === ajeno.id) return ajeno
      return null
    },
    async listByEvent() {
      return [groupRow]
    },
  }
  const arrivals: ArrivalRepository = {
    async insertIfAbsent(row) {
      if (rows.some((r) => r.scanId === row.scanId)) return false
      rows.push(row)
      return true
    },
    async listByEvent() {
      return rows
    },
    async findByScanId(scanId) {
      return rows.find((r) => r.scanId === scanId) ?? null
    },
    async adjust() {},
    async void() {},
  }
  return { groups, arrivals, rows }
}

const scan = (groupId: string, arrivedCount: number | null = null) => ({
  scanId: 's1',
  groupId,
  arrivedCount,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
})

describe('checkInByGroup', () => {
  it('registra por id de grupo, sin pasar por parsePass', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByGroup({ groups, arrivals })({ eventId: 'e1', scan: scan('g1') })
    expect(isOk(r) && r.value.kind).toBe('welcome')
    expect(rows).toHaveLength(1)
  })

  it('sin cantidad arranca en lo confirmado por el grupo', async () => {
    const { groups, arrivals } = fakes()
    const r = await checkInByGroup({ groups, arrivals })({ eventId: 'e1', scan: scan('g1') })
    expect(isOk(r) && r.value.kind === 'welcome' && r.value.arrivedCount).toBe(3)
  })

  it('no acepta un grupo de otro evento', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByGroup({ groups, arrivals })({ eventId: 'e1', scan: scan('g9') })
    expect(isOk(r) && r.value.kind).toBe('unknown')
    expect(rows).toHaveLength(0)
  })

  it('un grupo que no existe es unknown, nunca un error que confirme nada', async () => {
    const { groups, arrivals } = fakes()
    const r = await checkInByGroup({ groups, arrivals })({ eventId: 'e1', scan: scan('fantasma') })
    expect(isOk(r) && r.value.kind).toBe('unknown')
  })

  it('el segundo registro del mismo grupo sale como repetido', async () => {
    const { groups, arrivals } = fakes()
    const run = checkInByGroup({ groups, arrivals })
    await run({ eventId: 'e1', scan: scan('g1') })
    const r = await run({ eventId: 'e1', scan: { ...scan('g1'), scanId: 's2' } })
    expect(isOk(r) && r.value.kind).toBe('already')
  })

  it('admite algún acompañante de más sobre los cupos', async () => {
    // El caso real: la familia de cuatro llega con la abuela. Negarlo dejaría al
    // catering contando mal.
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByGroup({ groups, arrivals })({ eventId: 'e1', scan: scan('g1', 5) })
    expect(isOk(r) && r.value.kind).toBe('welcome')
    expect(rows).toHaveLength(1)
  })

  it('pero no una cifra disparatada: eso es un dedo torpe', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByGroup({ groups, arrivals })({ eventId: 'e1', scan: scan('g1', 400) })
    expect(isOk(r) && r.value.kind).toBe('unknown')
    expect(rows).toHaveLength(0)
  })
})
