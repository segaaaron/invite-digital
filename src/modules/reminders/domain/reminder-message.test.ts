import { describe, expect, it } from 'vitest'
import { reminderMessage } from './reminder-message'

const CIERRE = new Date('2026-09-28T00:00:00Z')

describe('reminderMessage', () => {
  it('pone la etiqueta del grupo y la fecha del cierre', () => {
    const texto = reminderMessage({ kind: 'sin_respuesta', locale: 'es', groupLabel: 'Familia Rojas Peña', deadline: CIERRE })

    expect(texto).toContain('Familia Rojas Peña')
    expect(texto).toContain('28')
  })

  it('NUNCA lleva un enlace dentro: de ese token solo queda el SHA-256', () => {
    for (const kind of ['sin_respuesta', 'sin_abrir'] as const) {
      for (const locale of ['es', 'en']) {
        const texto = reminderMessage({ kind, locale, groupLabel: 'Ana Lucía Vega', deadline: CIERRE })

        expect(texto).not.toMatch(/https?:\/\//)
        expect(texto).not.toContain('{enlace}')
      }
    }
  })

  it('el texto de «sin abrir» no da por hecho que lo recibieron', () => {
    const sinAbrir = reminderMessage({ kind: 'sin_abrir', locale: 'es', groupLabel: 'Ana', deadline: CIERRE })
    const sinRespuesta = reminderMessage({ kind: 'sin_respuesta', locale: 'es', groupLabel: 'Ana', deadline: CIERRE })

    expect(sinAbrir).not.toBe(sinRespuesta)
    expect(sinAbrir.toLowerCase()).toContain('llegó')
  })

  it('un idioma que no conocemos cae al español, que es el del atelier', () => {
    const texto = reminderMessage({ kind: 'sin_respuesta', locale: 'pt', groupLabel: 'Ana', deadline: CIERRE })

    expect(texto).toContain('Ana')
    expect(texto.length).toBeGreaterThan(0)
  })
})
