import { describe, expect, it } from 'vitest'
import { seatRing } from './seat-ring'

const grupo = (id: string, label: string, seats: number) => ({ id, label, seats, tableId: 't1' })

describe('seatRing', () => {
  it('pone una silla por sitio de la mesa, ocupadas y libres', () => {
    const sillas = seatRing(4, [grupo('g1', 'Ana Lucía Vega', 2)])
    expect(sillas).toHaveLength(4)
    expect(sillas.filter((s) => s.occupant !== null)).toHaveLength(2)
  })

  it('cada silla ocupada sabe de quién es, para poder decirlo', () => {
    const sillas = seatRing(3, [grupo('g1', 'Familia García', 1), grupo('g2', 'Roberto Núñez', 1)])
    expect(sillas.map((s) => s.occupant?.label ?? null)).toEqual(['Familia García', 'Roberto Núñez', null])
  })

  it('la inicial es la del grupo, en mayúscula', () => {
    expect(seatRing(1, [grupo('g1', 'ana lucía', 1)])[0]?.initial).toBe('A')
  })

  it('reparte las sillas por la circunferencia, empezando arriba', () => {
    const angulos = seatRing(4, []).map((s) => s.angle)
    expect(angulos).toEqual([0, 90, 180, 270])
  })

  it('un grupo con más cupos que sitios no desborda la mesa', () => {
    // Sentar a seis en una mesa de cuatro no cabe: el plano enseña cuatro sillas, y el
    // desajuste se ve en el contador, no dibujando sillas que no existen.
    expect(seatRing(4, [grupo('g1', 'Los Nieto', 6)])).toHaveLength(4)
  })

  it('una mesa sin cupo declarado no revienta', () => {
    expect(seatRing(0, [grupo('g1', 'Los Nieto', 2)])).toEqual([])
  })

  it('un grupo sin nombre no deja una inicial vacía disfrazada de silla ocupada', () => {
    expect(seatRing(1, [grupo('g1', '   ', 1)])[0]?.initial).toBe('·')
  })
})
