'use server'

// Todas las acciones de este fichero declaran `section: 'checkin'`: son las únicas que el
// personal de puerta puede llamar. Cualquier acción del panel que no diga su sección
// hereda `full`, y `full` deniega a un puerta — el olvido cae del lado seguro.

import { revalidatePath } from 'next/cache'
import { checkin, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import type { CheckinErrorKind } from '@/modules/checkin/domain/errors'
import type { ScanOutcome } from '@/modules/checkin/application/check-in-by-scan'

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
    console.error('modo puerta no incluido en el plan', permitido.error.detail)
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
    })),
  })

  if (isErr(result)) {
    console.error('registro de escaneos rechazado', result.error.kind, result.error.detail)
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
    },
  })

  if (isErr(result)) {
    console.error('registro por grupo rechazado', result.error.kind, result.error.detail)
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
    console.error('corrección rechazada', result.error.kind, result.error.detail)
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
    console.error('deshacer rechazado', result.error.kind, result.error.detail)
    return { status: 'error', kind: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
  return { status: 'success' }
}
