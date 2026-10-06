import { describe, expect, it } from 'vitest'
import { leerBrief, MAX_RESPUESTA_DEL_ENCARGO, preguntasDelEncargo } from './diseno'

describe('el formulario de datos del encargo, según el plan', () => {
  it('Atelier no pregunta nada; Gala, las secciones; Imperial, también temática, vestido, decoración y flores', () => {
    expect(preguntasDelEncargo({ estilo: false, creadoParaTi: false })).toEqual([])
    expect(preguntasDelEncargo({ estilo: true, creadoParaTi: false })).toEqual(['secciones'])
    expect(preguntasDelEncargo({ estilo: true, creadoParaTi: true })).toEqual(['secciones', 'tematica', 'vestido', 'decoracion', 'flores'])
  })

  it('guarda las respuestas recortadas, sin las vacías', () => {
    const datos: Record<string, string> = { tematica: '  Jardín de mariposas ', vestido: '', flores: 'Peonías' }
    expect(leerBrief((p) => datos[p] ?? null)).toEqual({ ok: true, value: { tematica: 'Jardín de mariposas', flores: 'Peonías' } })
  })

  it('una respuesta demasiado larga no se guarda recortada: se rechaza', () => {
    const largo = 'x'.repeat(MAX_RESPUESTA_DEL_ENCARGO + 1)
    expect(leerBrief((p) => (p === 'vestido' ? largo : null))).toEqual({ ok: false, error: 'texto_largo' })
  })
})
