import { describe, expect, it } from 'vitest'
import { repartoDeMesas } from './reparto-de-mesas'

describe('repartoDeMesas: las cuentas de las mesas las hace el código', () => {
  const lista = [
    { invitacion: 'Gutiérrez', lugares: 3 },
    { invitacion: 'Rojas Peña', lugares: 3 },
    { invitacion: 'Abuelos', lugares: 2 },
    { invitacion: 'Mamani', lugares: 2 },
    { invitacion: 'Ana', lugares: 1 },
    { invitacion: 'Sofía', lugares: 1 },
  ]
  it('nunca pasa los lugares de una mesa ni parte una invitación', () => {
    const r = repartoDeMesas(lista)
    for (const m of r) expect(m.ocupados).toBeLessThanOrEqual(m.lugares)
    expect(r.flatMap((m) => m.invitaciones)).toHaveLength(lista.length)
    expect(r.reduce((s, m) => s + m.ocupados, 0)).toBe(12)
    expect(r).toHaveLength(2)
  })
  it('una invitación más grande que una mesa ocupa la suya entera', () => {
    expect(repartoDeMesas([{ invitacion: 'Familia grande', lugares: 11 }])).toEqual([{ mesa: 'Mesa 1', lugares: 11, ocupados: 11, invitaciones: ['Familia grande (11)'] }])
  })
  it('con más de 80 personas, mesas de 10', () => {
    const r = repartoDeMesas(Array.from({ length: 41 }, (_, i) => ({ invitacion: `P${i}`, lugares: 2 })))
    expect(r[0]!.lugares).toBe(10)
  })
})
