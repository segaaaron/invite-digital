import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { eq, inArray, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from './client'
import { events, guestGroups, guestPeople, rsvpResponses } from './schema'

/**
 * `0052`: una invitación nunca queda vacía. Contra Postgres y dentro de una transacción que
 * se deshace: la migración recorre la tabla entera y no puede llevarse los datos de las
 * pruebas que corren a la vez.
 */
class Deshacer extends Error {}

const MIGRACION = readFileSync(join(process.cwd(), 'db/migrations/0052_invitaciones_sin_vacias.sql'), 'utf8')
const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

describe('0052_invitaciones_sin_vacias', () => {
  it('borra la vacía que nunca salió, y a la que ya salió le pone su invitado; aplicarla dos veces no cambia nada', async () => {
    await db
      .transaction(async (tx) => {
        const [evento] = await tx
          .insert(events)
          .values({ slug: `vacias-${crypto.randomUUID().slice(0, 8)}`, title: 'Vacías', eventDate: '2027-05-15', rsvpDeadline: '2027-05-01', locale: 'es', themeKey: 'clasico', status: 'live' })
          .returning({ id: events.id })
        const eventId = evento!.id
        const [nuncaSalio, repartida, respondio, conGente] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
        await tx.insert(guestGroups).values([
          { id: nuncaSalio, eventId, label: 'Yasmin', seats: 1, tokenHash: hash() },
          { id: repartida, eventId, label: 'amigo', seats: 2, tokenHash: hash(), invitationSentAt: new Date() },
          { id: respondio, eventId, label: 'Familia Rojas', seats: 4, tokenHash: hash() },
          { id: conGente, eventId, label: 'Ana', seats: 1, tokenHash: hash() },
        ])
        await tx.insert(rsvpResponses).values({ guestGroupId: respondio, attending: 2 })
        await tx.insert(guestPeople).values({ guestGroupId: conGente, fullName: 'Ana' })

        await tx.execute(sql.raw(MIGRACION))
        await tx.execute(sql.raw(MIGRACION))

        const quedan = await tx.select({ id: guestGroups.id }).from(guestGroups).where(eq(guestGroups.eventId, eventId))
        expect(quedan.map((g) => g.id).sort()).toEqual([repartida, respondio, conGente].sort())

        const gente = await tx
          .select({ grupo: guestPeople.guestGroupId, nombre: guestPeople.fullName, acompanante: guestPeople.isCompanion })
          .from(guestPeople)
          .where(inArray(guestPeople.guestGroupId, [repartida, respondio, conGente]))
        expect(gente).toHaveLength(3)
        expect(gente).toEqual(expect.arrayContaining([
          { grupo: conGente, nombre: 'Ana', acompanante: false },
          { grupo: repartida, nombre: 'amigo', acompanante: false },
          { grupo: respondio, nombre: 'Familia Rojas', acompanante: false },
        ]))
        throw new Deshacer()
      })
      .catch((e: unknown) => {
        if (!(e instanceof Deshacer)) throw e
      })
  })
})
