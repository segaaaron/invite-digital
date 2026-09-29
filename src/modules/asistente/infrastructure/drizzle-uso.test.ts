import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, users } from '@/shared/db/schema'
import { drizzleUsoDelAsistente as uso } from './drizzle-uso'

const S = crypto.randomUUID().slice(0, 8)
const HASH = '$argon2id$v=19$m=19456,t=2,p=1$YWFhYWFhYWFhYWFhYWFhYQ$YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE'
// Un mes que nadie más usa: la suma del mes es de todo el sitio.
const MES = '1999-01'
let atelier = ''
let eventId = ''

beforeAll(async () => {
  const [u] = await db.insert(users).values({ email: `uso-${S}@x.bo`, passwordHash: HASH, role: 'atelier' }).returning({ id: users.id })
  atelier = u!.id
  const [e] = await db
    .insert(events)
    .values({ userId: atelier, slug: `uso-${S}`, title: 'Uso', eventDate: '2027-05-01', rsvpDeadline: '2027-04-20', locale: 'es', themeKey: 'boda-bot', status: 'live' })
    .returning({ id: events.id })
  eventId = e!.id
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(users).where(eq(users.id, atelier))
})

describe('uso del asistente contra Postgres', () => {
  it('suma mensajes y coste en la base, también dos a la vez, y el mes cuenta todo el sitio', async () => {
    await Promise.all([uso.registrar(eventId, MES, { entrada: 10_000, enCache: 0, salida: 1_000 }), uso.registrar(eventId, MES, { entrada: 10_000, enCache: 0, salida: 1_000 })])
    // Cada uno: 10.000×0,10 + 1.000×0,50 = 1.500 millonésimas.
    expect(await uso.usoDe(eventId, MES)).toEqual({ mensajesDelMes: 2, gastoDelMesMicroUsd: 3_000 })
    expect(await uso.resumenDelMes(MES)).toEqual({ mensajes: 2, eventos: 1, gastoMicroUsd: 3_000 })
    expect(await uso.usoDe(eventId, '1999-02')).toEqual({ mensajesDelMes: 0, gastoDelMesMicroUsd: 0 })
  })
})
