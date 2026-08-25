/**
 * Quién toca recordar hoy, y por qué.
 *
 * Función pura y **sin reloj dentro**: el día entra como argumento, igual que
 * `autoAssign` no llama a `Math.random`. Así la cola de cualquier fecha —la de dentro de
 * tres semanas, la de la víspera del cierre— se reproduce en una prueba sin tocar el
 * reloj del sistema.
 */

const DIA_MS = 86_400_000

/** Se recuerda a quien no ha contestado cuando el cierre entra en esta ventana. */
export const DAYS_BEFORE_DEADLINE = 7

/** Repartido y sin abrir tantos días: el mensaje probablemente no llegó. */
export const DAYS_UNOPENED = 3

/**
 * Nada se recuerda el mismo día en que se repartió el enlace, ni con el cierre encima.
 * Escribir «¿confirmas?» dos horas después de mandar la invitación no es un recordatorio,
 * es meter prisa a alguien que todavía no ha tenido ocasión de mirarla.
 */
export const MIN_DAYS_SINCE_SENT = 1

/**
 * Lo que se espera antes de repetir el **mismo** motivo al mismo grupo. Sin esta espera
 * la cola no encoge nunca y deja de leerse como una lista de tareas del día.
 */
export const QUIET_DAYS = 5

export const REMINDER_KINDS = ['sin_abrir', 'sin_respuesta'] as const
export type ReminderKind = (typeof REMINDER_KINDS)[number]

export type ReminderCandidate = {
  readonly id: string
  readonly label: string
  readonly phone: string | null
  readonly seats: number
  readonly revoked: boolean
  /** Cuándo se repartió el enlace. Nulo = todavía no se ha repartido. */
  readonly sentAt: Date | null
  readonly openedAt: Date | null
  readonly respondedAt: Date | null
  /** Última vez que se recordó cada motivo a este grupo. */
  readonly lastRemindedAt: Partial<Record<ReminderKind, Date>>
}

export type DueReminder = {
  readonly groupId: string
  readonly label: string
  readonly phone: string | null
  readonly seats: number
  readonly kind: ReminderKind
  /** Días que lleva esperando: los que hace que se repartió sin noticias. */
  readonly waitingDays: number
}

function dias(desde: Date, hasta: Date): number {
  return Math.floor((hasta.getTime() - desde.getTime()) / DIA_MS)
}

/**
 * `sin_abrir` gana a `sin_respuesta` cuando el grupo cumple las dos condiciones: quien no
 * abrió el enlace tampoco pudo contestar, y sacarlo dos veces obligaría al atelier a
 * escribirle dos mensajes al mismo número la misma tarde.
 */
function motivo(grupo: ReminderCandidate, deadline: Date, today: Date, esperado: number): ReminderKind | null {
  if (grupo.revoked || grupo.sentAt === null || grupo.respondedAt !== null) return null
  if (esperado < MIN_DAYS_SINCE_SENT) return null

  if (grupo.openedAt === null && esperado >= DAYS_UNOPENED) return 'sin_abrir'

  const faltan = dias(today, deadline)
  if (faltan >= 0 && faltan <= DAYS_BEFORE_DEADLINE) return 'sin_respuesta'

  return null
}

export function dueReminders({
  groups,
  deadline,
  today,
}: {
  groups: readonly ReminderCandidate[]
  deadline: Date
  today: Date
}): DueReminder[] {
  const filas: DueReminder[] = []

  for (const grupo of groups) {
    const esperado = grupo.sentAt === null ? 0 : dias(grupo.sentAt, today)
    const kind = motivo(grupo, deadline, today, esperado)
    if (kind === null) continue

    const ultimo = grupo.lastRemindedAt[kind]
    if (ultimo !== undefined && dias(ultimo, today) < QUIET_DAYS) continue

    filas.push({ groupId: grupo.id, label: grupo.label, phone: grupo.phone, seats: grupo.seats, kind, waitingDays: esperado })
  }

  // Primero lo que lleva más tiempo esperando: es el que más cerca está de convertirse en
  // una silla vacía pagada, o en alguien que aparece sin avisar.
  return filas.sort((a, b) => b.waitingDays - a.waitingDays || a.label.localeCompare(b.label, 'es'))
}
