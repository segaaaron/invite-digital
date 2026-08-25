import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, rsvpResponses, venueTables } from '@/shared/db/schema'
import type { VenueTable } from '../domain/venue-table'
import { drizzleVenueRepository } from './drizzle-venue-repository'

const eventId = crypto.randomUUID()
const otroEventId = crypto.randomUUID()

const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

const mesa = (label: string, over: Partial<VenueTable> = {}): VenueTable => ({
  id: crypto.randomUUID(),
  eventId,
  label,
  capacity: 8,
  shape: 'round', notes: null,
  x: 50,
  y: 50,
  ...over,
})

const nuevoEvento = async (id: string) => {
  await db.insert(events).values({
    id,
    slug: `salon-${id.slice(0, 8)}`,
    title: 'Boda de prueba',
    eventDate: '2026-10-18',
    rsvpDeadline: '2026-10-01',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
  })
}

beforeAll(async () => {
  await nuevoEvento(eventId)
  await nuevoEvento(otroEventId)
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroEventId))
})

describe('mesas', () => {
  it('inserta una mesa y la lee por evento', async () => {
    const t = mesa('Mesa alta')
    await drizzleVenueRepository.insertTable(t)
    const rows = await drizzleVenueRepository.listTables(eventId)
    expect(rows.some((r) => r.id === t.id)).toBe(true)
    expect(await drizzleVenueRepository.findTable(t.id)).not.toBeNull()
  })

  it('las posiciones vuelven como number, no como cadena', async () => {
    // `numeric` de Postgres llega como string por el driver: si no se convierte, el
    // plano recibe "12.50" y `left: 12.50%` funciona por casualidad hasta que alguien
    // hace aritmética con ello.
    const t = mesa('Mesa decimal', { x: 12.5, y: 87.25 })
    await drizzleVenueRepository.insertTable(t)
    const row = await drizzleVenueRepository.findTable(t.id)
    expect(typeof row?.x).toBe('number')
    expect(typeof row?.y).toBe('number')
    expect(row?.x).toBe(12.5)
    expect(row?.y).toBe(87.25)
  })

  it('el índice único de etiqueta corta de verdad dentro del evento', async () => {
    await drizzleVenueRepository.insertTable(mesa('Mesa 01'))
    await expect(drizzleVenueRepository.insertTable(mesa('Mesa 01'))).rejects.toThrow()
  })

  it('la misma etiqueta en otro evento sí entra', async () => {
    await expect(
      drizzleVenueRepository.insertTable(mesa('Mesa 01', { eventId: otroEventId })),
    ).resolves.toBeUndefined()
  })

  it('el cupo cero lo rechaza la base, no solo el dominio', async () => {
    await expect(drizzleVenueRepository.insertTable(mesa('Mesa cero', { capacity: 0 }))).rejects.toThrow()
  })

  it('edita cupo, etiqueta, forma y posición', async () => {
    const t = mesa('Mesa editable')
    await drizzleVenueRepository.insertTable(t)
    await drizzleVenueRepository.updateTable({ ...t, label: 'Mesa de honor', capacity: 12, shape: 'imperial', notes: null, x: 1, y: 2 })
    const row = await drizzleVenueRepository.findTable(t.id)
    expect(row).toEqual({ ...t, label: 'Mesa de honor', capacity: 12, shape: 'imperial', notes: null, x: 1, y: 2 })
  })

  it('BORRAR UNA MESA PONE table_id A NULL Y NO BORRA EL GRUPO', async () => {
    // La prueba que impide una pérdida de datos silenciosa: si esto se rompe en
    // producción, el atelier pierde invitados al eliminar una mesa y no se entera.
    const t = mesa('Mesa condenada')
    await drizzleVenueRepository.insertTable(t)

    const groupId = crypto.randomUUID()
    await db.insert(guestGroups).values({
      id: groupId,
      eventId,
      label: 'Familia Superviviente',
      seats: 4,
      tokenHash: hash(),
      tableId: t.id,
    })

    await drizzleVenueRepository.deleteTable(t.id)

    const [row] = await db.select().from(guestGroups).where(eq(guestGroups.id, groupId))
    expect(row, 'el grupo tiene que seguir existiendo tras borrar su mesa').toBeDefined()
    expect(row?.label).toBe('Familia Superviviente')
    expect(row?.tableId).toBeNull()
    expect(await drizzleVenueRepository.findTable(t.id)).toBeNull()
  })

  it('borrar el evento sí se lleva sus mesas por cascada', async () => {
    const id = crypto.randomUUID()
    await nuevoEvento(id)
    await drizzleVenueRepository.insertTable(mesa('Mesa efímera', { eventId: id }))
    await db.delete(events).where(eq(events.id, id))
    expect(await drizzleVenueRepository.listTables(id)).toEqual([])
  })
})

