import { describe, expect, it } from 'vitest'
import type { Actor } from '@/modules/identity/domain/access'
import { isErr, isOk } from '@/shared/result'
import type { EventInput } from '../domain/event'
import type { EventRepository } from './ports'
import type { StaffReader } from './ports'
import { getEventByIdFor, getEventFor, listEventsFor } from './tenancy'

/** Nadie es personal de puerta salvo donde la prueba lo diga. */
const sinPersonal: StaffReader = { isStaffOf: async () => false, eventIdsOf: async () => [] }

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

const ana: Actor = { userId: 'u1', email: 'ana@ejemplo.bo', role: 'atelier' }
const beto: Actor = { userId: 'u2', email: 'beto@ejemplo.bo', role: 'atelier' }
const jefa: Actor = { userId: 'u9', email: 'jefa@ejemplo.bo', role: 'admin' }

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

  it('un evento sin dueño solo lo abre el admin', async () => {
    expect(isErr(await getEventFor({ events: repo(), staff: sinPersonal })(ana, 'boda-huerfana'))).toBe(true)
    expect(isOk(await getEventFor({ events: repo(), staff: sinPersonal })(jefa, 'boda-huerfana'))).toBe(true)
  })

  it('el admin abre el de cualquiera', async () => {
    expect(isOk(await getEventFor({ events: repo(), staff: sinPersonal })(jefa, 'boda-de-beto'))).toBe(true)
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
})
