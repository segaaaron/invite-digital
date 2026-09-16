import { describe, expect, it } from 'vitest'
import { resolveArrival } from './conflict'
import type { Arrival } from './arrival'

const scan = (scanId: string, arrivedCount: number, iso: string, voidedAt: Date | null = null): Arrival => ({
  scanId,
  guestGroupId: 'g1',
  arrivedCount,
  scannedAt: new Date(iso),
  voidedAt,
})

describe('resolveArrival', () => {
  it('sin escaneos no hay llegada', () => {
    expect(resolveArrival([])).toBeNull()
  })

  it('con un solo escaneo devuelve ese', () => {
    const r = resolveArrival([scan('a', 3, '2026-10-18T21:00:00Z')])
    expect(r?.arrivedCount).toBe(3)
    expect(r?.arrivedAt.toISOString()).toBe('2026-10-18T21:00:00.000Z')
  })

  it('dos puertas: gana la hora más temprana, porque es cuando cruzaron', () => {
    const r = resolveArrival([
      scan('b', 2, '2026-10-18T21:10:00Z'),
      scan('a', 3, '2026-10-18T21:00:00Z'),
    ])
    expect(r?.arrivedAt.toISOString()).toBe('2026-10-18T21:00:00.000Z')
  })

  it('la cantidad la manda el escaneo más reciente: es la última corrección humana', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 2, '2026-10-18T21:10:00Z'),
    ])
    expect(r?.arrivedCount).toBe(2)
  })

  it('ignora los escaneos con lápida', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 9, '2026-10-18T21:10:00Z', new Date()),
    ])
    expect(r?.arrivedCount).toBe(3)
    expect(r?.scanCount).toBe(1)
  })

  it('si todos tienen lápida, el grupo no ha llegado', () => {
    expect(resolveArrival([scan('a', 3, '2026-10-18T21:00:00Z', new Date())])).toBeNull()
  })

  it('cuenta los escaneos vivos, para poder avisar de un conflicto', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 2, '2026-10-18T21:10:00Z'),
    ])
    expect(r?.scanCount).toBe(2)
  })
})

/**
 * Llegadas persona por persona: la pareja llega partida y dos puertas pueden registrar a la
 * misma persona sin red. Se suman las personas —la unión— y cada una entra a la hora de su
 * primer escaneo; quedarse con el último escaneo perdería a quien entró por la otra puerta.
 */
describe('resolveArrival · por persona', () => {
  const conPersonas = (scanId: string, personIds: string[], iso: string, voidedAt: Date | null = null): Arrival => ({
    ...scan(scanId, personIds.length, iso, voidedAt),
    personIds,
  })

  it('suma a las personas de todos los escaneos, cada una con la hora en que entró', () => {
    const r = resolveArrival([conPersonas('a', ['ana'], '2026-10-18T23:40:00Z'), conPersonas('b', ['luis'], '2026-10-19T00:20:00Z')])
    expect(r?.arrivedCount).toBe(2)
    expect(r?.personas).toEqual({ ana: new Date('2026-10-18T23:40:00Z'), luis: new Date('2026-10-19T00:20:00Z') })
  })

  it('la misma persona por dos puertas cuenta una vez, a la hora más temprana', () => {
    const r = resolveArrival([conPersonas('b', ['ana'], '2026-10-18T23:50:00Z'), conPersonas('a', ['ana'], '2026-10-18T23:40:00Z')])
    expect(r?.arrivedCount).toBe(1)
    expect(r?.personas.ana?.toISOString()).toBe('2026-10-18T23:40:00.000Z')
  })

  it('deshacer un escaneo saca a sus personas', () => {
    const r = resolveArrival([
      conPersonas('a', ['ana'], '2026-10-18T23:40:00Z'),
      conPersonas('b', ['luis'], '2026-10-19T00:20:00Z', new Date('2026-10-19T00:21:00Z')),
    ])
    expect(r?.personas).toEqual({ ana: new Date('2026-10-18T23:40:00Z') })
  })

  it('sin personas, como siempre: nadie en el mapa y la cantidad del último escaneo', () => {
    const r = resolveArrival([scan('a', 3, '2026-10-18T21:00:00Z')])
    expect(r?.personas).toEqual({})
    expect(r?.arrivedCount).toBe(3)
  })
})