describe('zonas', () => {
  it('inserta, lee, edita y borra una zona conservando los decimales', async () => {
    const z = { id: crypto.randomUUID(), eventId, kind: 'dance' as const, label: 'Pista', x: 10.5, y: 20, w: 30, h: 15.25 }
    await drizzleVenueRepository.insertZone(z)

    const leida = await drizzleVenueRepository.findZone(z.id)
    expect(leida).toEqual(z)
    expect(typeof leida?.w).toBe('number')

    await drizzleVenueRepository.updateZone({ ...z, label: 'Pista central', w: 40 })
    expect((await drizzleVenueRepository.findZone(z.id))?.w).toBe(40)

    await drizzleVenueRepository.deleteZone(z.id)
    expect(await drizzleVenueRepository.findZone(z.id)).toBeNull()
    expect(await drizzleVenueRepository.listZones(eventId)).not.toContainEqual(expect.objectContaining({ id: z.id }))
  })
})

describe('grupos del salón', () => {
  it('trae los cupos, lo confirmado y si está revocado', async () => {
    const groupId = crypto.randomUUID()
    await db.insert(guestGroups).values({
      id: groupId,
      eventId,
      label: 'Familia Confirmada',
      seats: 5,
      tokenHash: hash(),
    })
    await db.insert(rsvpResponses).values({ guestGroupId: groupId, attending: 2, respondedAt: new Date('2026-09-01') })
    // La última respuesta manda: un grupo puede cambiar de idea.
    await db.insert(rsvpResponses).values({ guestGroupId: groupId, attending: 3, respondedAt: new Date('2026-09-05') })

    const row = (await drizzleVenueRepository.listSeatedGroups(eventId)).find((g) => g.id === groupId)
    expect(row?.seats).toBe(5)
    expect(row?.confirmed).toBe(3)
    expect(row?.revoked).toBe(false)
    expect(row?.tableId).toBeNull()
  })

  it('un grupo que no ha respondido tiene confirmed nulo, no cero', async () => {
    const groupId = crypto.randomUUID()
    await db.insert(guestGroups).values({ id: groupId, eventId, label: 'Familia Muda', seats: 2, tokenHash: hash() })
    const row = (await drizzleVenueRepository.listSeatedGroups(eventId)).find((g) => g.id === groupId)
    expect(row?.confirmed).toBeNull()
  })

  it('sienta y levanta un grupo sin tocar nada más de la fila', async () => {
    const t = mesa('Mesa asignable')
    await drizzleVenueRepository.insertTable(t)
    const groupId = crypto.randomUUID()
    await db.insert(guestGroups).values({ id: groupId, eventId, label: 'Familia Móvil', seats: 3, tokenHash: hash() })

    await drizzleVenueRepository.setGroupTable(groupId, t.id)
    let row = (await drizzleVenueRepository.listSeatedGroups(eventId)).find((g) => g.id === groupId)
    expect(row?.tableId).toBe(t.id)

    await drizzleVenueRepository.setGroupTable(groupId, null)
    row = (await drizzleVenueRepository.listSeatedGroups(eventId)).find((g) => g.id === groupId)
    expect(row?.tableId).toBeNull()
    expect(row?.label).toBe('Familia Móvil')
  })

  it('no mezcla los grupos de dos eventos', async () => {
    const groupId = crypto.randomUUID()
    await db.insert(guestGroups).values({
      id: groupId,
      eventId: otroEventId,
      label: 'Familia Ajena',
      seats: 2,
      tokenHash: hash(),
    })
    const rows = await drizzleVenueRepository.listSeatedGroups(eventId)
    expect(rows.some((g) => g.id === groupId)).toBe(false)
  })

  it('marca como revocado el grupo al que se le quitó la invitación', async () => {
    const groupId = crypto.randomUUID()
    await db.insert(guestGroups).values({
      id: groupId,
      eventId,
      label: 'Familia Fuera',
      seats: 2,
      tokenHash: hash(),
      revokedAt: new Date(),
    })
    const row = (await drizzleVenueRepository.listSeatedGroups(eventId)).find((g) => g.id === groupId)
    expect(row?.revoked).toBe(true)
  })
})

describe('aislamiento por evento', () => {
  it('listTables solo devuelve las mesas de su evento', async () => {
    const rows = await drizzleVenueRepository.listTables(otroEventId)
    expect(rows.every((r) => r.eventId === otroEventId)).toBe(true)
    const todas = await db.select().from(venueTables).where(eq(venueTables.eventId, eventId))
    expect(rows.some((r) => todas.some((t) => t.id === r.id))).toBe(false)
  })
})
