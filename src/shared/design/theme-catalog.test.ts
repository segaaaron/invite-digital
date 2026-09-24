import { describe, expect, it } from 'vitest'
import { CATALOG_EN_VENTA, CATALOG_ENTRIES, CATALOG_KEYS, seVende } from './theme-catalog'

/**
 * La colección que se vende: las ocho bodas y los ocho XV de la primera tanda, más los
 * diseños nuevos que se van portando de la maqueta.
 */
const A_LA_VENTA = [
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
  // Los nuevos, según se portan.
  'esencia',
  'boda-sello',
  'boda-serenidad',
  'boda-royal',
  'boda-navy',
  'boda-perla',
  'boda-boho',
  'boda-glamour',
  'xv-deco',
  'xv-realeza',
  'xv-vogue',
  'xv-y2k',
  'xv-boho',
  'xv-min',
  'xv-princ',
  'xv-eleg',
  'xv-trop',
  'xv-papillon',
] as const

/** Lo portado que todavía no se vende: el cumpleaños, hasta que el usuario lo publique. */
const SIN_VENDER = ['cumple-beer'] as const

describe('el catálogo de diseños', () => {
  it('lista lo que se vende más lo portado sin vender', () => {
    expect([...CATALOG_KEYS].sort()).toEqual([...A_LA_VENTA, ...SIN_VENDER].sort())
  })

  it('lo que no se vende queda fuera de lo que la web enseña', () => {
    // El seed publica `CATALOG_EN_VENTA`. Un diseño portado y no vendido que se colara
    // aquí aparecería en el catálogo público en el siguiente despliegue, sin más aviso.
    expect(CATALOG_EN_VENTA.map((entrada) => entrada.key).sort()).toEqual([...A_LA_VENTA].sort())
    for (const clave of SIN_VENDER) expect(seVende(clave), clave).toBe(false)
    for (const clave of A_LA_VENTA) expect(seVende(clave), clave).toBe(true)
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
