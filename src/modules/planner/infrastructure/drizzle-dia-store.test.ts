import { inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import { drizzleDiaStore as store } from './drizzle-dia-store'

const uno = crypto.randomUUID()
const otro = crypto.randomUUID()

beforeAll(async () => {
  for (const id of [uno, otro]) {
    await db.insert(events).values({ id, slug: `dia-${id.slice(0, 8)}`, title: 'Día', eventDate: '2027-05-15', rsvpDeadline: '2027-04-30', locale: 'es', themeKey: 'xv-isabelle', status: 'draft' })
  }
})
afterAll(async () => {
  await db.delete(events).where(inArray(events.id, [uno, otro]))
})

const vendor = { service: 'DJ', company: 'Beat', contactName: null, whatsapp: '70012345', email: null, status: 'contratado' as const, arrivalTime: '17:30', setupNotes: null, budgetItemId: null }

describe('drizzleDiaStore', () => {
  it('el proveedor se encuentra por su enlace y no se toca desde otro evento', async () => {
    const id = await store.insertVendor(uno, vendor)
    const hash = Buffer.alloc(32, 7)
    expect(await store.setVendorToken(otro, id, hash)).toBe(false)
    expect(await store.setVendorToken(uno, id, hash)).toBe(true)
    expect(await store.findVendorByTokenHash(hash)).toMatchObject({ eventId: uno, vendor: { service: 'DJ', conEnlace: true } })
    expect(await store.removeVendor(otro, id)).toBe(false)
    await store.setVendorToken(uno, id, null)
    expect(await store.findVendorByTokenHash(hash)).toBeNull()
  })

  it('el cronograma guarda los proveedores de cada momento', async () => {
    const dj = await store.insertVendor(uno, { ...vendor, service: 'DJ del vals' })
    await store.insertMoments(uno, [{ startsAt: '20:00', durationMin: 10, title: 'Vals con el papá', place: null, owner: 'Planner', vendorIds: [dj], cue: 'Tiempo de vals', notes: null, sortOrder: 0 }])
    const [momento] = await store.listMoments(uno)
    expect(momento).toMatchObject({ title: 'Vals con el papá', vendorIds: [dj], cue: 'Tiempo de vals' })
    expect(await store.updateMoment(otro, momento!.id, { ...momento!, title: 'Ajeno' })).toBe(false)
  })

  it('un ensayo solo suma asistentes del cortejo de su evento', async () => {
    await store.insertCourtMember(uno, { kind: 'chambelan', name: 'Diego', whatsapp: null, sponsors: null, size: 'M', confirmed: false, budgetItemId: null })
    await store.insertCourtMember(otro, { kind: 'chambelan', name: 'Ajeno', whatsapp: null, sponsors: null, size: null, confirmed: false, budgetItemId: null })
    const [diego] = await store.listCourt(uno)
    const [ajeno] = await store.listCourt(otro)

    await store.insertRehearsal(uno, { date: new Date('2027-04-01T23:00:00Z'), place: 'Salón', notes: null, asistentes: [diego!.id, ajeno!.id] })
    const [ensayo] = await store.listRehearsals(uno)
    expect(ensayo?.asistentes).toEqual([diego!.id])
  })
})
