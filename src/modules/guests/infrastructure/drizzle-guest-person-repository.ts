import { asc, eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
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
}

const COLUMNS = {
  id: guestPeople.id,
  guestGroupId: guestPeople.guestGroupId,
  fullName: guestPeople.fullName,
  isCompanion: guestPeople.isCompanion,
  dietaryNote: guestPeople.dietaryNote,
  vip: guestPeople.vip,
  attending: guestPeople.attending,
} as const

// El CHECK de la tabla es quien garantiza que `attending` solo lleva valores conocidos;
// aquí solo se estrecha el tipo que el driver entrega como cadena.
const aPersona = (fila: Fila): GuestPerson => ({ ...fila, attending: fila.attending as Attendance | null })

export const drizzleGuestPersonRepository: GuestPersonRepository = {
  async insert(person) {
    await db.insert(guestPeople).values({
      id: person.id,
      guestGroupId: person.guestGroupId,
      fullName: person.fullName,
      isCompanion: person.isCompanion,
      dietaryNote: person.dietaryNote,
      vip: person.vip,
      attending: person.attending,
    })
  },

  async update(person) {
    await db
      .update(guestPeople)
      .set({
        fullName: person.fullName,
        isCompanion: person.isCompanion,
        dietaryNote: person.dietaryNote,
        vip: person.vip,
        attending: person.attending,
      })
      .where(eq(guestPeople.id, person.id))
  },

  async remove(id) {
    await db.delete(guestPeople).where(eq(guestPeople.id, id))
  },

  async listByGroup(guestGroupId) {
    const filas = await db
      .select(COLUMNS)
      .from(guestPeople)
      .where(eq(guestPeople.guestGroupId, guestGroupId))
      .orderBy(asc(guestPeople.createdAt))
    return filas.map(aPersona)
  },

  async listByEvent(eventId) {
    // Une por el grupo: las personas no llevan `event_id` a propósito, para que no exista
    // la posibilidad de que una persona apunte a un evento distinto del de su grupo.
    const filas = await db
      .select(COLUMNS)
      .from(guestPeople)
      .innerJoin(guestGroups, eq(guestGroups.id, guestPeople.guestGroupId))
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(asc(guestGroups.createdAt), asc(guestPeople.createdAt))
    return filas.map(aPersona)
  },

  async countInGroup(guestGroupId) {
    const filas = await db
      .select({ id: guestPeople.id })
      .from(guestPeople)
      .where(eq(guestPeople.guestGroupId, guestGroupId))
    return filas.length
  },

  async findById(id) {
    const [fila] = await db.select(COLUMNS).from(guestPeople).where(eq(guestPeople.id, id)).limit(1)
    return fila ? aPersona(fila) : null
  },
}
