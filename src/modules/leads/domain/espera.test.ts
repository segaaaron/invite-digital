import { describe, expect, it } from 'vitest'
import { esperaDeConsulta } from './espera'

const AHORA = new Date('2026-09-24T15:00:00Z')
const antes = (minutos: number) => new Date(AHORA.getTime() - minutos * 60_000)

describe('esperaDeConsulta', () => {
  it('lo dice como se dice, de minutos a días', () => {
    expect(esperaDeConsulta(antes(0), AHORA).texto).toBe('recién llegada')
    expect(esperaDeConsulta(antes(12), AHORA).texto).toBe('hace 12 min')
    expect(esperaDeConsulta(antes(3 * 60 + 10), AHORA).texto).toBe('hace 3 h')
    expect(esperaDeConsulta(antes(26 * 60), AHORA).texto).toBe('hace 1 día')
    expect(esperaDeConsulta(antes(3 * 24 * 60), AHORA).texto).toBe('hace 3 días')
  })

  it('se marca urgente al cumplir un día sin contestar, no antes', () => {
    expect(esperaDeConsulta(antes(23 * 60 + 59), AHORA).urgente).toBe(false)
    expect(esperaDeConsulta(antes(24 * 60), AHORA).urgente).toBe(true)
  })

  it('un reloj que va detrás no da tiempos negativos', () => {
    expect(esperaDeConsulta(new Date(AHORA.getTime() + 60_000), AHORA).texto).toBe('recién llegada')
  })
})
