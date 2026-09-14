import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, users } from '@/shared/db/schema'
import { drizzleAdminRepository as repo } from './drizzle-admin-repository'

const correo = `admin-e2e-${crypto.randomUUID().slice(0, 8)}@ejemplo.bo`
let userId = ''
const slug = `admin-repo-${crypto.randomUUID().slice(0, 8)}`

const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

beforeAll(async () => {
  const [usuario] = await db
    .insert(users)
    .values({ email: correo, passwordHash: '$argon2id$v=19$falso', role: 'atelier' })
    .returning({ id: users.id })
  userId = usuario!.id

  const [evento] = await db
    .insert(events)
    .values({
      userId,
      slug,
      title: 'Boda del recuento',
      eventDate: '2027-04-10',
      rsvpDeadline: '2027-03-20',
      locale: 'es',
      themeKey: 'clasico',
      status: 'live',
    })
    .returning({ id: events.id })

  await db.insert(guestGroups).values([
    { eventId: evento!.id, label: 'Grupo uno', seats: 2, tokenHash: hash() },
    { eventId: evento!.id, label: 'Grupo dos', seats: 4, tokenHash: hash() },
  ])
})

afterAll(async () => {
  await db.delete(events).where(eq(events.slug, slug))
  await db.delete(users).where(eq(users.id, userId))
})

describe('drizzleAdminRepository · los recuentos correlacionados', () => {
  /**
   * Estas dos pruebas existen por un fallo que no daba error y no vio el typecheck:
   * Drizzle emite `${users.id}` como `"id"` a secas, y dentro de la subconsulta `"id"` es
   * la columna de la tabla de dentro. La condición se convertía en
   * `events.user_id = events.id` y **contaba cero para todo el mundo**.
   */
  it('cuenta los eventos de cada usuario, no cero', async () => {
    const usuarios = await repo.listUsers()
    const mio = usuarios.find((u) => u.email === correo)

    expect(mio?.eventos).toBe(1)
  })

  it('y también al pedir un usuario suelto', async () => {
    const uno = await repo.findUserById(userId)

    expect(uno?.eventos).toBe(1)
  })

  it('asigna, lee y quita el plan que compró el usuario', async () => {
    await repo.setUserPlan(userId, 'firma-3d')
    expect((await repo.findUserById(userId))?.planSlug).toBe('firma-3d')
    expect((await repo.listUsers()).find((u) => u.id === userId)?.planSlug).toBe('firma-3d')

    await repo.setUserPlan(userId, null)
    expect((await repo.findUserById(userId))?.planSlug).toBeNull()
  })

  it('cuenta los grupos de cada evento, no cero', async () => {
    const eventos = await repo.listEvents()
    const mio = eventos.find((e) => e.slug === slug)

    expect(mio?.grupos).toBe(2)
    // Ninguno repartido ni contestado todavía: la cartera los pinta como «Repartiendo».
    expect(mio?.enviados).toBe(0)
    expect(mio?.respondidos).toBe(0)
    expect(mio?.ownerEmail).toBe(correo)
  })
})
