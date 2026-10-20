import { describe, expect, it } from 'vitest'
import { caducidadDeUnaDemo, DURACION_DE_LA_DEMO_MS, esDemo, horasQueLeQuedan, demoVencida } from './demo'
import type { Event } from './event'

const evento = (demoUntil: Date | null): Event => ({
  id: 'e1',
  userId: 'u1',
  slug: 'demo-valentina',
  title: 'Valentina',
  eventDate: '2026-12-19',
  rsvpDeadline: '2026-12-12',
  locale: 'es',
  themeKey: 'xv-valentina',
  status: 'live',
  retentionDays: 90,
  currency: 'BOB',
  messageTemplate: null,
  venue: null,
  demoUntil,
})

describe('demo', () => {
  it('una demo nace con un día de vida', () => {
    expect(caducidadDeUnaDemo(new Date('2026-10-20T18:40:00Z'))).toEqual(new Date('2026-10-21T18:40:00Z'))
    expect(DURACION_DE_LA_DEMO_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('con fecha es demo; sin fecha es una boda vendida', () => {
    expect(esDemo(evento(new Date()))).toBe(true)
    expect(esDemo(evento(null))).toBe(false)
  })

  it('vence cuando pasa su hora, ni antes ni «hoy»', () => {
    const hasta = new Date('2026-10-21T18:40:00Z')
    expect(demoVencida(evento(hasta), new Date('2026-10-21T18:39:59Z'))).toBe(false)
    expect(demoVencida(evento(hasta), new Date('2026-10-21T18:40:01Z'))).toBe(true)
  })

  // Lo vendido no caduca nunca por esta vía: un fallo aquí apagaría bodas de verdad.
  it('lo que no es demo no vence jamás', () => {
    expect(demoVencida(evento(null), new Date('2099-01-01T00:00:00Z'))).toBe(false)
  })

  it('dice las horas que le quedan, redondeando hacia arriba: «19 h» mientras quede algo de esa hora', () => {
    const hasta = new Date('2026-10-21T18:40:00Z')
    expect(horasQueLeQuedan(hasta, new Date('2026-10-20T23:40:00Z'))).toBe(19)
    expect(horasQueLeQuedan(hasta, new Date('2026-10-21T18:00:00Z'))).toBe(1)
    // Vencida: cero, nunca un número negativo en pantalla.
    expect(horasQueLeQuedan(hasta, new Date('2026-10-22T00:00:00Z'))).toBe(0)
  })
})
