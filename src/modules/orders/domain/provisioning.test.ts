import { describe, expect, it } from 'vitest'
import { eventSlugFor, rsvpDeadlineFor } from './provisioning'

describe('eventSlugFor', () => {
  it('sale de la referencia del pedido, que ya es única', () => {
    // La referencia es única por el `unique` de la tabla, así que el slug también lo es.
    // Derivarlo del nombre del cliente chocaría en cuanto hubiera dos bodas de los García.
    expect(eventSlugFor('A2B3C4D5')).toBe('evento-a2b3c4d5')
  })

  it('siempre cumple la forma que exige el dominio del evento', () => {
    // Minúsculas, números y guiones. Si esto se rompe, `createEvent` devuelve
    // `invalid_slug` y la aprobación del pedido falla en producción, con el pago hecho.
    for (const ref of ['A2B3C4D5', 'ZZZZZZZZ', '22222222']) {
      expect(eventSlugFor(ref)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })
})

describe('rsvpDeadlineFor', () => {
  it('cierra las confirmaciones quince días antes', () => {
    expect(rsvpDeadlineFor('2027-06-20')).toBe('2027-06-05')
  })

  it('cruza el cambio de mes sin inventarse días', () => {
    expect(rsvpDeadlineFor('2027-03-10')).toBe('2027-02-23')
  })

  it('y el cambio de año', () => {
    expect(rsvpDeadlineFor('2027-01-05')).toBe('2026-12-21')
  })

  it('nunca queda después del evento, que es lo único que el dominio prohíbe', () => {
    for (const fecha of ['2027-06-20', '2027-01-01', '2028-02-29']) {
      expect(rsvpDeadlineFor(fecha) <= fecha).toBe(true)
    }
  })
})
