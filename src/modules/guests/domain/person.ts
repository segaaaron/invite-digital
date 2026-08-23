import { err, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from './errors'

export const ATTENDANCE = ['yes', 'no', 'maybe'] as const
export type Attendance = (typeof ATTENDANCE)[number]

export type GuestPerson = {
  readonly id: string
  readonly guestGroupId: string
  readonly fullName: string
  readonly isCompanion: boolean
  readonly dietaryNote: string | null
  readonly vip: boolean
  /** Nulo es pendiente: nadie ha dicho nada de esta persona todavía. */
  readonly attending: Attendance | null
}

const MAX_NOMBRE = 160

export function createPerson(input: {
  id: string
  guestGroupId: string
  fullName: string
  isCompanion?: boolean | undefined
  dietaryNote?: string | null | undefined
  vip?: boolean | undefined
  attending?: string | null | undefined
}): Result<GuestPerson, GuestError> {
  const fullName = input.fullName.trim()
  if (fullName === '') return err(guestError('invalid_label', 'La persona necesita un nombre'))
  if (fullName.length > MAX_NOMBRE) {
    return err(guestError('invalid_label', `El nombre no puede pasar de ${MAX_NOMBRE} caracteres`))
  }

  const attending = input.attending ?? null
  if (attending !== null && !ATTENDANCE.includes(attending as Attendance)) {
    return err(guestError('invalid_label', `Asistencia desconocida: ${attending}`))
  }

  const dietary = input.dietaryNote?.trim() ?? ''

  return ok({
    id: input.id,
    guestGroupId: input.guestGroupId,
    fullName,
    isCompanion: input.isCompanion ?? false,
    // Una restricción vacía es no tener restricción, no una cadena en blanco que el
    // reporte del catering agruparía como una categoría propia.
    dietaryNote: dietary === '' ? null : dietary,
    vip: input.vip ?? false,
    attending: attending as Attendance | null,
  })
}

/**
 * El cupo del grupo es el tope. Cargar más personas que cupos no es un detalle estético:
 * el cupo es lo que se le prometió al invitado y lo que la puerta cuenta al escanear.
 */
export function fitsInGroup(seats: number, peopleAlready: number): boolean {
  return peopleAlready < seats
}

export type DietaryLine = { readonly note: string; readonly count: number }

/**
 * El reporte para el catering: cuántos comensales por restricción.
 *
 * Agrupa sin distinguir mayúsculas ni espacios de sobra —«Sin gluten» y «sin  gluten» son
 * la misma cocina— y **solo cuenta a quien no ha dicho que no viene**: cocinar para quien
 * ya avisó de que no asiste es comida a la basura.
 */
export function dietaryReport(people: readonly GuestPerson[]): DietaryLine[] {
  const cuenta = new Map<string, { note: string; count: number }>()

  for (const persona of people) {
    if (persona.dietaryNote === null || persona.attending === 'no') continue
    const clave = persona.dietaryNote.toLowerCase().replace(/\s+/g, ' ').trim()
    const fila = cuenta.get(clave)
    if (fila) fila.count += 1
    else cuenta.set(clave, { note: persona.dietaryNote.replace(/\s+/g, ' ').trim(), count: 1 })
  }

  return [...cuenta.values()].sort((a, b) => b.count - a.count || a.note.localeCompare(b.note, 'es'))
}
