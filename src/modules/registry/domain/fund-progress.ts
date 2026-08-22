import type { Contribution, Fund } from './fund'

export type FundProgress = {
  readonly raisedCents: number
  readonly goalCents: number
  /** De 0 a 100, **recortado**. Nunca 140. */
  readonly percent: number
  readonly exceeded: boolean
}

/**
 * El porcentaje se recorta al 100 porque una barra al 140 % se sale de su contenedor y
 * el diseño se rompe. Que la meta se haya superado se dice con palabras —`exceeded`—, no
 * deformando la barra.
 *
 * Se redondea hacia abajo, no al más cercano: un 99,6 % redondeado daría 100 y la barra
 * mentiría diciendo que la meta ya está cumplida cuando aún faltan cuarenta centavos.
 * Solo se muestra 100 cuando de verdad se llegó.
 */
export const progressOf = (fund: Fund, contributions: readonly Contribution[]): FundProgress => {
  const raisedCents = contributions.reduce((total, c) => total + c.amountCents, 0)
  const exceeded = raisedCents > fund.goalCents
  const percent = Math.min(100, Math.floor((raisedCents / fund.goalCents) * 100))

  return { raisedCents, goalCents: fund.goalCents, percent, exceeded }
}
