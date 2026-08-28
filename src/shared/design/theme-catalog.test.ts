import { describe, expect, it } from 'vitest'
import { CATALOG_ENTRIES, CATALOG_KEYS } from './theme-catalog'

/**
 * Los dieciséis que el usuario pidió: las ocho bodas y los ocho XV años de la maqueta.
 * La sección «XV Años V2» queda fuera por decisión suya.
 */
const LOS_DIECISEIS = [
  'boda-bot',
  'boda-ed',
  'boda-cin',
  'boda',
  'civil',
  'aniv',
  'eng',
  'dest',
  'xv',
  'xv-natalia',
  'xv-valentina',
  'xv-luciana',
  'xv-fantasia',
  'xv-valeria',
  'xv-mariana',
  'xv-isabelle',
] as const

describe('el catálogo de diseños', () => {
  it('lista los dieciséis, sin faltar ni sobrar ninguno', () => {
    expect([...CATALOG_KEYS].sort()).toEqual([...LOS_DIECISEIS].sort())
  })

  it('no repite ninguna clave', () => {
    expect(new Set(CATALOG_KEYS).size).toBe(CATALOG_KEYS.length)
  })

  it('cada entrada trae la muestra completa que la tarjeta dibuja', () => {
    // La muestra está completa o no está: media tarjeta con el monograma y sin nombres se
    // lee como un fallo de carga, no como un modelo. Es la regla que ya tiene el dominio
    // del catálogo, comprobada aquí en el origen del dato.
    for (const entrada of CATALOG_ENTRIES) {
      for (const campo of ['monogram', 'names', 'dateLabel', 'venue'] as const) {
        expect(entrada.sample[campo].trim(), `${entrada.key}/${campo}`).not.toBe('')
      }
    }
  })

  it('cada entrada trae los dos nombres, en español y en inglés', () => {
    for (const entrada of CATALOG_ENTRIES) {
      expect(entrada.es.trim(), entrada.key).not.toBe('')
      expect(entrada.en.trim(), entrada.key).not.toBe('')
    }
  })

  it('los colores de la tarjeta son hexadecimales válidos', () => {
    // Se escriben a mano desde la paleta del diseño, y un color mal copiado deja la
    // tarjeta con el papel transparente sin que nada se queje.
    for (const entrada of CATALOG_ENTRIES) {
      expect(entrada.palette.base, entrada.key).toMatch(/^#[0-9a-f]{6}$/)
      expect(entrada.palette.accent, entrada.key).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('el papel y el acento de cada tarjeta son colores distintos', () => {
    for (const entrada of CATALOG_ENTRIES) {
      expect(entrada.palette.base, entrada.key).not.toBe(entrada.palette.accent)
    }
  })
})
