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

  it('el número de línea es el del archivo, aunque haya líneas en blanco', () => {
    // El informe lo lee alguien con el CSV abierto delante: si dice «línea 3» y en la 3
    // hay otra cosa, no sirve para arreglarlo.
    const filas = parseGuestCsv('Familia Rojas;4\n\n;3')
    expect(filas[1]?.line).toBe(3)
  })

  it('un campo entrecomillado puede llevar el separador dentro', () => {
    // «Familia Rojas; Peña» entre comillas es un solo grupo, no dos columnas: partirlo
    // corre todas las columnas de esa fila y los cupos acaban en la etiqueta.
    const filas = parseGuestCsv('"Familia Rojas; Peña";4;+59170011122')
    expect(filas[0]).toMatchObject({ label: 'Familia Rojas; Peña', seats: 4, phone: '+59170011122' })
  })

  it('una única fila con cupos no numéricos no se traga como cabecera en silencio', () => {
    // Si se salta, la importación responde «0 creadas, 0 rechazadas» y nadie sabe por qué.
    const filas = parseGuestCsv('Grupo;Cupos;Teléfono')
    expect(filas).toHaveLength(1)
    expect(filas[0]?.problem).toContain('Cupos inválidos')
  })

  it('un archivo vacío no es un error, es una lista vacía', () => {
    expect(parseGuestCsv('')).toEqual([])
    expect(parseGuestCsv('\n\n')).toEqual([])
  })
})
