import { describe, expect, it } from 'vitest'
import { ETAPAS, etapaDe, ordenarCartera } from './cartera'

const HOY = '2026-09-14'
const base = { eventDate: '2026-10-10', status: 'live', grupos: 10, enviados: 10 }

describe('etapa de una boda', () => {
  it('lo que ya pasó está celebrado, sea cual sea su estado', () => {
    expect(etapaDe({ ...base, eventDate: '2026-09-13', status: 'draft' }, HOY)).toBe('celebrada')
  })

  it('hoy todavía no está celebrada', () => {
    expect(etapaDe({ ...base, eventDate: HOY }, HOY)).toBe('confirmando')
  })

  it('borrador y cerrada mandan sobre los invitados', () => {
    expect(etapaDe({ ...base, status: 'draft', grupos: 0 }, HOY)).toBe('borrador')
    expect(etapaDe({ ...base, status: 'closed', enviados: 0 }, HOY)).toBe('cerrada')
  })

  it('publicada: sin grupos, repartiendo hasta enviar el último, luego confirmando', () => {
    expect(etapaDe({ ...base, grupos: 0, enviados: 0 }, HOY)).toBe('sin_invitados')
    expect(etapaDe({ ...base, enviados: 9 }, HOY)).toBe('repartiendo')
    expect(etapaDe(base, HOY)).toBe('confirmando')
  })

  it('un estado desconocido se trata como borrador: lo seguro es no darla por publicada', () => {
    expect(etapaDe({ ...base, status: 'raro' }, HOY)).toBe('borrador')
  })

  it('las etapas van en el orden en que avanza una boda', () => {
    expect(ETAPAS.map((e) => e.clave)).toEqual(['borrador', 'sin_invitados', 'repartiendo', 'confirmando', 'cerrada', 'celebrada'])
  })
})

describe('orden de la cartera', () => {
  it('las que vienen primero y por cercanía; las celebradas al final, la más reciente arriba', () => {
    const filas = [
      { slug: 'pasada-vieja', eventDate: '2026-01-01' },
      { slug: 'lejana', eventDate: '2027-01-01' },
      { slug: 'pasada-reciente', eventDate: '2026-09-01' },
      { slug: 'cercana', eventDate: '2026-09-20' },
    ]
    expect(ordenarCartera(filas, HOY).map((f) => f.slug)).toEqual(['cercana', 'lejana', 'pasada-reciente', 'pasada-vieja'])
  })
})
