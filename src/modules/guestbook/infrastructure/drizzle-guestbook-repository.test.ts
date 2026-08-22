import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, messageNotes, rsvpResponses } from '@/shared/db/schema'
import { drizzleGuestbookRepository } from './drizzle-guestbook-repository'

const eventId = crypto.randomUUID()
const otroEventId = crypto.randomUUID()
const grupo = crypto.randomUUID()
const otroGrupo = crypto.randomUUID()

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

const nuevaRespuesta = async (input: {
  id?: string
  guestGroupId?: string
  message: string | null
  respondedAt?: Date
}): Promise<string> => {
  const id = input.id ?? crypto.randomUUID()
  await db.insert(rsvpResponses).values({
    id,
    guestGroupId: input.guestGroupId ?? grupo,
    attending: 2,
    message: input.message,
    respondedAt: input.respondedAt ?? new Date('2026-08-20T10:00:00.000Z'),
  })
  return id
}

beforeAll(async () => {
  await nuevoEvento(eventId, `firmas-${eventId.slice(0, 8)}`)
  await nuevoEvento(otroEventId, `firmas-otro-${otroEventId.slice(0, 8)}`)
  await db.insert(guestGroups).values({ id: grupo, eventId, label: 'Familia Rojas', seats: 4, tokenHash: hash() })
  await db
    .insert(guestGroups)
    .values({ id: otroGrupo, eventId: otroEventId, label: 'Familia Ajena', seats: 2, tokenHash: hash() })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroEventId))
})

describe('listMessages', () => {
  it('devuelve un mensaje recién escrito que todavía NO tiene nota', async () => {
    // Esta es la prueba que vigila el fallo silencioso de la rebanada: con `innerJoin`
    // solo saldrían los mensajes que ya tienen nota —es decir, ninguno nuevo, jamás—,
    // todo compilaría, y la bandeja estaría vacía para siempre sin un solo error.
    const id = await nuevaRespuesta({ message: 'Qué ganas de celebrar con ustedes.' })

    const filas = await drizzleGuestbookRepository.listMessages(eventId)
    const fila = filas.find((f) => f.responseId === id)

    expect(fila).toBeDefined()
    expect(fila?.body).toBe('Qué ganas de celebrar con ustedes.')
    expect(fila?.groupLabel).toBe('Familia Rojas')
    expect(fila?.readAt).toBeNull()
    expect(fila?.featuredAt).toBeNull()
    expect(fila?.reply).toBeNull()

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, id))
  })

  it('devuelve el estado de la nota cuando ya existe', async () => {
    const id = await nuevaRespuesta({ message: 'Felicidades a los dos.' })
    await drizzleGuestbookRepository.upsertNote(id, { readAt: new Date('2026-08-21T09:00:00.000Z') })
    await drizzleGuestbookRepository.upsertNote(id, { reply: 'Gracias', repliedAt: new Date('2026-08-21T10:00:00.000Z') })

    const fila = (await drizzleGuestbookRepository.listMessages(eventId)).find((f) => f.responseId === id)
    expect(fila?.readAt).toEqual(new Date('2026-08-21T09:00:00.000Z'))
    expect(fila?.reply).toBe('Gracias')

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, id))
  })

  it('una respuesta con message nulo no aparece en la lista', async () => {
    const id = await nuevaRespuesta({ message: null })

    const filas = await drizzleGuestbookRepository.listMessages(eventId)
    expect(filas.map((f) => f.responseId)).not.toContain(id)

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, id))
  })

  it('no devuelve los mensajes de otro evento', async () => {
    const ajeno = await nuevaRespuesta({ guestGroupId: otroGrupo, message: 'Soy de otra boda.' })

    const filas = await drizzleGuestbookRepository.listMessages(eventId)
    expect(filas.map((f) => f.responseId)).not.toContain(ajeno)

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, ajeno))
  })

  it('un grupo con dos respuestas produce dos filas', async () => {
    const primera = await nuevaRespuesta({ message: 'Vamos los cuatro.' })
    const segunda = await nuevaRespuesta({
      message: 'Al final solo dos.',
      respondedAt: new Date('2026-08-21T10:00:00.000Z'),
    })

    const filas = await drizzleGuestbookRepository.listMessages(eventId)
    expect(filas.map((f) => f.responseId).filter((f) => f === primera || f === segunda)).toHaveLength(2)

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, primera))
    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, segunda))
  })
})

describe('findResponseEvent', () => {
  it('devuelve el evento de la respuesta y el estado de su nota', async () => {
    const id = await nuevaRespuesta({ message: 'Hola.' })

    expect(await drizzleGuestbookRepository.findResponseEvent(id)).toEqual({
      responseId: id,
      eventId,
      readAt: null,
      featuredAt: null,
    })

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, id))
  })

  it('devuelve null para una respuesta que no existe', async () => {
    expect(await drizzleGuestbookRepository.findResponseEvent(crypto.randomUUID())).toBeNull()
  })
})

describe('upsertNote', () => {
  it('llamarlo dos veces actualiza en vez de reventar contra el UNIQUE', async () => {
    const id = await nuevaRespuesta({ message: 'Dos veces.' })

    await drizzleGuestbookRepository.upsertNote(id, { readAt: new Date('2026-08-21T09:00:00.000Z') })
    await drizzleGuestbookRepository.upsertNote(id, { featuredAt: new Date('2026-08-21T11:00:00.000Z') })

    const filas = await db.select().from(messageNotes).where(eq(messageNotes.rsvpResponseId, id))
    expect(filas).toHaveLength(1)
    // La segunda escritura no borra lo que puso la primera.
    expect(filas[0]?.readAt).toEqual(new Date('2026-08-21T09:00:00.000Z'))
    expect(filas[0]?.featuredAt).toEqual(new Date('2026-08-21T11:00:00.000Z'))

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, id))
  })

  it('puede volver a poner un campo a nulo: quitar el destacado', async () => {
    const id = await nuevaRespuesta({ message: 'Destacado y luego no.' })

    await drizzleGuestbookRepository.upsertNote(id, { featuredAt: new Date('2026-08-21T11:00:00.000Z') })
    await drizzleGuestbookRepository.upsertNote(id, { featuredAt: null })

    const filas = await db.select().from(messageNotes).where(eq(messageNotes.rsvpResponseId, id))
    expect(filas[0]?.featuredAt).toBeNull()

    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, id))
  })
})

describe('cascada', () => {
  it('borrar el evento se lleva las notas', async () => {
    const id = crypto.randomUUID()
    const grupoTemporal = crypto.randomUUID()
    await nuevoEvento(id, `firmas-cascada-${id.slice(0, 8)}`)
    await db
      .insert(guestGroups)
      .values({ id: grupoTemporal, eventId: id, label: 'Familia Efímera', seats: 2, tokenHash: hash() })
    const respuesta = await nuevaRespuesta({ guestGroupId: grupoTemporal, message: 'Aquí estuve.' })
    await drizzleGuestbookRepository.upsertNote(respuesta, { readAt: new Date() })

    await db.delete(events).where(eq(events.id, id))

    const filas = await db.execute<{ total: number }>(
      sql`select count(*)::int as total from message_notes where rsvp_response_id = ${respuesta}`,
    )
    expect(filas[0]?.total).toBe(0)
  })
})
