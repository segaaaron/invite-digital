import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { getRsvpTimeline } from './get-rsvp-timeline'
import type { RsvpRepository } from './ports'

const repo = (overrides: Partial<RsvpRepository> = {}): RsvpRepository => ({
  append: async () => {},
  latestFor: async () => null,
  tallyRowsFor: async () => [],
  respondedAtsFor: async () => [],
  ...overrides,
})

describe('getRsvpTimeline', () => {
  it('reparte por día lo que devuelve el repositorio', async () => {
    const hoy = new Date('2026-08-22T12:00:00')
    const resultado = await getRsvpTimeline({
      rsvp: repo({ respondedAtsFor: async () => [new Date('2026-08-22T09:00:00')] }),
      clock: () => hoy,
    })('evento', 2)

    expect(isOk(resultado)).toBe(true)
    if (!isOk(resultado)) return
    expect(resultado.value.map((b) => b.count)).toEqual([0, 1])
  })

  it('pide al repositorio solo la ventana que va a pintar', async () => {
    let desde: Date | null = null
    await getRsvpTimeline({
      rsvp: repo({
        respondedAtsFor: async (_id, since) => {
          desde = since
          return []
        },
      }),
      clock: () => new Date('2026-08-22T12:00:00'),
    })('evento', 3)

    expect(desde).not.toBeNull()
    expect(claveLocal(desde!)).toBe('2026-08-20')
  })

  it('un fallo de la base es un error, no una serie vacía que parece un evento sin respuestas', async () => {
    const resultado = await getRsvpTimeline({
      rsvp: repo({
        respondedAtsFor: async () => {
          throw new Error('conexión caída')
        },
      }),
      clock: () => new Date('2026-08-22T12:00:00'),
    })('evento', 3)

    expect(isErr(resultado)).toBe(true)
    if (!isErr(resultado)) return
    expect(resultado.error.kind).toBe('storage_failure')
  })
})

function claveLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}
