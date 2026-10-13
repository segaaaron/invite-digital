'use server'

// Todas las acciones de este fichero declaran `section: 'checkin'`: son las únicas que el
// personal de puerta puede llamar. Cualquier acción del panel que no diga su sección
// hereda `full`, y `full` deniega a un puerta — el olvido cae del lado seguro.

import { revalidatePath } from 'next/cache'
import { checkin, guests, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import type { CheckinErrorKind } from '@/modules/checkin/domain/errors'
import type { ScanOutcome } from '@/modules/checkin/application/check-in-by-scan'
import { registrarFallo } from '@/shared/observability/fallos'

/**
 * El modo puerta solo lo traen algunos planes. Lanza en vez de devolver un resultado
 * porque estas acciones ya tratan así todo lo que no debería pasar: el dispositivo de
 * la puerta guarda el escaneo en su bandeja de salida y lo reintenta.
 *
 * Va en el servidor. Esconder el enlace «Modo puerta» del panel no protege de nada: una
 * Server Action es un extremo HTTP público.
 */
const exigirModoPuerta = async (eventId: string): Promise<void> => {
  const permitido = await plans.requireFeature(eventId, 'checkin')
  if (isErr(permitido)) {
    registrarFallo('checkin/actions', 'modo puerta no incluido en el plan', permitido.error.detail)
    throw new Error(permitido.error.kind)
  }
}

export type ScanInput = {
  scanId: string
  scanned: string
  /** `null` deja que el servidor fije la cantidad con lo confirmado por el grupo. */
  arrivedCount: number | null
  /** Milisegundos desde época: el reloj del dispositivo cruza como número. */
  scannedAtMs: number
  /** Quiénes entraron, si la invitación tiene personas. */
  personIds?: readonly string[] | null
}

/**
 * Recibe el lote acumulado en la bandeja de salida del dispositivo. Devuelve un
 * resultado por `scanId` para que el cliente pueda vaciar solo lo aceptado.
 */
export async function recordScansAction(input: {
  eventId: string
  eventSlug: string
  scans: ScanInput[]
}): Promise<ScanOutcome[]> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug, section: 'checkin' })
  await exigirModoPuerta(input.eventId)

  const result = await checkin.record({
    eventId: input.eventId,
    recordedBy: `user:${actor.userId}`,
    scans: input.scans.map((s) => ({
      scanId: s.scanId,
      scanned: s.scanned,
      arrivedCount: s.arrivedCount,
      scannedAt: new Date(s.scannedAtMs),
      personIds: s.personIds ?? null,
    })),
  })

  if (isErr(result)) {
    registrarFallo('checkin/actions', 'registro de escaneos rechazado', result.error.kind, result.error.detail)
    throw new Error(result.error.kind)
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
  return result.value
}

/**
 * El camino del buscador por nombre. No manda un pase: manda el id del grupo, porque el
 * dispositivo solo tiene el hash del token y un hash no es un pase.
 */
export async function checkInByGroupAction(input: {
  eventId: string
  eventSlug: string
  groupId: string
  scanId: string
  arrivedCount: number | null
  scannedAtMs: number
  personIds?: readonly string[] | null
}): Promise<ScanOutcome> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug, section: 'checkin' })
  await exigirModoPuerta(input.eventId)

  const result = await checkin.recordGroup({
    eventId: input.eventId,
    recordedBy: `user:${actor.userId}`,
    scan: {
      scanId: input.scanId,
      groupId: input.groupId,
      arrivedCount: input.arrivedCount,
      scannedAt: new Date(input.scannedAtMs),
      personIds: input.personIds ?? null,
    },
  })

  if (isErr(result)) {
    registrarFallo('checkin/actions', 'registro por grupo rechazado', result.error.kind, result.error.detail)
    throw new Error(result.error.kind)
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
  return result.value
}

/**
 * Corregir y deshacer devuelven estado, no `void`.
 *
 * La pantalla de la puerta se corrige antes de que el servidor conteste —a la puerta no
 * se la hace esperar—, así que un fallo silencioso deja el contador diciendo una cosa y
 * la base otra durante el resto de la noche. Quien está en la puerta tiene que enterarse
 * en ese momento.
 */
