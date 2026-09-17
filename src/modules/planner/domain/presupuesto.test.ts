import { describe, expect, it } from 'vitest'
import { categoriasDe, repartoRecomendado, resumenPorCategoria, cuentasDePartida, nombreDePagador, pagosQueVencen, porPagador, presupuestoACsv, totalesDelPresupuesto, type Partida } from './presupuesto'

const partida = (parcial: Partial<Partida>): Partida => ({
  id: 'p',
  category: 'salon',
  concept: 'Salón',
  estimatedCents: 1_000_00,
  contractedCents: null,
  payer: 'anfitriones',
  padrinoLabel: null,
  notes: null,
  pagos: [],
  ...parcial,
})

describe('cuentasDePartida', () => {
  it('sin contrato, lo que falta sale de lo previsto', () => {
    const p = partida({ pagos: [{ id: 'x', amountCents: 300_00, dueDate: null, paidAt: new Date() }] })
    expect(cuentasDePartida(p)).toEqual({ previsto: 1_000_00, contratado: null, pagado: 300_00, falta: 700_00 })
  })
  it('con contrato, sale de lo contratado; un pago sin marcar no cuenta como pagado', () => {
    const p = partida({ contractedCents: 1_200_00, pagos: [{ id: 'x', amountCents: 500_00, dueDate: '2027-01-01', paidAt: null }] })
    expect(cuentasDePartida(p)).toMatchObject({ pagado: 0, falta: 1_200_00 })
  })
  it('pagar de más no deja «falta» negativo', () => {
    const p = partida({ pagos: [{ id: 'x', amountCents: 1_500_00, dueDate: null, paidAt: new Date() }] })
    expect(cuentasDePartida(p).falta).toBe(0)
  })
})

describe('totales y pagadores', () => {
  const partidas = [
    partida({ id: 'a', estimatedCents: 1_000_00, contractedCents: 1_200_00, payer: 'anfitriones' }),
    partida({ id: 'b', estimatedCents: 500_00, payer: 'padrino', padrinoLabel: 'Tío Jorge', pagos: [{ id: 'x', amountCents: 500_00, dueDate: null, paidAt: new Date() }] }),
  ]

  it('el desvío compara lo comprometido contra lo previsto', () => {
    expect(totalesDelPresupuesto(partidas)).toEqual({ previsto: 1_500_00, comprometido: 1_700_00, pagado: 500_00, falta: 1_200_00, desvio: 200_00 })
  })

  it('cada padrino sale con su nombre, y el vocabulario es el de la fiesta', () => {
    const filas = porPagador(partidas, 'xv')
    expect(filas.map((f) => f.nombre)).toEqual(['Padres', 'Padrino · Tío Jorge'])
    expect(nombreDePagador('boda', 'anfitriones')).toBe('Novios')
  })

  it('las categorías de XV traen chambelanes; las de boda no', () => {
    expect(categoriasDe('xv').some((c) => c.clave === 'chambelanes')).toBe(true)
    expect(categoriasDe('boda').some((c) => c.clave === 'chambelanes')).toBe(false)
  })
})

describe('pagosQueVencen', () => {
  it('trae los no pagados que vencen en siete días o ya vencieron, por fecha', () => {
    const partidas = [
      partida({
        concept: 'DJ',
        pagos: [
          { id: '1', amountCents: 1, dueDate: '2027-01-20', paidAt: null },
          { id: '2', amountCents: 1, dueDate: '2027-01-05', paidAt: null },
          { id: '3', amountCents: 1, dueDate: '2027-01-12', paidAt: new Date() },
          { id: '4', amountCents: 1, dueDate: '2027-01-15', paidAt: null },
        ],
      }),
    ]
    expect(pagosQueVencen(partidas, '2027-01-10').map((p) => p.id)).toEqual(['2', '4'])
  })
})

describe('presupuestoACsv', () => {
  it('una fila por partida, importes con decimales y lo que parece fórmula neutralizado', () => {
    const csv = presupuestoACsv([partida({ concept: '=HYPERLINK("x")', estimatedCents: 1_234_50 })], 'boda')
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"\'=HYPERLINK(""x"")"')
    expect(csv).toContain('"1234.50"')
  })
})

describe('el presupuesto total repartido por categorías', () => {
  it('el reparto recomendado suma el total entero, sin céntimos perdidos', () => {
    for (const fiesta of ['boda', 'xv'] as const) {
      const reparto = repartoRecomendado(fiesta, 3_333_333)
      expect(Object.values(reparto).reduce((a, b) => a + b, 0)).toBe(3_333_333)
      expect(Object.keys(reparto).sort()).toEqual(categoriasDe(fiesta).map((c) => c.clave).sort())
    }
  })

  it('cada categoría dice lo asignado, lo comprometido y si se pasó', () => {
    const partidas: Partida[] = [
      { id: 'a', category: 'salon', concept: 'Hacienda', estimatedCents: 900_000, contractedCents: 1_200_000, payer: 'anfitriones', padrinoLabel: null, notes: null, pagos: [{ id: 'g', amountCents: 300_000, dueDate: null, paidAt: new Date() }] },
    ]
    const filas = resumenPorCategoria(partidas, 'xv', { salon: 1_000_000, catering: 2_000_000 })
    expect(filas.find((f) => f.clave === 'salon')).toMatchObject({ asignado: 1_000_000, comprometido: 1_200_000, pagado: 300_000, estado: 'pasado' })
    expect(filas.find((f) => f.clave === 'catering')).toMatchObject({ asignado: 2_000_000, comprometido: 0, estado: 'libre' })
  })
})
