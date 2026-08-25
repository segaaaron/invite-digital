import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, reminderLog, rsvpResponses } from '@/shared/db/schema'
import { drizzleReminderRepository } from './drizzle-reminder-repository'

const eventId = crypto.randomUUID()
const otroEventId = crypto.randomUUID()
const grupo = crypto.randomUUID()
const grupoAjeno = crypto.randomUUID()

const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

const nuevoEvento = async (id: string, slug: string) => {
  await db.insert(events).values({
    id,
    slug,
    title: 'Boda de prueba',
    eventDate: '2026-10-18',
    rsvpDeadline: '2026-10-01',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
  })
}

beforeAll(async () => {
  await nuevoEvento(eventId, `recordatorios-${eventId.slice(0, 8)}`)
  await nuevoEvento(otroEventId, `recordatorios-otro-${otroEventId.slice(0, 8)}`)

  await db.insert(guestGroups).values([
    {
      id: grupo,
      eventId,
      label: 'Familia Rojas Peña',
      seats: 4,
      tokenHash: hash(),
      phone: '+59170011122',
      invitationSentAt: new Date('2026-09-15T00:00:00.000Z'),
      openedAt: new Date('2026-09-15T01:00:00.000Z'),
    },
    { id: grupoAjeno, eventId: otroEventId, label: 'De otra boda', seats: 2, tokenHash: hash() },
  ])
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroEventId))
})

describe('drizzleReminderRepository', () => {
  it('trae los grupos del evento con lo último que se sabe de cada uno', async () => {
    const filas = await drizzleReminderRepository.listCandidates(eventId)

    expect(filas.map((f) => f.id)).toEqual([grupo])
    expect(filas[0]).toMatchObject({
      label: 'Familia Rojas Peña',
      phone: '+59170011122',
      revoked: false,
      respondedAt: null,
      lastRemindedAt: {},
    })
  })

  it('la última respuesta del grupo es la que sale, no la primera', async () => {
    await db.insert(rsvpResponses).values([
      { guestGroupId: grupo, attending: 2, respondedAt: new Date('2026-09-18T00:00:00.000Z') },
      { guestGroupId: grupo, attending: 4, respondedAt: new Date('2026-09-20T00:00:00.000Z') },
    ])

    const [fila] = await drizzleReminderRepository.listCandidates(eventId)

    expect(fila?.respondedAt?.toISOString()).toBe('2026-09-20T00:00:00.000Z')

    await db.delete(rsvpResponses).where(eq(rsvpResponses.guestGroupId, grupo))
  })

  it('el último recordatorio va por motivo, y es el más reciente de cada uno', async () => {
    await drizzleReminderRepository.logReminder(grupo, 'sin_respuesta', new Date('2026-09-19T00:00:00.000Z'))
    await drizzleReminderRepository.logReminder(grupo, 'sin_respuesta', new Date('2026-09-22T00:00:00.000Z'))
    await drizzleReminderRepository.logReminder(grupo, 'sin_abrir', new Date('2026-09-17T00:00:00.000Z'))

    const [fila] = await drizzleReminderRepository.listCandidates(eventId)

    expect(fila?.lastRemindedAt.sin_respuesta?.toISOString()).toBe('2026-09-22T00:00:00.000Z')
    expect(fila?.lastRemindedAt.sin_abrir?.toISOString()).toBe('2026-09-17T00:00:00.000Z')
    // Y el grupo sigue saliendo una sola vez: unir dos agregaciones contra la misma
    // tabla multiplicaría las filas, y la cola enseñaría el mismo grupo tres veces.
    expect(await drizzleReminderRepository.listCandidates(eventId)).toHaveLength(1)

    await db.delete(reminderLog).where(eq(reminderLog.guestGroupId, grupo))
  })

  it('borrar el grupo se lleva su registro de recordatorios', async () => {
    const suelto = crypto.randomUUID()
    await db.insert(guestGroups).values({ id: suelto, eventId, label: 'Suelto', seats: 2, tokenHash: hash() })
    await drizzleReminderRepository.logReminder(suelto, 'sin_abrir', new Date())

    await db.delete(guestGroups).where(eq(guestGroups.id, suelto))

    expect(await db.select().from(reminderLog).where(eq(reminderLog.guestGroupId, suelto))).toEqual([])
  })

  it('dice de qué evento es un grupo, y nada de un grupo que no existe', async () => {
    expect(await drizzleReminderRepository.findGroupEvent(grupo)).toEqual({ eventId })
    expect(await drizzleReminderRepository.findGroupEvent(grupoAjeno)).toEqual({ eventId: otroEventId })
    expect(await drizzleReminderRepository.findGroupEvent(crypto.randomUUID())).toBeNull()
  })
})
