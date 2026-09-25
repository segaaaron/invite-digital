import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import { SIN_FORMAS } from '../domain/formas-de-regalar'
import { drizzleFormasDeRegalar } from './drizzle-formas-de-regalar'

const eventId = crypto.randomUUID()
const datos = { sobres: true, sobresTexto: null, transferencia: true, banco: 'BNB', titular: 'Ana Vega', cuenta: '1002003', nota: null }

beforeAll(async () => {
  await db.insert(events).values({
    id: eventId,
    slug: `formas-${eventId.slice(0, 8)}`,
    title: 'Boda de prueba',
    eventDate: '2026-10-18',
    rsvpDeadline: '2026-10-01',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
  })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('drizzleFormasDeRegalar', () => {
  it('sin fila, nada encendido', async () => {
    expect(await drizzleFormasDeRegalar.leer(eventId)).toEqual(SIN_FORMAS)
  })

  it('guarda, conserva el QR con «mantener» y lo quita con «quitar»', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    await drizzleFormasDeRegalar.guardar(eventId, datos, { bytes: png, tipo: 'image/png' })
    expect(await drizzleFormasDeRegalar.leer(eventId)).toEqual({ ...datos, tieneQr: true })

    await drizzleFormasDeRegalar.guardar(eventId, { ...datos, nota: 'Glosa: boda' }, 'mantener')
    expect((await drizzleFormasDeRegalar.qr(eventId))?.bytes).toEqual(png)
    expect((await drizzleFormasDeRegalar.leer(eventId)).nota).toBe('Glosa: boda')

    await drizzleFormasDeRegalar.guardar(eventId, datos, 'quitar')
    expect(await drizzleFormasDeRegalar.qr(eventId)).toBeNull()
    expect((await drizzleFormasDeRegalar.leer(eventId)).tieneQr).toBe(false)
  })
})
