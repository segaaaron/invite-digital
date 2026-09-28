import { describe, expect, it } from 'vitest'
import { mesDe, mesVecino, semanasDelMes } from './calendario'

describe('calendario del mes', () => {
  it('empieza en lunes y completa las semanas con los días vecinos', () => {
    const semanas = semanasDelMes('2026-10')
    expect(semanas[0]?.[0]).toMatchObject({ iso: '2026-09-28', delMes: false })
    expect(semanas[0]?.[3]).toMatchObject({ iso: '2026-10-01', delMes: true, finDeSemana: false })
    expect(semanas[0]?.[5]?.finDeSemana).toBe(true)
    expect(semanas.at(-1)?.at(-1)?.iso).toBe('2026-11-01')
    expect(semanas).toHaveLength(5)
  })

  it('cruza de año y cae al mes de hoy con un mes mal escrito', () => {
    expect(mesVecino('2026-12', 1)).toBe('2027-01')
    expect(mesVecino('2027-01', -1)).toBe('2026-12')
    expect(mesDe('2026-13', '2026-09-28')).toBe('2026-09')
    expect(mesDe('2027-02', '2026-09-28')).toBe('2027-02')
  })
})
