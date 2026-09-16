import { describe, expect, it } from 'vitest'
import type { Actor, Membership } from '@/modules/identity'
import { isErr, isOk } from '@/shared/result'
import type { EventInput } from '../domain/event'
import type { EventRepository } from './ports'
import type { StaffReader } from './ports'
import { actorCanTouchEvent, getEventByIdFor, getEventFor, listEventsFor } from './tenancy'

/** Nadie pertenece a nada salvo donde la prueba lo diga. */
const sinPersonal: StaffReader = { membershipsOf: async () => [], eventIdsOf: async () => [] }

/**
 * Una pertenencia concreta: este usuario, en este evento, **con esta clase**.
 *
 * El doble mira la clase a propósito. Uno que la ignorase daría verde con un repositorio
 * que tampoco la mirase, y entonces el cliente de una boda entraría por la pertenencia de
 * la puerta — que es justo lo que no puede pasar teniendo las dos en la misma tabla.
 */
const perteneceA = (eventId: string, userId: string, membership: Membership): StaffReader => ({
  membershipsOf: async (e, u) => (e === eventId && u === userId ? [membership] : []),
  eventIdsOf: async (u, ms) => (u === userId && ms.includes(membership) ? [eventId] : []),
})

const fila = (id: string, slug: string, userId: string | null): EventInput => ({
  id,
  userId,
  slug,
  title: 'Boda de prueba',
  eventDate: '2027-05-15',
  rsvpDeadline: '2027-05-01',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
})

const FILAS = [fila('e1', 'boda-de-ana', 'u1'), fila('e2', 'boda-de-beto', 'u2'), fila('e3', 'boda-huerfana', null)]

const repo = (): EventRepository => ({
  listPendingAnonymization: async () => [],
  anonymize: async () => {},
  insert: async () => {},
  update: async () => {},
  listAll: async () => FILAS,
  listByUser: async (userId) => FILAS.filter((f) => f.userId === userId),
  listByIds: async (ids) => FILAS.filter((f) => ids.includes(f.id)),
  setOwner: async () => {},
  findBySlug: async (slug) => FILAS.find((f) => f.slug === slug) ?? null,
  findById: async (id) => FILAS.find((f) => f.id === id) ?? null,
  remove: async () => {},
})

const ana: Actor = { userId: 'u1', email: 'ana@ejemplo.bo', role: 'atelier', mustChangePassword: false }
const beto: Actor = { userId: 'u2', email: 'beto@ejemplo.bo', role: 'atelier', mustChangePassword: false }
const jefa: Actor = { userId: 'u9', email: 'jefa@ejemplo.bo', role: 'admin', mustChangePassword: false }
const cliente: Actor = { userId: 'c1', email: 'novios@ejemplo.bo', role: 'cliente', mustChangePassword: false }

describe('getEventFor', () => {
  it('el dueño lo abre', async () => {
    const suyo = await getEventFor({ events: repo(), staff: sinPersonal })(ana, 'boda-de-ana')

    expect(isOk(suyo) && suyo.value.slug).toBe('boda-de-ana')
  })

  it('el ajeno responde «no existe», aunque la fila esté ahí', async () => {
    // La distinción importa: la fila existe y se leyó. Si esto devolviera un error de
    // permiso, confirmaría a Ana que la boda de Beto existe con ese slug.
    const ajeno = await getEventFor({ events: repo(), staff: sinPersonal })(ana, 'boda-de-beto')

    expect(isErr(ajeno) && ajeno.error.kind).toBe('not_found')
    expect(await repo().findBySlug('boda-de-beto')).not.toBeNull()
  })

  it('un evento sin dueño: el atelier no lo abre y el admin solo su ficha', async () => {
    expect(isErr(await getEventFor({ events: repo(), staff: sinPersonal })(ana, 'boda-huerfana'))).toBe(true)
    expect(isOk(await getEventFor({ events: repo(), staff: sinPersonal })(jefa, 'boda-huerfana', { section: 'ficha' }))).toBe(true)
  })

  it('el admin abre la ficha de cualquiera, pero no sus datos', async () => {
    expect(isOk(await getEventFor({ events: repo(), staff: sinPersonal })(jefa, 'boda-de-beto', { section: 'ficha' }))).toBe(true)
    expect(isErr(await getEventFor({ events: repo(), staff: sinPersonal })(jefa, 'boda-de-beto'))).toBe(true)
    expect(isErr(await getEventFor({ events: repo(), staff: sinPersonal })(jefa, 'boda-de-beto', { section: 'cliente' }))).toBe(true)
  })

  it('un slug que no existe también es «no existe»: no se distingue de un ajeno', async () => {
    const inventado = await getEventFor({ events: repo(), staff: sinPersonal })(ana, 'boda-inventada')

    expect(isErr(inventado) && inventado.error.kind).toBe('not_found')
  })
})

describe('getEventByIdFor', () => {
  it('corta igual por identificador, que es lo que llega de un formulario', async () => {
    expect(isErr(await getEventByIdFor({ events: repo(), staff: sinPersonal })(ana, 'e2'))).toBe(true)
    expect(isOk(await getEventByIdFor({ events: repo(), staff: sinPersonal })(beto, 'e2'))).toBe(true)
  })
})

