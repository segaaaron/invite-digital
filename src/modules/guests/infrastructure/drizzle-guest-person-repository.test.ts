import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, guestPeople } from '@/shared/db/schema'
import { countPeopleByEvent, drizzleGuestPersonRepository } from './drizzle-guest-person-repository'

const eventId = crypto.randomUUID()
const otroEventId = crypto.randomUUID()
const grupoId = crypto.randomUUID()
const otroGrupoId = crypto.randomUUID()

const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

const evento = (id: string, slug: string) => ({
  id,
  slug,
  title: `Evento ${slug}`,
  eventDate: '2027-05-15',
  rsvpDeadline: '2027-05-01',
  locale: 'es' as const,
  themeKey: 'clasico',
  status: 'live' as const,
})

beforeAll(async () => {
  await db.insert(events).values([evento(eventId, `personas-${eventId.slice(0, 8)}`), evento(otroEventId, `otras-${otroEventId.slice(0, 8)}`)])
  await db.insert(guestGroups).values([
    { id: grupoId, eventId, label: 'Familia Rojas Peña', seats: 4, tokenHash: hash() },
    { id: otroGrupoId, eventId: otroEventId, label: 'Ajenos', seats: 2, tokenHash: hash() },
  ])
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroEventId))
})

describe('drizzleGuestPersonRepository', () => {
  it('guarda, lee y edita una persona sin perder lo que no cambia', async () => {
    const id = crypto.randomUUID()
    await drizzleGuestPersonRepository.insert({
      id,
      guestGroupId: grupoId,
      fullName: 'Ana Lucía Vega',
      isCompanion: false,
      dietaryNote: 'Sin gluten',
      vip: true,
      attending: 'yes', email: null,
    })

    const leida = await drizzleGuestPersonRepository.findById(id)
    expect(leida?.fullName).toBe('Ana Lucía Vega')
    expect(leida?.vip).toBe(true)
    expect(leida?.attending).toBe('yes')

    await drizzleGuestPersonRepository.update({ ...leida!, attending: 'maybe' })
    expect((await drizzleGuestPersonRepository.findById(id))?.dietaryNote).toBe('Sin gluten')
  })

  it('listar por evento no se lleva personas de otro evento', async () => {
    // Las personas no llevan `event_id`: se unen por su grupo, y así no existe la
    // posibilidad de que una persona apunte a un evento distinto del de su grupo.
    await drizzleGuestPersonRepository.insert({
      id: crypto.randomUUID(),
      guestGroupId: otroGrupoId,
      fullName: 'De otro evento',
      isCompanion: false,
      dietaryNote: null,
      vip: false,
      attending: null, email: null,
    })

    const nuestras = await drizzleGuestPersonRepository.listByEvent(eventId)
    expect(nuestras.every((p) => p.fullName !== 'De otro evento')).toBe(true)
  })

  it('borrar el grupo se lleva a sus personas', async () => {
    const grupoTemporal = crypto.randomUUID()
    await db.insert(guestGroups).values({ id: grupoTemporal, eventId, label: 'Temporal', seats: 2, tokenHash: hash() })
    await drizzleGuestPersonRepository.insert({
      id: crypto.randomUUID(),
      guestGroupId: grupoTemporal,
      fullName: 'Se va con su grupo',
      isCompanion: true,
      dietaryNote: null,
      vip: false,
      attending: null, email: null,
    })

    await db.delete(guestGroups).where(eq(guestGroups.id, grupoTemporal))

    const quedan = await db.select().from(guestPeople).where(eq(guestPeople.guestGroupId, grupoTemporal))
    expect(quedan).toHaveLength(0)
  })

  it('la base rechaza una asistencia inventada', async () => {
    await expect(
      db.insert(guestPeople).values({ guestGroupId: grupoId, fullName: 'X', attending: 'puede-ser' }),
    ).rejects.toThrow()
  })
})

describe('lo que el alta guarda de verdad', () => {
  /**
   * Contra Postgres, no contra un doble. El alta del panel pasaba `attending` y `email`
   * y los dos se perdían por el camino —el caso de uso no los declaraba y el repositorio
   * no los escribía—, sin que el typecheck, el lint ni las pruebas con dobles dijeran una
   * palabra: el objeto viajaba como variable, así que TypeScript no comprueba propiedades
   * de más. La invitación quedaba «Pendiente» para siempre y el correo no se guardaba
   * nunca. Una prueba con un `vi.fn()` no puede cazar esto.
   */
  it('el RSVP y el correo del invitado llegan a la base', async () => {
    const id = crypto.randomUUID()
    await drizzleGuestPersonRepository.insert({
      id,
      guestGroupId: grupoId,
      fullName: 'Roberto Núñez',
      isCompanion: false,
      dietaryNote: null,
      vip: false,
      attending: 'yes',
      email: 'roberto@correo.bo',
    })

    const [fila] = await db.select().from(guestPeople).where(eq(guestPeople.id, id))
    expect(fila?.attending).toBe('yes')
    expect(fila?.email).toBe('roberto@correo.bo')
  })

  it('editar tampoco pierde el correo', async () => {
    const id = crypto.randomUUID()
    const persona = {
      id,
      guestGroupId: grupoId,
      fullName: 'Lucía Saavedra',
      isCompanion: false,
      dietaryNote: null,
      vip: false,
      attending: 'maybe' as const,
      email: 'lucia@correo.bo',
    }
    await drizzleGuestPersonRepository.insert(persona)
    await drizzleGuestPersonRepository.update({ ...persona, vip: true })

    const [fila] = await db.select().from(guestPeople).where(eq(guestPeople.id, id))
    expect(fila?.email).toBe('lucia@correo.bo')
    expect(fila?.vip).toBe(true)
  })

  it('cuenta las personas del evento, no sus grupos ni las de otra boda', async () => {
    // La insignia de «Invitados» contaba grupos: al borrar al único invitado la pantalla
    // decía «0 invitados» y la barra seguía marcando 1, que era el grupo vacío.
    const antes = await countPeopleByEvent(eventId)
    const id = crypto.randomUUID()
    // **Dos en el mismo grupo**: contando grupos saldría uno, y la prueba daría verde igual.
    for (const [personaId, nombre] of [
      [id, 'Quien se cuenta'],
      [crypto.randomUUID(), 'Y su acompañante'],
    ] as const) {
      await drizzleGuestPersonRepository.insert({
        id: personaId,
        guestGroupId: grupoId,
        fullName: nombre,
        isCompanion: false,
        dietaryNote: null,
        vip: false,
        attending: null,
        email: null,
      })
    }
    await drizzleGuestPersonRepository.insert({
      id: crypto.randomUUID(),
      guestGroupId: otroGrupoId,
      fullName: 'De otra boda',
      isCompanion: false,
      dietaryNote: null,
      vip: false,
      attending: null,
      email: null,
    })

    expect(await countPeopleByEvent(eventId)).toBe(antes + 2)

    await drizzleGuestPersonRepository.remove(id)
    expect(await countPeopleByEvent(eventId)).toBe(antes + 1)
  })
})
