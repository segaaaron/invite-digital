import { describe, expect, it } from 'vitest'
import { isOk } from '@/shared/result'
import { checkInByScan } from './check-in-by-scan'
import type { ArrivalRepository, DoorGroupReader } from './ports'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
const OTRO = 'ZzYyXxWwVvUuTtSsRrQqPp'

const minter = { mint: () => ({ token: '', hash: Buffer.alloc(0) }), hashOf: (t: string) => Buffer.from(`h:${t}`) }

const groupRow = {
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  attending: 4,
  revoked: false,
  tableLabel: 'Mesa 03',
  tokenHash: Buffer.from(`h:${TOKEN}`),
}

const fakes = () => {
  const rows: Parameters<ArrivalRepository['insertIfAbsent']>[0][] = []
  const groups: DoorGroupReader = {
    async findByTokenHash(hash) {
      if (hash.equals(Buffer.from(`h:${TOKEN}`))) return groupRow
      if (hash.equals(Buffer.from(`h:${OTRO}`))) return { ...groupRow, id: 'g9', eventId: 'OTRO-EVENTO' }
      return null
    },
    async findGroupById(id) {
      return id === groupRow.id ? groupRow : null
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

const scan = (scanId: string, scanned = TOKEN, arrivedCount = 4) => ({
  scanId,
  scanned,
  arrivedCount,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
})

describe('checkInByScan', () => {
  it('registra un pase válido y devuelve bienvenida', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({ eventId: 'e1', scans: [scan('s1')] })
    expect(isOk(r) && r.value[0]?.kind).toBe('welcome')
    expect(rows).toHaveLength(1)
  })

  it('el mismo escaneo reenviado no inserta dos veces', async () => {
    const { groups, arrivals, rows } = fakes()
    const run = checkInByScan({ groups, arrivals, minter })
    await run({ eventId: 'e1', scans: [scan('s1')] })
    const r = await run({ eventId: 'e1', scans: [scan('s1')] })
    expect(rows).toHaveLength(1)
    expect(isOk(r) && r.value[0]?.kind).toBe('already')
  })

  it('un segundo escaneo distinto del mismo grupo sale como repetido', async () => {
    const { groups, arrivals } = fakes()
    const run = checkInByScan({ groups, arrivals, minter })
    await run({ eventId: 'e1', scans: [scan('s1')] })
    const r = await run({ eventId: 'e1', scans: [scan('s2')] })
    expect(isOk(r) && r.value[0]?.kind).toBe('already')
  })

  it('el pase de otra boda de la misma plataforma no abre esta puerta', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({ eventId: 'e1', scans: [scan('s1', OTRO)] })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
    expect(rows).toHaveLength(0)
  })

  it('un token desconocido es unknown, nunca un error que confirme que existe', async () => {
    const { groups, arrivals } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({
      eventId: 'e1',
      scans: [scan('s1', 'QqQqQqQqQqQqQqQqQqQqQq')],
    })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
  })

  it('un QR de la calle es unknown sin llegar a consultar la base', async () => {
    const { groups, arrivals } = fakes()
    let consultas = 0
    const espia: DoorGroupReader = { ...groups, findByTokenHash: async (h) => (consultas++, groups.findByTokenHash(h)) }
    const r = await checkInByScan({ groups: espia, arrivals, minter })({
      eventId: 'e1',
      scans: [scan('s1', 'https://coca-cola.com')],
    })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
    expect(consultas).toBe(0)
  })

  it('rechaza una cantidad mayor que los cupos sin insertar', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({ eventId: 'e1', scans: [scan('s1', TOKEN, 9)] })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
    expect(rows).toHaveLength(0)
  })

  it('sin cantidad, la decide el servidor con lo confirmado por el grupo', async () => {
    const { groups, arrivals } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({
      eventId: 'e1',
      scans: [{ ...scan('s1'), arrivedCount: null }],
    })
    expect(isOk(r) && r.value[0]?.kind === 'welcome' && r.value[0].arrivedCount).toBe(4)
  })

  it('un lote mixto procesa cada escaneo por separado', async () => {
    const { groups, arrivals } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({
      eventId: 'e1',
      scans: [scan('s1'), scan('s2', 'basura'), scan('s3', OTRO)],
    })
    expect(isOk(r) && r.value.map((o) => o.kind)).toEqual(['welcome', 'unknown', 'unknown'])
  })
})
