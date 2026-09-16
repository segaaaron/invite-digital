import { and, asc, count, eq, inArray } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { guestGroups, guestPeople } from '@/shared/db/schema'
import type { GuestPersonRepository } from '../application/ports'
import type { Attendance, GuestPerson } from '../domain/person'

type Fila = {
  id: string
  guestGroupId: string
  fullName: string
  isCompanion: boolean
  dietaryNote: string | null
  vip: boolean
  attending: string | null
  email: string | null
}

const COLUMNS = {
  id: guestPeople.id,
  guestGroupId: guestPeople.guestGroupId,
  fullName: guestPeople.fullName,
  isCompanion: guestPeople.isCompanion,
  dietaryNote: guestPeople.dietaryNote,
  vip: guestPeople.vip,
  attending: guestPeople.attending,
  email: guestPeople.email,
} as const

// El CHECK de la tabla es quien garantiza que `attending` solo lleva valores conocidos;
// aquí solo se estrecha el tipo que el driver entrega como cadena.
const aPersona = (fila: Fila): GuestPerson => ({ ...fila, attending: fila.attending as Attendance | null })

/**
 * La persona por su id **y** el evento de su invitación. Las personas no llevan `event_id`
 * a propósito; el evento se comprueba por la invitación, dentro de la misma sentencia.
 */
const delEvento = (database: DbExecutor, eventId: string, id: string) =>
  and(
    eq(guestPeople.id, id),
    inArray(guestPeople.guestGroupId, database.select({ id: guestGroups.id }).from(guestGroups).where(eq(guestGroups.eventId, eventId))),
  )

export const createDrizzleGuestPersonRepository = (database: DbExecutor): GuestPersonRepository => ({
  async insert(person) {
    await database.insert(guestPeople).values({
      id: person.id,
      guestGroupId: person.guestGroupId,
      fullName: person.fullName,
      isCompanion: person.isCompanion,
      dietaryNote: person.dietaryNote,
      vip: person.vip,
      attending: person.attending,
      email: person.email,
    })
  },

  async update(eventId, person) {
    // `guestGroupId` también: mover a alguien es editar este campo, y sin escribirlo el
    // traslado se quedaba en la pantalla. El destino lo valida el caso de uso.
    await database
      .update(guestPeople)
      .set({
        guestGroupId: person.guestGroupId,
        fullName: person.fullName,
        isCompanion: person.isCompanion,
        dietaryNote: person.dietaryNote,
        vip: person.vip,
        attending: person.attending,
        email: person.email,
      })
      .where(delEvento(database, eventId, person.id))
  },

  async remove(eventId, id) {
    await database.delete(guestPeople).where(delEvento(database, eventId, id))
  },

  async listByGroup(guestGroupId) {
    const filas = await database
      .select(COLUMNS)
      .from(guestPeople)
      .where(eq(guestPeople.guestGroupId, guestGroupId))
      .orderBy(asc(guestPeople.createdAt))
    return filas.map(aPersona)
  },

  async listByEvent(eventId) {
    // Une por el grupo: las personas no llevan `event_id` a propósito, para que no exista
    // la posibilidad de que una persona apunte a un evento distinto del de su grupo.
    const filas = await database
      .select(COLUMNS)
      .from(guestPeople)
      .innerJoin(guestGroups, eq(guestGroups.id, guestPeople.guestGroupId))
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(asc(guestGroups.createdAt), asc(guestPeople.createdAt))
    return filas.map(aPersona)
  },

  async countInGroup(guestGroupId) {
    const filas = await database
      .select({ id: guestPeople.id })
      .from(guestPeople)
      .where(eq(guestPeople.guestGroupId, guestGroupId))
    return filas.length
  },

  async findById(eventId, id) {
    const [fila] = await database.select(COLUMNS).from(guestPeople).where(delEvento(database, eventId, id)).limit(1)
    return fila ? aPersona(fila) : null
  },
})

export const drizzleGuestPersonRepository = createDrizzleGuestPersonRepository(db)

/**
 * Cuántas personas hay en el evento, sin traerlas: es la insignia de «Invitados».
 *
 * Cuenta **personas y no grupos**. La insignia contaba grupos, así que al borrar al único
 * invitado la pantalla decía «0 invitados» y la barra seguía marcando 1: lo que quedaba era
 * el grupo, que sin personas sigue siendo válido pero no es un invitado.
 */
export const countPeopleByEvent = async (eventId: string): Promise<number> => {
  const [fila] = await db
    .select({ total: count() })
    .from(guestPeople)
    .innerJoin(guestGroups, eq(guestGroups.id, guestPeople.guestGroupId))
    .where(eq(guestGroups.eventId, eventId))
  return fila?.total ?? 0
}
