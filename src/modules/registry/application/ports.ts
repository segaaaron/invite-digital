import type { Contribution, Fund } from '../domain/fund'
import type { FormasDeRegalar } from '../domain/formas-de-regalar'
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

/** La imagen del QR del banco, tal cual la subió el cliente (ya comprobada por sus bytes). */
export type ImagenDeQr = { readonly bytes: Uint8Array; readonly tipo: string }

/**
 * Las formas de regalar (`event_gift_ways`). Puerto aparte del de la lista: son otra tabla y
 * otro formulario, y el doble de pruebas de la lista no tiene por qué saber de ellas.
 */
export interface FormasDeRegalarStore {
  leer(eventId: string): Promise<FormasDeRegalar>
  /** `qr`: una imagen nueva, `'quitar'` para borrarla o `'mantener'` para no tocarla. */
  guardar(
    eventId: string,
    formas: Omit<FormasDeRegalar, 'tieneQr'>,
    qr: ImagenDeQr | 'quitar' | 'mantener',
  ): Promise<void>
  qr(eventId: string): Promise<ImagenDeQr | null>
}
