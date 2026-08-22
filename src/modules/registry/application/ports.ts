import type { Contribution, Fund } from '../domain/fund'
import type { Gift } from '../domain/gift'

/**
 * El regalo tal y como lo lee el panel: además del regalo, la etiqueta del grupo que lo
 * reservó. Se resuelve en la consulta y no en la pantalla para no hacer una lectura por
 * fila desde la página.
 */
export type GiftRow = Gift & { readonly claimedByLabel: string | null }

export interface RegistryRepository {
  listGifts(eventId: string): Promise<GiftRow[]>
  findGift(id: string): Promise<Gift | null>
  insertGift(gift: Gift): Promise<void>
  updateGift(gift: Gift): Promise<void>
  deleteGift(id: string): Promise<void>

  /**
   * Devuelve **un booleano, no el regalo**: la decisión de quién se queda la cafetera la
   * toma la base con un `UPDATE ... WHERE status = 'available'`, y aquí solo se
   * interpreta si esta llamada ganó la carrera o llegó tarde. Devolver el objeto
   * invitaría a comprobar antes con un SELECT, y entre las dos consultas caben las dos
   * reservas.
   */
  claimIfAvailable(giftId: string, groupId: string): Promise<boolean>
  /** Igual, pero exigiendo además ser quien lo reservó. */
  releaseIfOwner(giftId: string, groupId: string): Promise<boolean>

  listFunds(eventId: string): Promise<Fund[]>
  findFund(id: string): Promise<Fund | null>
  insertFund(fund: Fund): Promise<void>
  updateFund(fund: Fund): Promise<void>
  /** El `ON DELETE CASCADE` de la base se lleva también sus contribuciones. */
  deleteFund(id: string): Promise<void>

  listContributions(fundId: string): Promise<Contribution[]>
  insertContribution(contribution: Contribution): Promise<void>
}
