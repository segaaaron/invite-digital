import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, sessions, supportSessions, users } from '@/shared/db/schema'
import { drizzleSupportStore as store } from './drizzle-support-store'

/** Contra Postgres: lo que se prueba es que la sesión apunta y deja de apuntar en la base. */
const sufijo = crypto.randomUUID().slice(0, 8)
let adminId = ''
let clienteId = ''
let eventId = ''
let sessionId = ''

beforeAll(async () => {
  const [admin] = await db.insert(users).values({ email: `admin-soporte-${sufijo}@ejemplo.bo`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$cHJ1ZWJh$cHJ1ZWJh', role: 'admin' }).returning({ id: users.id })
  const [cliente] = await db.insert(users).values({ email: `cliente-soporte-${sufijo}@ejemplo.bo`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$cHJ1ZWJh$cHJ1ZWJh', role: 'cliente' }).returning({ id: users.id })
  adminId = admin!.id
  clienteId = cliente!.id
  const [evento] = await db
    .insert(events)
    .values({ slug: `soporte-${sufijo}`, title: 'Boda de soporte', eventDate: '2027-05-15', rsvpDeadline: '2027-04-30', locale: 'es', themeKey: 'boda-bot', status: 'draft', userId: adminId })
    .returning({ id: events.id })
  eventId = evento!.id
  const [sesion] = await db
    .insert(sessions)
    .values({ userId: adminId, tokenHash: Buffer.from(crypto.randomUUID().replaceAll('-', ''), 'hex'), expiresAt: new Date(Date.now() + 86_400_000) })
    .returning({ id: sessions.id })
  sessionId = sesion!.id
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(users).where(eq(users.id, clienteId))
  await db.delete(users).where(eq(users.id, adminId))
})

describe('drizzleSupportStore', () => {
  it('abre el modo soporte en la sesión, lo devuelve y al cerrarlo la sesión deja de apuntar', async () => {
    const id = await store.open({ sessionId, adminUserId: adminId, adminEmail: 'admin@x.bo', clientUserId: clienteId, eventId, reason: 'No carga la lista de invitados' })

    expect(await store.activeFor(sessionId)).toEqual({ id, adminEmail: 'admin@x.bo', clientUserId: clienteId, eventId })

    expect(await store.close(sessionId, new Date())).toBe(true)
    expect(await store.activeFor(sessionId)).toBeNull()
    const [fila] = await db.select({ soporte: sessions.supportSessionId }).from(sessions).where(eq(sessions.id, sessionId))
    expect(fila?.soporte).toBeNull()
    const [registro] = await db.select({ fin: supportSessions.endedAt, motivo: supportSessions.reason }).from(supportSessions).where(eq(supportSessions.id, id))
    expect(registro?.fin).not.toBeNull()
    expect(registro?.motivo).toBe('No carga la lista de invitados')

    // Cerrar dos veces no es un error: es pulsar dos veces.
    expect(await store.close(sessionId, new Date())).toBe(false)
  })

  it('abrir otro con uno abierto cierra el anterior: una sesión, un cliente a la vez', async () => {
    const primero = await store.open({ sessionId, adminUserId: adminId, adminEmail: 'admin@x.bo', clientUserId: clienteId, eventId, reason: 'Primera entrada de soporte' })
    const segundo = await store.open({ sessionId, adminUserId: adminId, adminEmail: 'admin@x.bo', clientUserId: clienteId, eventId, reason: 'Segunda entrada de soporte' })

    expect((await store.activeFor(sessionId))?.id).toBe(segundo)
    const [anterior] = await db.select({ fin: supportSessions.endedAt }).from(supportSessions).where(eq(supportSessions.id, primero))
    expect(anterior?.fin).not.toBeNull()
    await store.close(sessionId, new Date())
  })
})
