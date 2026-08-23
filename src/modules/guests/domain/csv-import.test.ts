import { describe, expect, it } from 'vitest'
import { parseGuestCsv } from './csv-import'

describe('parseGuestCsv', () => {
  it('lee etiqueta, cupos y teléfono, y se salta la cabecera', () => {
    const filas = parseGuestCsv('Grupo;Cupos;Teléfono\nFamilia Rojas Peña;4;+59170011122\nAna Vega;2;')
    expect(filas).toHaveLength(2)
    expect(filas[0]).toMatchObject({ label: 'Familia Rojas Peña', seats: 4, phone: '+59170011122', problem: null })
    expect(filas[1]).toMatchObject({ label: 'Ana Vega', seats: 2, phone: null })
  })

  it('acepta coma y tabulador, porque Excel exporta con lo que le da la gana', () => {
    expect(parseGuestCsv('Ana Vega,2,')[0]).toMatchObject({ label: 'Ana Vega', seats: 2 })
    expect(parseGuestCsv('Ana Vega\t2\t')[0]).toMatchObject({ label: 'Ana Vega', seats: 2 })
  })

  it('devuelve las filas malas con su motivo, no las descarta', () => {
    // Quien importa cincuenta necesita saber cuáles fallaron; un «37 de 50» obliga a
    // comparar dos listas a mano.
    const filas = parseGuestCsv('Familia Rojas;4\n;3\nAna Vega;cero')
    expect(filas).toHaveLength(3)
    expect(filas[1]?.problem).toBe('Sin etiqueta')
    expect(filas[2]?.problem).toContain('Cupos inválidos')
  })

  it('un archivo vacío no es un error, es una lista vacía', () => {
    expect(parseGuestCsv('')).toEqual([])
    expect(parseGuestCsv('\n\n')).toEqual([])
  })
})
