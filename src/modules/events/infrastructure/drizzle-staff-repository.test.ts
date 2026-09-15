import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { eventStaff, events, users } from '@/shared/db/schema'
import { drizzleStaffRepository as repo } from './drizzle-staff-repository'

const sufijo = crypto.randomUUID().slice(0, 8)
const ids: { eventos: string[]; usuarios: string[] } = { eventos: [], usuarios: [] }

beforeAll(async () => {
  const nuevo = async (email: string) => (await db.insert(users).values({ email: `${email}-${sufijo}@ejemplo.bo`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$cHJ1ZWJh$cHJ1ZWJh', role: 'cliente' }).returning({ id: users.id }))[0]!.id
  const [dueno, ana, beto, portero] = [await nuevo('dueno'), await nuevo('ana'), await nuevo('beto'), await nuevo('portero')]
  ids.usuarios.push(dueno, ana, beto, portero)
  for (const n of [1, 2, 3]) {
    const [e] = await db
      .insert(events)
      .values({ slug: `staff-${n}-${sufijo}`, title: 'Boda', eventDate: '2027-05-15', rsvpDeadline: '2027-04-30', locale: 'es', themeKey: 'boda-bot', status: 'draft', userId: dueno })
      .returning({ id: events.id })
    ids.eventos.push(e!.id)
  }
  await db.insert(eventStaff).values([
    { eventId: ids.eventos[0]!, userId: ana, membership: 'cliente' },
    { eventId: ids.eventos[0]!, userId: beto, membership: 'cliente' },
    { eventId: ids.eventos[0]!, userId: portero, membership: 'puerta' },
    { eventId: ids.eventos[1]!, userId: beto, membership: 'coanfitrion' },
  ])
})

afterAll(async () => {
  await db.delete(events).where(inArray(events.id, ids.eventos))
  for (const id of ids.usuarios) await db.delete(users).where(eq(users.id, id))
})

describe('drizzleStaffRepository', () => {
  it('los anfitriones de varias bodas en una sola consulta, sin co-anfitriones ni puerta', async () => {
    const anfitriones = await repo.hostsOf(ids.eventos)
    expect(anfitriones.get(ids.eventos[0]!)?.map((a) => a.email)).toEqual([`ana-${sufijo}@ejemplo.bo`, `beto-${sufijo}@ejemplo.bo`])
    expect(anfitriones.get(ids.eventos[1]!)).toBeUndefined()
    expect((await repo.hostsOf([])).size).toBe(0)
  })

  it('cuenta la pertenencia de una clase', async () => {
    expect(await repo.countOf(ids.eventos[0]!, 'cliente')).toBe(2)
    expect(await repo.countOf(ids.eventos[2]!, 'cliente')).toBe(0)
  })
})
