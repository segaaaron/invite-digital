import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { eventAddons, events, plans } from '@/shared/db/schema'
import { drizzleDisenoRepository as repo } from './drizzle-diseno-repository'

const eventId = crypto.randomUUID()

beforeAll(async () => {
  await db.insert(events).values({
    id: eventId,
    slug: `diseno-${eventId.slice(0, 8)}`,
    title: 'XV de prueba',
    eventDate: '2027-01-17',
    rsvpDeadline: '2026-12-27',
    locale: 'es',
    themeKey: 'xv',
    status: 'draft',
  })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('drizzleDisenoRepository', () => {
  it('sin fila es autoservicio; empezar dos veces no reinicia', async () => {
    expect(await repo.leer(eventId)).toBeNull()
    await repo.empezar(eventId, { rondas: 3, dias: 5 })
    const d = await repo.leer(eventId)
    expect(d).toEqual({ estado: 'esperando_datos', rondasIncluidas: 3, rondasUsadas: 0, diasDeEntrega: 5, entregaHasta: null })
    await repo.cambiar(eventId, 'esperando_datos', { ...d!, estado: 'en_diseno', entregaHasta: '2026-10-07' })
    await repo.empezar(eventId, { rondas: 9, dias: 9 })
    expect((await repo.leer(eventId))?.estado).toBe('en_diseno')
  })

  it('el cambio solo se escribe desde el estado esperado: dos clics a la vez no se pisan', async () => {
    const d = (await repo.leer(eventId))!
    const [a, b] = await Promise.all([
      repo.cambiar(eventId, 'en_diseno', { ...d, estado: 'version_enviada', entregaHasta: null }),
      repo.cambiar(eventId, 'en_diseno', { ...d, estado: 'version_enviada', entregaHasta: null }),
    ])
    expect([a, b].filter(Boolean)).toHaveLength(1)
  })

  it('error nuestro devuelve la ronda una sola vez', async () => {
    const d = (await repo.leer(eventId))!
    await repo.cambiar(eventId, 'version_enviada', { ...d, estado: 'en_diseno', rondasUsadas: 1, entregaHasta: '2026-10-09' })
    await repo.anotarRonda(eventId, 'Cambia la hora a 20:00 y la foto de portada', null)
    const [ronda] = await repo.rondas(eventId)
    expect(ronda?.counts).toBe(true)
    expect(await repo.noCuenta(eventId, ronda!.id)).toBe(true)
    expect(await repo.noCuenta(eventId, ronda!.id)).toBe(false)
    expect((await repo.leer(eventId))?.rondasUsadas).toBe(0)
  })

  it('una ronda de otro evento no se toca', async () => {
    const [ronda] = await repo.rondas(eventId)
    expect(await repo.noCuenta(crypto.randomUUID(), ronda!.id)).toBe(false)
  })

  it('lo por entregar trae el evento en diseño con su fecha', async () => {
    const lista = await repo.porEntregar()
    expect(lista.find((f) => f.slug === `diseno-${eventId.slice(0, 8)}`)).toMatchObject({ estado: 'en_diseno', entregaHasta: '2026-10-09' })
  })
})

describe('empezar según el plan', () => {
  it('un plan de autoservicio no crea encargo; uno con rondas y días, sí, con sus valores', async () => {
    const otro = crypto.randomUUID()
    await db.insert(events).values({ id: otro, slug: `diseno-plan-${otro.slice(0, 8)}`, title: 'Plan', eventDate: '2027-01-17', rsvpDeadline: '2026-12-27', locale: 'es', themeKey: 'xv', status: 'draft' })
    try {
      expect(await repo.empezarSegunPlan(otro, 'plan-que-no-existe')).toBe(false)
      await db.update(plans).set({ correctionRounds: 3, deliveryDays: 4 }).where(eq(plans.slug, 'firma-3d'))
      expect(await repo.empezarSegunPlan(otro, 'firma-3d')).toBe(true)
      expect(await repo.leer(otro)).toMatchObject({ rondasIncluidas: 3, diasDeEntrega: 4, estado: 'esperando_datos' })
    } finally {
      await db.update(plans).set({ correctionRounds: null, deliveryDays: null }).where(eq(plans.slug, 'firma-3d'))
      await db.delete(events).where(eq(events.id, otro))
    }
  })
  it('los cambios adicionales comprados antes (cotización) se suman al crear el encargo, una vez', async () => {
    const otro = crypto.randomUUID()
    await db.insert(events).values({ id: otro, slug: `diseno-extra-${otro.slice(0, 8)}`, title: 'Extra', eventDate: '2027-01-17', rsvpDeadline: '2026-12-27', locale: 'es', themeKey: 'xv', status: 'draft' })
    try {
      await db.insert(eventAddons).values({ eventId: otro, addonSlug: 'cambio-adicional', effect: 'mas_rondas', amount: 1 })
      await repo.empezar(otro, { rondas: 3, dias: 5 })
      expect((await repo.leer(otro))?.rondasIncluidas).toBe(4)
      await repo.empezar(otro, { rondas: 3, dias: 5 })
      expect((await repo.leer(otro))?.rondasIncluidas).toBe(4)
    } finally {
      await db.delete(events).where(eq(events.id, otro))
    }
  })
})
