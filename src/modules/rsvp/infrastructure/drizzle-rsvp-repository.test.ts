import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, rsvpResponses } from '@/shared/db/schema'
import { eq } from 'drizzle-orm'
import { createDrizzleRsvpRepository } from './drizzle-rsvp-repository'

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

const seedEvent = async (tx: Tx) => {
  const [row] = await tx
    .insert(events)
    .values({
      slug: `rsvp-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Evento de prueba',
      eventDate: '2026-12-05',
      rsvpDeadline: '2026-11-20',
      locale: 'es',
      themeKey: 'clasico',
      status: 'live',
    })
    .returning({ id: events.id })
  return row!.id
}

const seedGroup = async (tx: Tx, eventId: string, seats: number, hashByte: number) => {
  const [row] = await tx
    .insert(guestGroups)
    .values({ eventId, label: `Grupo ${hashByte}`, seats, tokenHash: Buffer.alloc(32, hashByte) })
    .returning({ id: guestGroups.id })
  return row!.id
}

describe('repositorio de RSVP', () => {
  it('anexa sin borrar y devuelve la respuesta más reciente', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleRsvpRepository(tx)
      const groupId = await seedGroup(tx, await seedEvent(tx), 4, 1)

      await repo.append({
        id: crypto.randomUUID(),
        guestGroupId: groupId,
        attending: 3,
        message: null,
        respondedAt: new Date('2026-10-01T12:00:00Z'),
      })
      await repo.append({
        id: crypto.randomUUID(),
        guestGroupId: groupId,
        attending: 2,
        message: 'Al final somos dos',
        respondedAt: new Date('2026-10-05T12:00:00Z'),
      })

      const filas = await tx.select().from(rsvpResponses).where(eq(rsvpResponses.guestGroupId, groupId))
      expect(filas).toHaveLength(2)

      const ultima = await repo.latestFor(groupId)
      expect(ultima?.attending).toBe(2)
      expect(ultima?.message).toBe('Al final somos dos')
    })
  })

  it('cuenta con null los grupos que no respondieron y excluye los revocados', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleRsvpRepository(tx)
      const eventId = await seedEvent(tx)

      const conRespuesta = await seedGroup(tx, eventId, 4, 2)
      await seedGroup(tx, eventId, 2, 3)
      const revocado = await seedGroup(tx, eventId, 5, 4)
      await tx.update(guestGroups).set({ revokedAt: new Date() }).where(eq(guestGroups.id, revocado))

      await repo.append({
        id: crypto.randomUUID(),
        guestGroupId: conRespuesta,
        attending: 3,
        message: null,
        respondedAt: new Date('2026-10-01T12:00:00Z'),
      })

      const filas = await repo.tallyRowsFor(eventId)
      expect(filas).toHaveLength(2)
      expect(filas.find((f) => f.seats === 4)?.attending).toBe(3)
      expect(filas.find((f) => f.seats === 2)?.attending).toBeNull()
    })
  })

  it('devuelve null cuando el grupo nunca respondió', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleRsvpRepository(tx)
      const groupId = await seedGroup(tx, await seedEvent(tx), 3, 5)
      expect(await repo.latestFor(groupId)).toBeNull()
    })
  })
})

describe('respondedAtsFor', () => {
  it('devuelve solo las respuestas del evento y desde la fecha pedida', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleRsvpRepository(tx)
      const eventoA = await seedEvent(tx)
      const eventoB = await seedEvent(tx)
      const grupoA = await seedGroup(tx, eventoA, 2, 41)
      const grupoB = await seedGroup(tx, eventoB, 2, 42)

      const responder = (guestGroupId: string, iso: string) =>
        repo.append({ id: crypto.randomUUID(), guestGroupId, attending: 2, message: null, respondedAt: new Date(iso) })

      await responder(grupoA, '2026-08-01T12:00:00Z')
      await responder(grupoA, '2026-08-20T12:00:00Z')
      await responder(grupoA, '2026-08-21T12:00:00Z')
      // Otro evento: no debe colarse en el gráfico de este.
      await responder(grupoB, '2026-08-21T12:00:00Z')

      const fechas = await repo.respondedAtsFor(eventoA, new Date('2026-08-10T00:00:00Z'))
      expect(fechas).toHaveLength(2)
      expect(fechas.every((f) => f instanceof Date)).toBe(true)
    })
  })

  it('un grupo revocado deja de contar, como en el recuento', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleRsvpRepository(tx)
      const eventoId = await seedEvent(tx)
      const grupoId = await seedGroup(tx, eventoId, 2, 43)
      await repo.append({
        id: crypto.randomUUID(),
        guestGroupId: grupoId,
        attending: 2,
        message: null,
        respondedAt: new Date('2026-08-20T12:00:00Z'),
      })
      await tx.update(guestGroups).set({ revokedAt: new Date() }).where(eq(guestGroups.id, grupoId))

      expect(await repo.respondedAtsFor(eventoId, new Date('2026-08-01T00:00:00Z'))).toEqual([])
    })
  })
})
