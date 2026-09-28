import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { clientNotes, events, orders } from '@/shared/db/schema'
import { drizzleClientNotes as notas, drizzleReferidos as referidos } from './drizzle-clientes'

const clave = `e:notas-${crypto.randomUUID().slice(0, 8)}@x.bo`
let eventId = ''

afterAll(async () => {
  await db.delete(clientNotes).where(eq(clientNotes.clave, clave))
  if (eventId !== '') {
    await db.delete(orders).where(inArray(orders.referralCode, ['ZZ2345']))
    await db.delete(events).where(eq(events.id, eventId))
  }
})

describe('clientes contra Postgres', () => {
  it('la nota se guarda y se pisa por su clave, con sus etiquetas', async () => {
    await notas.guardar(clave, 'prefiere lila', ['VIP'])
    await notas.guardar(clave, 'llamar el 15', ['VIP', 'Repite'])
    const [n] = await notas.leer([clave, 't:00000000'])
    expect(n).toMatchObject({ clave, note: 'llamar el 15', tags: ['VIP', 'Repite'] })
  })

  it('un código por evento, y cuenta las compras que trajo sin las canceladas', async () => {
    const [fila] = await db
      .insert(events)
      .values({ slug: `ref-${crypto.randomUUID().slice(0, 8)}`, title: 'Referida', eventDate: '2026-05-01', rsvpDeadline: '2026-04-20', locale: 'es', themeKey: 'boda-bot', status: 'live' })
      .returning({ id: events.id })
    eventId = fila!.id
    expect(await referidos.crear(eventId, 'ZZ2345')).toBe('ZZ2345')
    expect(await referidos.crear(eventId, 'OTRO99')).toBe('ZZ2345')
    expect(await referidos.existe('ZZ2345')).toBe(true)
    expect((await referidos.deEventos([eventId])).get(eventId)).toBe('ZZ2345')
    await db.insert(orders).values([
      { publicRef: 'RFR23456', customerName: 'A', contact: 'a@x.bo', referralCode: 'ZZ2345' },
      { publicRef: 'RFR23457', customerName: 'B', contact: 'b@x.bo', referralCode: 'ZZ2345', status: 'cancelled', cancelReason: 'no' },
    ])
    expect((await referidos.usos(['ZZ2345'])).get('ZZ2345')).toBe(1)
    // Sin anfitrión con acceso, el evento se encuentra igual y no hay a quién escribir.
    expect(await referidos.anfitrionesDe('ZZ2345')).toEqual({ evento: 'Referida', correos: [] })
    expect(await referidos.anfitrionesDe('NOEXIS')).toBeNull()
  })
})
