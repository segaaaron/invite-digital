import { describe, expect, it } from 'vitest'
import type { Contribution, Fund } from './fund'
import { progressOf } from './fund-progress'

const fondo: Fund = {
  id: 'f1',
  eventId: 'e1',
  name: 'Luna de miel en Rurrenabaque',
  description: 'Para los pasajes y las noches de hotel.',
  goalCents: 1_000_00,
}

const aporte = (amountCents: number): Contribution => ({
  id: crypto.randomUUID(),
  fundId: 'f1',
  guestGroupId: null,
  displayName: 'Abuela Rosa',
  amountCents,
  method: 'envelope',
  message: null,
  createdAt: new Date('2026-08-20T10:00:00.000Z'),
})

describe('progressOf', () => {
  it('sin contribuciones no hay nada recaudado y el porcentaje es cero', () => {
    expect(progressOf(fondo, [])).toEqual({ raisedCents: 0, goalCents: 100_000, percent: 0, exceeded: false })
  })

  it('suma lo recaudado en centavos enteros', () => {
    const p = progressOf(fondo, [aporte(150_00), aporte(75_50), aporte(1)])
    expect(p.raisedCents).toBe(22551)
  })

  it('a medias da el porcentaje redondeado a entero', () => {
    expect(progressOf(fondo, [aporte(500_00)]).percent).toBe(50)
    expect(progressOf(fondo, [aporte(333_33)]).percent).toBe(33)
  })

  it('justo en la meta da 100 y exceeded false', () => {
    const p = progressOf(fondo, [aporte(600_00), aporte(400_00)])
    expect(p.percent).toBe(100)
    expect(p.exceeded).toBe(false)
    expect(p.raisedCents).toBe(p.goalCents)
  })

  it('por encima de la meta el porcentaje se recorta al 100 y exceeded es true', () => {
    // Una barra al 140 % se sale del contenedor. El exceso se dice con palabras, no
    // deformando la barra.
    const p = progressOf(fondo, [aporte(1_400_00)])
    expect(p.percent).toBe(100)
    expect(p.exceeded).toBe(true)
    expect(p.raisedCents).toBe(140_000)
  })

  it('un céntimo por encima ya cuenta como superada', () => {
    const p = progressOf(fondo, [aporte(100_001)])
    expect(p.exceeded).toBe(true)
    expect(p.percent).toBe(100)
  })

  it('un céntimo por debajo todavía no', () => {
    const p = progressOf(fondo, [aporte(99_999)])
    expect(p.exceeded).toBe(false)
    expect(p.percent).toBe(99)
  })

  it('nunca redondea hacia arriba hasta el 100: casi lleno no es lleno', () => {
    // 99,6 % redondeado sería 100 y la barra mentiría diciendo que la meta se cumplió.
    expect(progressOf(fondo, [aporte(99_960)]).percent).toBe(99)
  })

  it('devuelve la meta del fondo tal cual, para que la barra no tenga que ir a buscarla', () => {
    expect(progressOf(fondo, []).goalCents).toBe(fondo.goalCents)
  })

  it('con una meta de un solo céntimo no divide por cero ni se pasa de 100', () => {
    const minimo: Fund = { ...fondo, goalCents: 1 }
    expect(progressOf(minimo, [])).toEqual({ raisedCents: 0, goalCents: 1, percent: 0, exceeded: false })
    expect(progressOf(minimo, [aporte(1)]).percent).toBe(100)
  })
})
