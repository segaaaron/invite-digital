import { createHash, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from './client'
import { escucharCambios, leerAviso, repartir, versionDe, type TipoDeCambio } from './cambios-en-vivo'
import { events, guestGroups, invitationViews, rsvpResponses } from './schema'

const slug = `en-vivo-${crypto.randomUUID().slice(0, 8)}`
const otroSlug = `${slug}-otro`
let eventId = ''
let otroId = ''
let grupoId = ''

beforeAll(async () => {
  const [e] = await db.insert(events).values({ slug, title: 'En vivo', eventDate: '2027-05-15', rsvpDeadline: '2027-05-01', locale: 'es', themeKey: 'boda-bot' }).returning({ id: events.id })
  const [o] = await db.insert(events).values({ slug: otroSlug, title: 'Otro', eventDate: '2027-05-15', rsvpDeadline: '2027-05-01', locale: 'es', themeKey: 'boda-bot' }).returning({ id: events.id })
  eventId = e!.id
  otroId = o!.id
  const [g] = await db
    .insert(guestGroups)
    .values({ eventId, label: 'Familia Vargas', seats: 2, tokenHash: createHash('sha256').update(randomBytes(16)).digest() })
    .returning({ id: guestGroups.id })
  grupoId = g!.id
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroId))
})

/** El siguiente aviso de ese evento, o `null` si no llega en `ms`. */
const siguiente = (id: string, ms = 5000) =>
  new Promise<TipoDeCambio | null>((resolver) => {
    const baja = escucharCambios(id, (tipo) => {
      baja()
      clearTimeout(reloj)
      resolver(tipo)
    })
    const reloj = setTimeout(() => {
      baja()
      resolver(null)
    }, ms)
  })

describe('cambios en vivo, contra Postgres', () => {
  it('una visita avisa a su evento, y no al de al lado', async () => {
    const propio = siguiente(eventId)
    const ajeno = siguiente(otroId, 1500)
    // La escucha se abre con la primera suscripción: se le da un momento antes de escribir.
    await new Promise((r) => setTimeout(r, 300))
    await db.insert(invitationViews).values({ eventId, device: 'mobile', source: 'direct' })
    expect(await propio).toBe('visita')
    expect(await ajeno).toBeNull()
  })

  it('una respuesta de RSVP avisa por su invitación', async () => {
    const propio = siguiente(eventId)
    await new Promise((r) => setTimeout(r, 100))
    await db.insert(rsvpResponses).values({ guestGroupId: grupoId, attending: 2 })
    expect(await propio).toBe('rsvp')
  })

  it('una respuesta deshecha no avisa: pg_notify sale al confirmar', async () => {
    const propio = siguiente(eventId, 1500)
    await new Promise((r) => setTimeout(r, 100))
    await db
      .transaction(async (tx) => {
        await tx.insert(rsvpResponses).values({ guestGroupId: grupoId, attending: 1 })
        throw new Error('deshacer')
      })
      .catch(() => {})
    expect(await propio).toBeNull()
  })
})

describe('el bus', () => {
  it('lee solo avisos bien formados', () => {
    expect(leerAviso('{"e":"x","t":"rsvp"}')).toEqual({ eventId: 'x', tipo: 'rsvp' })
    expect(leerAviso('{"e":"x","t":"otro"}')).toBeNull()
    expect(leerAviso('no es json')).toBeNull()
  })

  it('sube la versión del evento con cada aviso y reparte a quien escucha', () => {
    const id = `bus-${crypto.randomUUID()}`
    const recibidos: Array<[TipoDeCambio, number]> = []
    const baja = escucharCambios(id, (tipo, version) => recibidos.push([tipo, version]))
    repartir(id, 'ingreso')
    repartir(id, 'rsvp')
    baja()
    repartir(id, 'rsvp')
    expect(recibidos).toEqual([
      ['ingreso', 1],
      ['rsvp', 2],
    ])
    expect(versionDe(id)).toBe(3)
  })
})
