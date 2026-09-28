import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import { drizzleAcompanamiento as store } from './drizzle-acompanamiento'

const slug = `acomp-${crypto.randomUUID().slice(0, 8)}`
let eventId = ''

afterAll(async () => {
  if (eventId !== '') await db.delete(events).where(eq(events.id, eventId))
})

describe('acompañamiento contra Postgres', () => {
  it('lista el evento vivo, aparta un aviso una sola vez y la encuesta se responde una vez', async () => {
    const [fila] = await db
      .insert(events)
      .values({ slug, title: 'Acompañada', eventDate: '2026-10-20', rsvpDeadline: '2026-10-05', locale: 'es', themeKey: 'boda-bot', status: 'live' })
      .returning({ id: events.id })
    eventId = fila!.id

    const vivos = await store.eventos('2026-09-28')
    const este = vivos.find((e) => e.id === eventId)
    expect(este).toMatchObject({ slug, grupos: 0, invitacionEscrita: false, anfitriones: [], yaEnviados: [] })

    expect(await store.reservar(eventId, 'hito-escribir')).toBe(true)
    expect(await store.reservar(eventId, 'hito-escribir')).toBe(false)
    await store.liberar(eventId, 'hito-escribir')
    expect(await store.reservar(eventId, 'hito-escribir')).toBe(true)
    expect((await store.eventos('2026-09-28')).find((e) => e.id === eventId)?.yaEnviados).toEqual(['hito-escribir'])

    const hash = createHash('sha256').update('token-de-prueba').digest()
    await store.crearEncuesta(eventId, hash)
    expect(await store.encuesta(hash)).toEqual({ eventTitle: 'Acompañada', respondida: false })
    expect(await store.responder(hash, { rating: 5, comment: 'Precioso', allowPublish: true })).toBe(true)
    expect(await store.responder(hash, { rating: 1, comment: 'otra', allowPublish: false })).toBe(false)
    expect((await store.opiniones([eventId])).get(eventId)).toMatchObject({ rating: 5, comment: 'Precioso', allowPublish: true })
  })
})
