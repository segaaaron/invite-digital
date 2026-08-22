import type { Contribution, Fund } from '../domain/fund'
import type { Gift } from '../domain/gift'
import type { GiftRow, RegistryRepository } from './ports'

export type FakeRegistry = {
  repo: RegistryRepository
  gifts: Gift[]
  funds: Fund[]
  contributions: Contribution[]
  /** Etiquetas de grupo, para que `listGifts` pueda decir quién reservó qué. */
  labels: Map<string, string>
}

/**
 * Repositorio en memoria con el mismo contrato que el de Postgres. Lo importante es que
 * `claimIfAvailable` y `releaseIfOwner` deciden aquí igual que allí: comprobando y
 * escribiendo en el mismo paso. Un falso que hiciera un SELECT y luego un UPDATE
 * describiría un mundo distinto del que la base acepta, y la carrera solo se vería en
 * producción.
 */
export const fakeRegistryRepository = (initial: {
  gifts?: Gift[]
  funds?: Fund[]
  contributions?: Contribution[]
  labels?: Map<string, string>
}): FakeRegistry => {
  const gifts = [...(initial.gifts ?? [])]
  const funds = [...(initial.funds ?? [])]
  const contributions = [...(initial.contributions ?? [])]
  const labels = initial.labels ?? new Map<string, string>()

  const repo: RegistryRepository = {
    async listGifts(eventId): Promise<GiftRow[]> {
      return gifts
        .filter((g) => g.eventId === eventId)
        .map((g) => ({ ...g, claimedByLabel: g.claimedByGroupId === null ? null : (labels.get(g.claimedByGroupId) ?? null) }))
    },
    async findGift(id) {
      return gifts.find((g) => g.id === id) ?? null
    },
    async insertGift(gift) {
      gifts.push(gift)
    },
    async updateGift(gift) {
      const i = gifts.findIndex((g) => g.id === gift.id)
      if (i >= 0) gifts[i] = gift
    },
    async deleteGift(id) {
      const i = gifts.findIndex((g) => g.id === id)
      if (i >= 0) gifts.splice(i, 1)
    },

    async claimIfAvailable(giftId, groupId) {
      const i = gifts.findIndex((g) => g.id === giftId && g.status === 'available')
      const gift = gifts[i]
      if (!gift) return false
      gifts[i] = { ...gift, status: 'reserved', claimedByGroupId: groupId, claimedAt: new Date() }
      return true
    },

    async releaseIfOwner(giftId, groupId) {
      const i = gifts.findIndex((g) => g.id === giftId && g.status === 'reserved' && g.claimedByGroupId === groupId)
      const gift = gifts[i]
      if (!gift) return false
      gifts[i] = { ...gift, status: 'available', claimedByGroupId: null, claimedAt: null }
      return true
    },

    async listFunds(eventId) {
      return funds.filter((f) => f.eventId === eventId)
    },
    async findFund(id) {
      return funds.find((f) => f.id === id) ?? null
    },
    async insertFund(fund) {
      funds.push(fund)
    },
    async updateFund(fund) {
      const i = funds.findIndex((f) => f.id === fund.id)
      if (i >= 0) funds[i] = fund
    },
    async deleteFund(id) {
      const i = funds.findIndex((f) => f.id === id)
      if (i >= 0) funds.splice(i, 1)
      // El equivalente del ON DELETE CASCADE.
      for (let k = contributions.length - 1; k >= 0; k -= 1) {
        if (contributions[k]?.fundId === id) contributions.splice(k, 1)
      }
    },

    async listContributions(fundId) {
      return contributions.filter((c) => c.fundId === fundId)
    },
    async insertContribution(contribution) {
      contributions.push(contribution)
    },
  }

  return { repo, gifts, funds, contributions, labels }
}
