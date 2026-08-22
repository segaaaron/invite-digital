import { and, asc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { fundContributions, giftFunds, gifts, guestGroups } from '@/shared/db/schema'
import { CONTRIBUTION_METHODS, type Contribution, type ContributionMethod, type Fund } from '../domain/fund'
import { GIFT_STATUSES, type Gift, type GiftStatus } from '../domain/gift'
import type { GiftRow, RegistryRepository } from '../application/ports'

/**
 * El estado y la forma de pago viven en la base como `varchar`. Al leer se comprueban
 * contra la lista que el dominio conoce: una fila escrita a mano con un estado inventado
 * cae al valor por defecto en vez de romper la pantalla entera.
 */
const toStatus = (value: string): GiftStatus =>
  (GIFT_STATUSES as readonly string[]).includes(value) ? (value as GiftStatus) : 'available'

const toMethod = (value: string): ContributionMethod =>
  (CONTRIBUTION_METHODS as readonly string[]).includes(value) ? (value as ContributionMethod) : 'other'

const giftColumns = {
  id: gifts.id,
  eventId: gifts.eventId,
  name: gifts.name,
  priceCents: gifts.priceCents,
  store: gifts.store,
  url: gifts.url,
  status: gifts.status,
  claimedByGroupId: gifts.claimedByGroupId,
  claimedAt: gifts.claimedAt,
}

type RawGift = {
  id: string
  eventId: string
  name: string
  priceCents: number
  store: string | null
  url: string | null
  status: string
  claimedByGroupId: string | null
  claimedAt: Date | null
}

const toGift = (r: RawGift): Gift => ({ ...r, status: toStatus(r.status) })

export const createDrizzleRegistryRepository = (database: DbExecutor): RegistryRepository => ({
  async listGifts(eventId): Promise<GiftRow[]> {
    const rows = await database
      .select({ ...giftColumns, claimedByLabel: guestGroups.label })
      .from(gifts)
      // Left join, no inner: el regalo sin reservar tiene que salir igual, y el que
      // reservó un grupo ya borrado también.
      .leftJoin(guestGroups, eq(guestGroups.id, gifts.claimedByGroupId))
      .where(eq(gifts.eventId, eventId))
      .orderBy(asc(gifts.createdAt))

    return rows.map((r) => ({ ...toGift(r), claimedByLabel: r.claimedByLabel }))
  },

  async findGift(id) {
    const [row] = await database.select(giftColumns).from(gifts).where(eq(gifts.id, id)).limit(1)
    return row ? toGift(row) : null
  },

  async insertGift(gift) {
    await database.insert(gifts).values(gift)
  },

  async updateGift(gift) {
    await database
      .update(gifts)
      .set({
        name: gift.name,
        priceCents: gift.priceCents,
        store: gift.store,
        url: gift.url,
        status: gift.status,
        claimedByGroupId: gift.claimedByGroupId,
        claimedAt: gift.claimedAt,
      })
      .where(eq(gifts.id, gift.id))
  },

  async deleteGift(id) {
    await database.delete(gifts).where(eq(gifts.id, id))
  },

  /**
   * **Aquí se resuelve la carrera.** Un solo `UPDATE ... WHERE id = $1 AND status =
   * 'available' RETURNING id`: Postgres bloquea la fila mientras la actualiza, así que de
   * dos reservas simultáneas exactamente una encuentra el estado `available` y la otra no
   * afecta a ninguna fila.
   *
   * Nada de `SELECT` y luego `UPDATE`: entre las dos consultas caben las dos reservas, y
   * eso no se ve nunca en desarrollo —hace falta gente real pulsando a la vez.
   *
   * El instante lo pone la base con `now()`, no el proceso: dos servidores con el reloj
   * desincronizado escribirían dos verdades distintas sobre cuándo se apartó el regalo.
   */
  async claimIfAvailable(giftId, groupId) {
    const rows = await database
      .update(gifts)
      .set({ status: 'reserved', claimedByGroupId: groupId, claimedAt: new Date() })
      .where(and(eq(gifts.id, giftId), eq(gifts.status, 'available')))
      .returning({ id: gifts.id })

    return rows.length > 0
  },

  /** Igual, con el dueño en el `WHERE`: soltar exige haber sido quien reservó. */
  async releaseIfOwner(giftId, groupId) {
    const rows = await database
      .update(gifts)
      .set({ status: 'available', claimedByGroupId: null, claimedAt: null })
      .where(
        and(eq(gifts.id, giftId), eq(gifts.status, 'reserved'), eq(gifts.claimedByGroupId, groupId)),
      )
      .returning({ id: gifts.id })

    return rows.length > 0
  },

  async listFunds(eventId): Promise<Fund[]> {
    return database.select().from(giftFunds).where(eq(giftFunds.eventId, eventId)).orderBy(asc(giftFunds.createdAt))
  },

  async findFund(id) {
    const [row] = await database.select().from(giftFunds).where(eq(giftFunds.id, id)).limit(1)
    return row ?? null
  },

  async insertFund(fund) {
    await database.insert(giftFunds).values(fund)
  },

  async updateFund(fund) {
    await database
      .update(giftFunds)
      .set({ name: fund.name, description: fund.description, goalCents: fund.goalCents })
      .where(eq(giftFunds.id, fund.id))
  },

  async deleteFund(id) {
    // El `ON DELETE CASCADE` de `fund_contributions.fund_id` se lleva las aportaciones.
    // Borrarlas aquí a mano sería una segunda verdad que puede desincronizarse de la
    // restricción.
    await database.delete(giftFunds).where(eq(giftFunds.id, id))
  },

  async listContributions(fundId): Promise<Contribution[]> {
    const rows = await database
      .select()
      .from(fundContributions)
      .where(eq(fundContributions.fundId, fundId))
      .orderBy(asc(fundContributions.createdAt))

    return rows.map((r) => ({
      id: r.id,
      fundId: r.fundId,
      guestGroupId: r.guestGroupId,
      displayName: r.displayName,
      amountCents: r.amountCents,
      method: toMethod(r.method),
      message: r.message,
      createdAt: r.createdAt,
    }))
  },

  async insertContribution(contribution) {
    await database.insert(fundContributions).values(contribution)
  },
})

export const drizzleRegistryRepository = createDrizzleRegistryRepository(db)
