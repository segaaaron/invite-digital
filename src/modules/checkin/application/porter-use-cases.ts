import { timingSafeEqual } from 'node:crypto'
import { err, ok, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import {
  cabeUnoMas,
  generarPin,
  HORAS_ANTES_POR_DEFECTO,
  HORAS_DESPUES_POR_DEFECTO,
  leerPortero,
  MAX_INTENTOS_PIN,
  MINUTOS_BLOQUEO,
  ventanaAbierta,
} from '../domain/porter'
import type { PorterRow, PorterStore } from './ports'

type Deps = { porters: PorterStore; minter: Minter; clock: () => Date; random: (n: number) => Uint8Array }

export type AddPorterError =
  | { readonly kind: 'invalid_field'; readonly campo: 'name' | 'phone' | 'gate'; readonly detail: string }
  | { readonly kind: 'limit_reached'; readonly detail: string }

/** Por qué un portero no entra. Enlace desconocido y PIN incorrecto dicen lo mismo a propósito. */
export type PorterAccessError = 'invalido' | 'bloqueado' | 'fuera_de_horario' | 'quitado'

export type PorterSession = {
  readonly porterId: string
  readonly eventId: string
  readonly eventSlug: string
  readonly eventTitle: string
  readonly name: string
  readonly gate: string | null
}

/**
 * El PIN se guarda atado a su enlace (`token:pin`): un PIN de seis dígitos solo no sirve de
 * nada sin el enlace, y el hash de uno no dice nada del otro.
 */
const hashDelPin = (minter: Minter, token: string, pin: string): Buffer => minter.hashOf(`${token}:${pin}`)

/**
 * Suma un portero. Devuelve **una sola vez** el enlace y el PIN: en la base solo quedan
 * sus hashes, así que no hay forma de volver a enseñarlos.
 *
 * El cupo lo decide el plan (`limit`), y se comprueba contra los activos: quitar a uno
 * deja su hueco libre.
 */
export const addPorter =
  (deps: Deps) =>
  async (input: {
    eventId: string
    limit: number | null
    createdByUserId: string | null
    name: string
    phone: string
    gate: string
  }): Promise<Result<{ id: string; token: string; pin: string }, AddPorterError>> => {
    const limpio = leerPortero(input)
    if (!limpio.ok) return err({ kind: 'invalid_field', campo: limpio.error.campo, detail: limpio.error.mensaje })

    const actuales = await deps.porters.countActive(input.eventId)
    if (!cabeUnoMas(input.limit, actuales)) {
      return err({
        kind: 'limit_reached',
        detail: input.limit === 0 ? 'Tu plan no incluye personal de recepción.' : `Tu plan admite hasta ${input.limit} personas de recepción a la vez.`,
      })
    }

    const { token, hash } = deps.minter.mint()
    const pin = generarPin(deps.random(4))
    const id = await deps.porters.add({
      eventId: input.eventId,
      ...limpio.value,
      tokenHash: hash,
      pinHash: hashDelPin(deps.minter, token, pin),
      opensHoursBefore: HORAS_ANTES_POR_DEFECTO,
      closesHoursAfter: HORAS_DESPUES_POR_DEFECTO,
      createdByUserId: input.createdByUserId,
    })
    return ok({ id, token, pin })
  }

export const listPorters = (deps: Pick<Deps, 'porters'>) => (eventId: string) => deps.porters.listActive(eventId)

/** Cuántas llegadas registró cada portero del evento: el anfitrión ve quién dejó entrar a quién. */
export const porterActivity = (deps: Pick<Deps, 'porters'>) => (eventId: string) => deps.porters.arrivalsByPorter(eventId)

export const revokePorter = (deps: Pick<Deps, 'porters' | 'clock'>) => (eventId: string, porterId: string) =>
  deps.porters.revoke(porterId, eventId, deps.clock())

/**
 * Lo que se comprueba siempre, con o sin PIN: que el enlace exista, que no esté quitado,
 * que no esté bloqueado y que sea su hora. **La ventana va antes que el PIN** para que
 * probar fuera de horario no gaste intentos.
 */
const comprobarAcceso = (deps: Pick<Deps, 'clock'>, fila: PorterRow | null): Result<PorterRow, PorterAccessError> => {
  if (fila === null) return err('invalido')
  if (fila.revokedAt !== null) return err('quitado')
  const ahora = deps.clock()
  if (fila.lockedUntil !== null && fila.lockedUntil > ahora) return err('bloqueado')
  const abierta = ventanaAbierta({
    eventDate: fila.eventDate,
    ahora,
    horasAntes: fila.opensHoursBefore,
    horasDespues: fila.closesHoursAfter,
  })
  return abierta ? ok(fila) : err('fuera_de_horario')
}

const sesionDe = (fila: PorterRow): PorterSession => ({
  porterId: fila.id,
  eventId: fila.eventId,
  eventSlug: fila.eventSlug,
  eventTitle: fila.eventTitle,
  name: fila.name,
  gate: fila.gate,
})

/**
 * Entrar con el PIN. El fallo **se cuenta antes de responder**, en la base, y al quinto se
 * bloquea quince minutos: seis dígitos se prueban solos si nadie los cuenta. La
 * comparación es en tiempo constante.
 */
export const enterWithPin =
  (deps: Deps) =>
  async (input: { token: string; pin: string }): Promise<Result<PorterSession, PorterAccessError>> => {
    const fila = await deps.porters.findByTokenHash(deps.minter.hashOf(input.token))
    const acceso = comprobarAcceso(deps, fila)
    if (!acceso.ok) return acceso

    const esperado = acceso.value.pinHash
    const entrante = hashDelPin(deps.minter, input.token, input.pin.trim())
    const coincide = entrante.length === esperado.length && timingSafeEqual(entrante, esperado)
    if (!coincide) {
      const bloqueo = new Date(deps.clock().getTime() + MINUTOS_BLOQUEO * 60_000)
      await deps.porters.registerFailure(acceso.value.id, bloqueo, MAX_INTENTOS_PIN)
      return err('invalido')
    }

    if (acceso.value.failedAttempts > 0) await deps.porters.resetFailures(acceso.value.id)
    return ok(sesionDe(acceso.value))
  }

/**
 * El portero que ya entró, en cada petición. Se vuelve a comprobar todo salvo el PIN:
 * quitarlo o que acabe su ventana lo saca aunque tenga la pantalla abierta.
 */
export const resolvePorter =
  (deps: Pick<Deps, 'porters' | 'minter' | 'clock'>) =>
  async (token: string): Promise<Result<PorterSession, PorterAccessError>> => {
    const acceso = comprobarAcceso(deps, await deps.porters.findByTokenHash(deps.minter.hashOf(token)))
    return acceso.ok ? ok(sesionDe(acceso.value)) : acceso
  }
