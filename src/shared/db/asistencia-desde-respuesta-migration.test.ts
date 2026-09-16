import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inArray, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from './client'
import { events, guestGroups, guestPeople, rsvpResponses } from './schema'

/**
 * `0053`: las invitaciones confirmadas por el formulario simple dejaron a sus personas en
 * «Pendiente». Se marcan con lo que se sabe seguro; lo demás no se inventa. Dentro de una
 * transacción que se deshace, porque recorre la tabla entera.
 */
class Deshacer extends Error {}

const MIGRACION = readFileSync(join(process.cwd(), 'db/migrations/0053_asistencia_desde_la_respuesta.sql'), 'utf8')
const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

describe('0053_asistencia_desde_la_respuesta', () => {
  it('sí de todos → asistirán; no → no; menos que las personas → sin tocar; lo ya marcado se respeta', async () => {
    await db
      .transaction(async (tx) => {
        const [evento] = await tx
          .insert(events)
          .values({ slug: `asist-${crypto.randomUUID().slice(0, 8)}`, title: 'Asistencia', eventDate: '2027-05-15', rsvpDeadline: '2027-05-01', locale: 'es', themeKey: 'clasico', status: 'live' })
          .returning({ id: events.id })
        const [si, no, parcial, marcada] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
        await tx.insert(guestGroups).values(
          [si, no, parcial, marcada].map((id, i) => ({ id, eventId: evento!.id, label: `G${i}`, seats: 3, tokenHash: hash() })),
        )
        await tx.insert(guestPeople).values([
          { guestGroupId: si, fullName: 'Yasmin' },
          { guestGroupId: no, fullName: 'Luis' },
          { guestGroupId: parcial, fullName: 'Ana' },
          { guestGroupId: parcial, fullName: 'Pedro' },
          { guestGroupId: marcada, fullName: 'Rosa', attending: 'no' },
        ])
        await tx.insert(rsvpResponses).values([
          { guestGroupId: si, attending: 1 },
          { guestGroupId: no, attending: 0 },
          { guestGroupId: parcial, attending: 1 },
          { guestGroupId: marcada, attending: 1 },
        ])

        await tx.execute(sql.raw(MIGRACION))
        await tx.execute(sql.raw(MIGRACION))

        const filas = await tx
          .select({ nombre: guestPeople.fullName, asistencia: guestPeople.attending })
          .from(guestPeople)
          .where(inArray(guestPeople.guestGroupId, [si, no, parcial, marcada]))
        expect(Object.fromEntries(filas.map((f) => [f.nombre, f.asistencia]))).toEqual({
          Yasmin: 'yes',
          Luis: 'no',
          Ana: null,
          Pedro: null,
          Rosa: 'no',
        })
        throw new Deshacer()
      })
      .catch((e: unknown) => {
        if (!(e instanceof Deshacer)) throw e
      })
  })
})