export type DoorActionState = { status: 'success' } | { status: 'error'; kind: CheckinErrorKind }

export async function adjustArrivalAction(input: {
  eventId: string
  scanId: string
  arrivedCount: number
  eventSlug: string
}): Promise<DoorActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug, section: 'checkin' })
  await exigirModoPuerta(input.eventId)

  const result = await checkin.adjust({ eventId: input.eventId, scanId: input.scanId, arrivedCount: input.arrivedCount })
  if (isErr(result)) {
    registrarFallo('checkin/actions', 'corrección rechazada', result.error.kind, result.error.detail)
    return { status: 'error', kind: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
  return { status: 'success' }
}

export async function voidArrivalAction(input: {
  eventId: string
  scanId: string
  eventSlug: string
}): Promise<DoorActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug, section: 'checkin' })
  await exigirModoPuerta(input.eventId)

  const result = await checkin.void({ eventId: input.eventId, scanId: input.scanId })
  if (isErr(result)) {
    registrarFallo('checkin/actions', 'deshacer rechazado', result.error.kind, result.error.detail)
    return { status: 'error', kind: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
  return { status: 'success' }
}

/** Deshacer el ingreso de una persona (o de la invitación sin nombres) registrado por error. */
export async function undoCheckInAction(input: { eventId: string; eventSlug: string; groupId: string; personId: string | null }): Promise<DoorActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug, section: 'checkin' })
  await exigirModoPuerta(input.eventId)

  const result = await checkin.deshacer({ eventId: input.eventId, groupId: input.groupId, personId: input.personId })
  if (isErr(result)) {
    registrarFallo('checkin/actions', 'deshacer ingreso rechazado', result.error.kind, result.error.detail)
    return { status: 'error', kind: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/checkin`)
  return { status: 'success' }
}

export type SinPaseState = { status: 'idle' } | { status: 'error'; message: string } | { status: 'success'; message: string }

/**
 * **Llegó alguien sin pase** (maqueta E68): el acompañante que nadie cargó. Se suma a la invitación con la que
 * viene —su cupo crece solo, como «Otro acompañante»— y entra en ese mismo momento. Así el catering lo cuenta y la
 * puerta lo ve dentro, con nombre, sin inventarle una invitación propia.
 */
export async function registrarSinPaseAction(_previo: SinPaseState, formData: FormData): Promise<SinPaseState> {
  const eventId = String(formData.get('eventId') ?? '')
  const eventSlug = String(formData.get('eventSlug') ?? '')
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId, eventSlug, section: 'checkin' })
  await exigirModoPuerta(eventId)

  const nombre = String(formData.get('nombre') ?? '').trim()
  const groupId = String(formData.get('groupId') ?? '')
  if (nombre === '') return { status: 'error', message: 'Escribe su nombre: así lo ve el catering y la puerta.' }
  if (groupId === '') return { status: 'error', message: 'Elige con quién viene.' }

  const persona = await guests.addPerson({ eventId, guestGroupId: groupId, fullName: nombre, isCompanion: true, attending: 'yes' })
  if (isErr(persona)) {
    registrarFallo('checkin/actions', 'alta sin pase rechazada', persona.error.kind, persona.error.detail)
    return { status: 'error', message: persona.error.detail }
  }

  const entrada = await checkin.recordGroup({
    eventId,
    recordedBy: `user:${actor.userId}`,
    scan: { scanId: crypto.randomUUID(), groupId, arrivedCount: null, scannedAt: new Date(), personIds: [persona.value.id] },
  })
  if (isErr(entrada)) {
    registrarFallo('checkin/actions', 'ingreso sin pase rechazado', entrada.error.kind, entrada.error.detail)
    return { status: 'error', message: `${nombre} quedó en la lista, pero no se pudo marcar su ingreso. Regístralo desde la lista.` }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/checkin`)
  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return { status: 'success', message: `${nombre} entró como acompañante.` }
}