describe('listEventsFor', () => {
  it('el atelier solo ve los suyos', async () => {
    const bandeja = await listEventsFor({ events: repo(), staff: sinPersonal })(ana)

    expect(isOk(bandeja) && bandeja.value.map((e) => e.slug)).toEqual(['boda-de-ana'])
  })

  it('el admin los ve todos, incluidos los huérfanos', async () => {
    const bandeja = await listEventsFor({ events: repo(), staff: sinPersonal })(jefa)

    expect(isOk(bandeja) && bandeja.value.map((e) => e.slug)).toEqual([
      'boda-de-ana',
      'boda-de-beto',
      'boda-huerfana',
    ])
  })

  it('el cliente ve la boda donde está dado de alta, y no es suya', async () => {
    // No aparece en `listByUser`: el dueño sigue siendo el atelier. Llega por pertenencia,
    // igual que el personal de puerta.
    const bandeja = await listEventsFor({ events: repo(), staff: perteneceA('e1', 'c1', 'cliente') })(cliente)

    expect(isOk(bandeja) && bandeja.value.map((e) => e.slug)).toEqual(['boda-de-ana'])
  })
})

describe('la pertenencia del cliente y la de la puerta no se cruzan', () => {
  it('el cliente abre su sección en el evento donde está dado de alta', async () => {
    const suyo = await getEventFor({ events: repo(), staff: perteneceA('e1', 'c1', 'cliente') })(
      cliente,
      'boda-de-ana',
      { section: 'cliente' },
    )

    expect(isOk(suyo) && suyo.value.slug).toBe('boda-de-ana')
  })

  it('pero no si su pertenencia es la de la puerta', async () => {
    // Las dos clases viven en la misma tabla. Sin el filtro por clase, a quien se dio de
    // alta para la puerta se le abriría el panel entero de esa boda.
    const conClaseAjena = await getEventFor({ events: repo(), staff: perteneceA('e1', 'c1', 'puerta') })(
      cliente,
      'boda-de-ana',
      { section: 'cliente' },
    )

    expect(isErr(conClaseAjena) && conClaseAjena.error.kind).toBe('not_found')
  })

  it('ni el check-in, que es de la puerta', async () => {
    const puerta = await getEventFor({ events: repo(), staff: perteneceA('e1', 'c1', 'cliente') })(
      cliente,
      'boda-de-ana',
      { section: 'checkin' },
    )

    expect(isErr(puerta) && puerta.error.kind).toBe('not_found')
  })

  it('ni la sección completa: Configuración, el plan y el borrado son del atelier', async () => {
    const todo = await getEventFor({ events: repo(), staff: perteneceA('e1', 'c1', 'cliente') })(
      cliente,
      'boda-de-ana',
      { section: 'full' },
    )

    expect(isErr(todo) && todo.error.kind).toBe('not_found')
  })

  it('y no entra en la boda de al lado', async () => {
    const ajena = await getEventFor({ events: repo(), staff: perteneceA('e1', 'c1', 'cliente') })(
      cliente,
      'boda-de-beto',
      { section: 'cliente' },
    )

    expect(isErr(ajena) && ajena.error.kind).toBe('not_found')
  })
})

describe('el equipo del evento', () => {
  it('una planner con cuenta de atelier ve sus eventos y aquel donde la sumaron, y entra como planner', async () => {
    const deps = { events: repo(), staff: perteneceA('e1', 'u2', 'planner') }
    const lista = await listEventsFor(deps)(beto)
    expect(isOk(lista) && lista.value.map((e) => e.id).sort()).toEqual(['e1', 'e2'])
    expect(isOk(await getEventFor(deps)(beto, 'boda-de-ana', { section: 'cliente' }))).toBe(true)
    expect(isErr(await getEventFor(deps)(beto, 'boda-de-ana'))).toBe(true)
  })

  it('un co-anfitrión ve la boda en su bandeja pero no el equipo', async () => {
    const deps = { events: repo(), staff: perteneceA('e1', 'c1', 'coanfitrion') }
    const lista = await listEventsFor(deps)(cliente)
    expect(isOk(lista) && lista.value.map((e) => e.id)).toEqual(['e1'])
    expect(isErr(await getEventFor(deps)(cliente, 'boda-de-ana', { section: 'equipo' }))).toBe(true)
  })
})


describe('actorCanTouchEvent', () => {
  const tocar = actorCanTouchEvent({ events: repo(), staff: sinPersonal })

  it('devuelve el id del evento que abre, para que la acción filtre por él', async () => {
    expect(await tocar(ana, { eventSlug: 'boda-de-ana' })).toBe('e1')
    expect(await tocar(ana, { eventId: 'e1' })).toBe('e1')
  })

  it('el evento ajeno no abre', async () => {
    expect(await tocar(ana, { eventSlug: 'boda-de-beto' })).toBeNull()
  })

  it('un id y un slug de dos eventos distintos no abren, aunque los dos sean suyos', async () => {
    // Sin esto la acción comprobaría un evento y escribiría en el otro.
    const deps = { events: repo(), staff: perteneceA('e2', 'u1', 'planner') }
    expect(await actorCanTouchEvent(deps)(ana, { eventId: 'e2', eventSlug: 'boda-de-ana', section: 'cliente' })).toBeNull()
  })

  it('sin referencia no abre nada', async () => {
    expect(await tocar(ana, {})).toBeNull()
  })
})
