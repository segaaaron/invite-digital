import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, fundContributions, giftFunds, guestGroups, rsvpResponses } from '@/shared/db/schema'
import { createDrizzleRsvpRepository } from '@/modules/rsvp/infrastructure/drizzle-rsvp-repository'
import { createDrizzleEventRepository } from './drizzle-event-repository'

class RollbackForTest extends Error {}

async function inRolledBackTransaction(run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx)
      throw new RollbackForTest()
    })
  } catch (error) {
    if (!(error instanceof RollbackForTest)) throw error
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const seedEvent = async (tx: Tx, options: { eventDate: string; retentionDays: number }) => {
  const [row] = await tx
    .insert(events)
    .values({
      slug: `anon-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Evento a anonimizar',
      eventDate: options.eventDate,
      rsvpDeadline: options.eventDate,
      locale: 'es',
      themeKey: 'clasico',
      status: 'closed',
      retentionDays: options.retentionDays,
    })
    .returning({ id: events.id, slug: events.slug })
  return row!
}

const NOW = new Date('2026-08-19T12:00:00Z')

describe('anonimización', () => {
  it('lista solo los eventos cuya retención venció y no se anonimizaron', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const vencido = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      const vigente = await seedEvent(tx, { eventDate: '2026-08-15', retentionDays: 90 })
      const yaHecho = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      await tx.update(events).set({ anonymizedAt: NOW }).where(eq(events.id, yaHecho.id))

      const slugs = (await repo.listPendingAnonymization(NOW)).map((row) => row.slug)
      expect(slugs).toContain(vencido.slug)
      expect(slugs).not.toContain(vigente.slug)
      expect(slugs).not.toContain(yaHecho.slug)
    })
  })

  it('borra lo que identifica y conserva los agregados', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const rsvpRepo = createDrizzleRsvpRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })

      const [primero] = await tx
        .insert(guestGroups)
        .values({ eventId: evento.id, label: 'Familia Rojas Peña', seats: 4, tokenHash: Buffer.alloc(32, 11) })
        .returning({ id: guestGroups.id })
      await tx
        .insert(guestGroups)
        .values({ eventId: evento.id, label: 'Daniela Ortiz', seats: 1, tokenHash: Buffer.alloc(32, 12) })

      await tx.insert(rsvpResponses).values({ guestGroupId: primero!.id, attending: 3, message: 'Vamos tres, gracias' })

      const antes = await rsvpRepo.tallyRowsFor(evento.id)
      await repo.anonymize(evento.id, NOW)

      const grupos = await tx.select().from(guestGroups).where(eq(guestGroups.eventId, evento.id))
      expect(grupos.map((g) => g.label).sort()).toEqual(['Grupo 1', 'Grupo 2'])
      expect(grupos.map((g) => g.seats).sort()).toEqual([1, 4])

      const respuestas = await tx.select().from(rsvpResponses).where(eq(rsvpResponses.guestGroupId, primero!.id))
      expect(respuestas[0]?.message).toBeNull()
      expect(respuestas[0]?.attending).toBe(3)

      expect(await rsvpRepo.tallyRowsFor(evento.id)).toEqual(antes)

      const [fila] = await tx.select({ anonymizedAt: events.anonymizedAt }).from(events).where(eq(events.id, evento.id))
      expect(fila?.anonymizedAt).not.toBeNull()
    })
  })

  it('anonimiza quién contribuyó pero conserva los importes', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const evento = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })

      const [fondo] = await tx
        .insert(giftFunds)
        .values({ eventId: evento.id, name: 'Luna de miel', goalCents: 500_000 })
        .returning({ id: giftFunds.id })

      await tx.insert(fundContributions).values([
        {
          fundId: fondo!.id,
          displayName: 'Abuela Rosa Quiroga',
          amountCents: 15_000,
          method: 'envelope',
          message: 'Que sean muy felices, con todo mi cariño.',
        },
        {
          fundId: fondo!.id,
          displayName: 'Familia Vargas',
          amountCents: 25_000,
          method: 'transfer',
          message: null,
        },
      ])

      await repo.anonymize(evento.id, NOW)

      const filas = await tx.select().from(fundContributions).where(eq(fundContributions.fundId, fondo!.id))

      // El nombre y el mensaje son datos personales de terceros: gente que ni siquiera
      // está invitada, como la abuela del sobre.
      expect(filas.map((f) => f.displayName)).toEqual(['Anónimo', 'Anónimo'])
      expect(filas.map((f) => f.message)).toEqual([null, null])

      // Los importes se conservan: la contabilidad de la pareja no es un dato personal,
      // y borrarla dejaría el fondo descuadrado para siempre.
      expect(filas.map((f) => f.amountCents).sort((a, b) => a - b)).toEqual([15_000, 25_000])
    })
  })

  it('no toca las contribuciones de un evento que no se está anonimizando', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleEventRepository(tx)
      const vencido = await seedEvent(tx, { eventDate: '2026-01-01', retentionDays: 30 })
      const vigente = await seedEvent(tx, { eventDate: '2026-08-15', retentionDays: 90 })

      const [fondoAjeno] = await tx
        .insert(giftFunds)
        .values({ eventId: vigente.id, name: 'Fondo de la otra boda', goalCents: 100_000 })
        .returning({ id: giftFunds.id })
      await tx.insert(fundContributions).values({
        fundId: fondoAjeno!.id,
        displayName: 'Abuela Rosa Quiroga',
        amountCents: 15_000,
        method: 'envelope',
        message: 'Enhorabuena.',
      })

      await repo.anonymize(vencido.id, NOW)

      const [ajena] = await tx.select().from(fundContributions).where(eq(fundContributions.fundId, fondoAjeno!.id))
      expect(ajena?.displayName).toBe('Abuela Rosa Quiroga')
      expect(ajena?.message).toBe('Enhorabuena.')
    })
  })
})
