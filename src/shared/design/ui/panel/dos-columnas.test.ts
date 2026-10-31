import { describe, expect, it } from 'vitest'
import { enDosColumnas } from './dos-columnas'

const alto = (columna: readonly { peso: number }[]) => columna.reduce((suma, c) => suma + c.peso, 0)
const diferencia = ([izq, der]: readonly [{ peso: number }[], { peso: number }[]]) => Math.abs(alto(izq) - alto(der))

describe('enDosColumnas', () => {
  it('encuentra el reparto más parejo, no el primero que parece bueno', () => {
    // Los altos reales de «Datos y estilo» con el plan que trae colores (en cientos de píxeles).
    // «La siguiente al montón más bajo» daba 10,75 contra 8,6; el reparto parejo es 9,8 contra 9,55.
    const columnas = enDosColumnas([
      { clave: 'datos', peso: 2.8 },
      { clave: 'mensaje', peso: 5 },
      { clave: 'colores', peso: 6.2 },
      { clave: 'save', peso: 1.75 },
      { clave: 'preguntas', peso: 3.6 },
    ])

    expect(diferencia(columnas)).toBeLessThan(0.5)
  })

  it('respeta el orden de lectura dentro de cada columna', () => {
    const [izq, der] = enDosColumnas([
      { clave: 'a', peso: 1 },
      { clave: 'b', peso: 9 },
      { clave: 'c', peso: 1 },
      { clave: 'd', peso: 9 },
    ])

    for (const columna of [izq, der]) {
      expect(columna.map((c) => c.clave)).toStrictEqual([...columna].map((c) => c.clave).sort())
    }
  })

  it('con muchas tarjetas sigue repartiendo, sin probarlas todas', () => {
    const muchas = Array.from({ length: 40 }, (_, i) => ({ clave: String(i), peso: (i % 7) + 1 }))

    const columnas = enDosColumnas(muchas)

    expect(columnas[0].length + columnas[1].length).toBe(40)
    expect(diferencia(columnas)).toBeLessThanOrEqual(7)
  })

  it('sin tarjetas devuelve dos columnas vacías', () => {
    expect(enDosColumnas([])).toStrictEqual([[], []])
  })
})
