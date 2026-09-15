import type { Fiesta } from '@/modules/events'
import { sumarDias } from './tareas'

/** Quién pone el dinero de una partida. Los nombres cambian con la fiesta; la clave no. */
export type Pagador = 'anfitriones' | 'familia_a' | 'familia_b' | 'padrino' | 'otro'
export const PAGADORES: readonly Pagador[] = ['anfitriones', 'familia_a', 'familia_b', 'padrino', 'otro']

const NOMBRES_DE_PAGADOR: Record<Fiesta, Record<Pagador, string>> = {
  boda: { anfitriones: 'Novios', familia_a: 'Familia de la novia', familia_b: 'Familia del novio', padrino: 'Padrino', otro: 'Otro' },
  xv: { anfitriones: 'Padres', familia_a: 'Familia materna', familia_b: 'Familia paterna', padrino: 'Padrino', otro: 'Otro' },
}

export const nombreDePagador = (fiesta: Fiesta, pagador: Pagador): string => NOMBRES_DE_PAGADOR[fiesta][pagador]

const CATEGORIAS: Record<Fiesta, ReadonlyArray<{ clave: string; nombre: string }>> = {
  boda: [
    { clave: 'salon', nombre: 'Salón' },
    { clave: 'ceremonia', nombre: 'Iglesia o registro civil' },
    { clave: 'catering', nombre: 'Catering y bebidas' },
    { clave: 'musica', nombre: 'Música' },
    { clave: 'foto', nombre: 'Fotografía y video' },
    { clave: 'vestido', nombre: 'Vestido' },
    { clave: 'traje', nombre: 'Traje' },
    { clave: 'decoracion', nombre: 'Decoración y flores' },
    { clave: 'torta', nombre: 'Torta' },
    { clave: 'recuerdos', nombre: 'Recuerdos' },
    { clave: 'otros', nombre: 'Otros' },
  ],
  xv: [
    { clave: 'salon', nombre: 'Salón' },
    { clave: 'misa', nombre: 'Misa' },
    { clave: 'catering', nombre: 'Catering y bebidas' },
    { clave: 'dj', nombre: 'DJ y música' },
    { clave: 'foto', nombre: 'Fotografía y video' },
    { clave: 'vestido', nombre: 'Vestido' },
    { clave: 'chambelanes', nombre: 'Chambelanes' },
    { clave: 'coreografo', nombre: 'Coreógrafo' },
    { clave: 'decoracion', nombre: 'Decoración' },
    { clave: 'torta', nombre: 'Torta' },
    { clave: 'show', nombre: 'Show' },
    { clave: 'otros', nombre: 'Otros' },
  ],
}

export const categoriasDe = (fiesta: Fiesta) => CATEGORIAS[fiesta]
export const nombreDeCategoria = (fiesta: Fiesta, clave: string): string => CATEGORIAS[fiesta].find((c) => c.clave === clave)?.nombre ?? 'Otros'

export const ETIQUETAS_DE_PAGO = ['anticipo', 'cuota', 'saldo'] as const

export type Pago = {
  readonly id: string
  readonly amountCents: number
  readonly dueDate: string | null
  readonly paidAt: Date | null
  /** `anticipo` · `cuota` · `saldo`, o nada. */
  readonly label?: string | null
}

/** Todo importe en centavos enteros. Nunca un `parseFloat` sobre el importe entero. */
export type Partida = {
  readonly id: string
  readonly category: string
  readonly concept: string
  readonly estimatedCents: number
  /** `null`: todavía no hay contrato; manda lo previsto. */
  readonly contractedCents: number | null
  readonly payer: Pagador
  /** Qué padrino, cuando paga un padrino. Es un nombre: la retención lo borra. */
  readonly padrinoLabel: string | null
  readonly notes: string | null
  readonly pagos: readonly Pago[]
}

const pagado = (p: Partida) => p.pagos.reduce((suma, pago) => suma + (pago.paidAt === null ? 0 : pago.amountCents), 0)
const comprometido = (p: Partida) => p.contractedCents ?? p.estimatedCents

export function cuentasDePartida(p: Partida) {
  return { previsto: p.estimatedCents, contratado: p.contractedCents, pagado: pagado(p), falta: Math.max(0, comprometido(p) - pagado(p)) }
}

/** `desvio` positivo: lo comprometido pasa de lo previsto. */
export function totalesDelPresupuesto(partidas: readonly Partida[]) {
  const t = { previsto: 0, comprometido: 0, pagado: 0, falta: 0, desvio: 0 }
  for (const p of partidas) {
    t.previsto += p.estimatedCents
    t.comprometido += comprometido(p)
    t.pagado += pagado(p)
    t.falta += cuentasDePartida(p).falta
  }
  t.desvio = t.comprometido - t.previsto
  return t
}

/** Lo que aporta cada quien. Cada padrino por su nombre: dos padrinos no son uno. */
export function porPagador(partidas: readonly Partida[], fiesta: Fiesta) {
  const filas = new Map<string, { nombre: string; comprometido: number; pagado: number }>()
  for (const p of partidas) {
    const nombre = p.payer === 'padrino' && p.padrinoLabel ? `${nombreDePagador(fiesta, 'padrino')} · ${p.padrinoLabel}` : nombreDePagador(fiesta, p.payer)
    const fila = filas.get(nombre) ?? { nombre, comprometido: 0, pagado: 0 }
    fila.comprometido += comprometido(p)
    fila.pagado += pagado(p)
    filas.set(nombre, fila)
  }
  return [...filas.values()]
}

/** Pagos sin marcar que vencen en siete días o ya vencieron, con su partida, por fecha. */
export function pagosQueVencen(partidas: readonly Partida[], hoy: string) {
  const limite = sumarDias(hoy, 7)
  return partidas
    .flatMap((p) => p.pagos.map((pago) => ({ ...pago, partidaId: p.id, concepto: p.concept })))
    .filter((pago) => pago.paidAt === null && pago.dueDate !== null && pago.dueDate <= limite)
    .sort((x, y) => (x.dueDate! < y.dueDate! ? -1 : x.dueDate! > y.dueDate! ? 1 : 0))
}

const decimal = (cents: number) => `${Math.trunc(cents / 100)}.${String(Math.abs(cents % 100)).padStart(2, '0')}`
/** Comillas dobladas y lo que una hoja tomaría por fórmula, con apóstrofo delante. */
const celda = (valor: string) => `"${(/^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor).replace(/"/g, '""')}"`

export function presupuestoACsv(partidas: readonly Partida[], fiesta: Fiesta): string {
  const cabecera = ['Categoría', 'Concepto', 'Quién paga', 'Previsto', 'Contratado', 'Pagado', 'Falta'].map(celda).join(';')
  const filas = partidas.map((p) => {
    const c = cuentasDePartida(p)
    const quien = p.payer === 'padrino' && p.padrinoLabel ? `${nombreDePagador(fiesta, 'padrino')} · ${p.padrinoLabel}` : nombreDePagador(fiesta, p.payer)
    return [nombreDeCategoria(fiesta, p.category), p.concept, quien, decimal(c.previsto), c.contratado === null ? '' : decimal(c.contratado), decimal(c.pagado), decimal(c.falta)]
      .map(celda)
      .join(';')
  })
  // BOM: sin él Excel en Windows abre los acentos rotos.
  return `﻿${[cabecera, ...filas].join('\n')}\n`
}
