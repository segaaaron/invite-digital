import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, guestPeople, venueTables } from '@/shared/db/schema'
import { eq } from 'drizzle-orm'
import { drizzleArrivalRepository, drizzleDoorGroupReader } from './drizzle-arrival-repository'

const eventId = crypto.randomUUID()
const groupId = crypto.randomUUID()
const hash = Buffer.from('0'.repeat(64), 'hex')

beforeAll(async () => {
  await db.insert(events).values({
    id: eventId,
    slug: `puerta-${eventId.slice(0, 8)}`,
    title: 'Boda de prueba',
    eventDate: '2026-10-18',
    rsvpDeadline: '2026-10-01',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
  })
  await db.insert(guestGroups).values({ id: groupId, eventId, label: 'Familia Prueba', seats: 4, tokenHash: hash })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('drizzleArrivalRepository', () => {
  it('guarda quiénes entraron en el escaneo, y la llegada por número sigue sin personas', async () => {
    const [ana, luis] = [crypto.randomUUID(), crypto.randomUUID()]
    const conPersonas = crypto.randomUUID()
    const porNumero = crypto.randomUUID()
    await drizzleArrivalRepository.insertIfAbsent({ scanId: conPersonas, guestGroupId: groupId, arrivedCount: 2, scannedAt: new Date(), voidedAt: null, personIds: [ana, luis] })
    await drizzleArrivalRepository.insertIfAbsent({ scanId: porNumero, guestGroupId: groupId, arrivedCount: 1, scannedAt: new Date(), voidedAt: null })

    const filas = await drizzleArrivalRepository.listByEvent(eventId)
    expect(filas.find((f) => f.scanId === conPersonas)?.personIds).toEqual([ana, luis])
    expect(filas.find((f) => f.scanId === porNumero)?.personIds).toBeNull()
  })

  it('el lector trae a las personas de la invitación, el principal primero', async () => {
    const principal = crypto.randomUUID()
    await db.insert(guestPeople).values([
      { guestGroupId: groupId, fullName: 'Luis Acompañante', isCompanion: true },
      { id: principal, guestGroupId: groupId, fullName: 'Ana Principal', isCompanion: false },
    ])
    const grupo = await drizzleDoorGroupReader.findGroupById(groupId)
    expect(grupo?.people.map((p) => p.fullName)).toEqual(['Ana Principal', 'Luis Acompañante'])
    expect(grupo?.people[0]?.id).toBe(principal)
  })

  it('inserta una llegada y la lee por evento', async () => {
    const scanId = crypto.randomUUID()
    const inserted = await drizzleArrivalRepository.insertIfAbsent({
      scanId,
      guestGroupId: groupId,
      arrivedCount: 3,
      scannedAt: new Date(),
      voidedAt: null,
    })
    expect(inserted).toBe(true)
    const rows = await drizzleArrivalRepository.listByEvent(eventId)
    expect(rows.some((r) => r.scanId === scanId)).toBe(true)
  })

  it('el mismo scanId no entra dos veces: la idempotencia vive en la base', async () => {
    const scanId = crypto.randomUUID()
    const row = { scanId, guestGroupId: groupId, arrivedCount: 2, scannedAt: new Date(), voidedAt: null }
    expect(await drizzleArrivalRepository.insertIfAbsent(row)).toBe(true)
    expect(await drizzleArrivalRepository.insertIfAbsent(row)).toBe(false)
  })

  it('deshacer escribe lápida y la fila sigue ahí', async () => {
    const scanId = crypto.randomUUID()
    await drizzleArrivalRepository.insertIfAbsent({
      scanId,
      guestGroupId: groupId,
      arrivedCount: 1,
      scannedAt: new Date(),
      voidedAt: null,
    })
    await drizzleArrivalRepository.void(scanId, new Date())
    const row = await drizzleArrivalRepository.findByScanId(scanId)
    expect(row?.voidedAt).not.toBeNull()
  })

  it('el lector de grupos entrega el hash, y solo el hash', async () => {
    const group = await drizzleDoorGroupReader.findByTokenHash(hash)
    expect(group?.id).toBe(groupId)
    expect(group?.tokenHash.equals(hash)).toBe(true)
    expect(Object.keys(group ?? {})).not.toContain('token')
  })

  it('busca un grupo por su id, para resolver los cupos de una llegada', async () => {
    const group = await drizzleDoorGroupReader.findGroupById(groupId)
    expect(group?.seats).toBe(4)
    expect(await drizzleDoorGroupReader.findGroupById(crypto.randomUUID())).toBeNull()
  })

  it('borrar el evento se lleva las llegadas por cascada', async () => {
    const otro = crypto.randomUUID()
    const otroGrupo = crypto.randomUUID()
    await db.insert(events).values({
      id: otro,
      slug: `puerta-${otro.slice(0, 8)}`,
      title: 'Efímera',
      eventDate: '2026-10-18',
      rsvpDeadline: '2026-10-01',
      locale: 'es',
      themeKey: 'clasico',
      status: 'draft',
    })
    await db.insert(guestGroups).values({
      id: otroGrupo,
      eventId: otro,
      label: 'X',
      seats: 1,
      tokenHash: Buffer.from('1'.repeat(64), 'hex'),
    })
    await drizzleArrivalRepository.insertIfAbsent({
      scanId: crypto.randomUUID(),
      guestGroupId: otroGrupo,
      arrivedCount: 1,
      scannedAt: new Date(),
      voidedAt: null,
    })
    await db.delete(events).where(eq(events.id, otro))
    expect(await drizzleArrivalRepository.listByEvent(otro)).toHaveLength(0)
  })

  it('el lector trae la etiqueta de la mesa del grupo', async () => {
    const tableId = crypto.randomUUID()
    await db.insert(venueTables).values({ id: tableId, eventId, label: 'Mesa 07', capacity: 8 })
    await db.update(guestGroups).set({ tableId }).where(eq(guestGroups.id, groupId))

    expect((await drizzleDoorGroupReader.findGroupById(groupId))?.tableLabel).toBe('Mesa 07')
    expect((await drizzleDoorGroupReader.findByTokenHash(hash))?.tableLabel).toBe('Mesa 07')

    await db.update(guestGroups).set({ tableId: null }).where(eq(guestGroups.id, groupId))
  })

  it('UN GRUPO SIN MESA SIGUE APARECIENDO, con la etiqueta en nulo', async () => {
    // Left join, no inner: con un inner join, todo grupo sin mesa desaparecería de la
    // puerta y su pase dejaría de abrirla.
    const sinMesa = crypto.randomUUID()
    await db.insert(guestGroups).values({
      id: sinMesa,
      eventId,
      label: 'Familia Sin Mesa',
      seats: 2,
      tokenHash: Buffer.from('2'.repeat(64), 'hex'),
    })

    const row = await drizzleDoorGroupReader.findGroupById(sinMesa)
    expect(row?.label).toBe('Familia Sin Mesa')
    expect(row?.tableLabel).toBeNull()
    expect((await drizzleDoorGroupReader.listByEvent(eventId)).some((g) => g.id === sinMesa)).toBe(true)
  })
})
