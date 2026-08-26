import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { qrError, type QrError } from '../domain/errors'
import { createQrCode, type QrKind } from '../domain/qr-code'
import type { QrRepository, QrRow } from './ports'

type Deps = { qr: QrRepository; ids: () => string; clock: () => Date }

export const listEventQrCodes =
  (deps: Deps) =>
  async (eventId: string): Promise<Result<QrRow[], QrError>> =>
    attempt(
      async () => ok(await deps.qr.listByEvent(eventId)),
      (cause) => qrError('storage_failure', `No se pudieron leer los códigos: ${String(cause)}`),
    )

export const createEventQrCode =
  (deps: Deps) =>
  async (input: {
    userId: string
    eventId: string
    label: string
    kind: QrKind
    target: string
  }): Promise<Result<{ id: string }, QrError>> => {
    const id = deps.ids()
    const code = createQrCode({ id, label: input.label, kind: input.kind, target: input.target, active: true })
    if (isErr(code)) return code

    return attempt(
      async () => {
        await deps.qr.insert({
          id,
          userId: input.userId,
          eventId: input.eventId,
          label: code.value.label,
          kind: code.value.kind,
          target: code.value.target,
        })
        return ok({ id })
      },
      (cause) => qrError('storage_failure', `No se pudo crear el código: ${String(cause)}`),
    )
  }

/**
 * Cambiar el destino de un código **ya impreso**. Es la razón de ser del motor: sin esto,
 * un cartel colgado en el salón con una tienda que cerró no tiene arreglo.
 */
export const updateEventQrCode =
  (deps: Deps) =>
  async (input: {
    eventId: string
    id: string
    label: string
    target: string
  }): Promise<Result<null, QrError>> => {
    const fila = await attempt(
      async () => {
        const row = await deps.qr.findById(input.id)
        return row === null ? err(qrError('not_found', `No existe el código ${input.id}`)) : ok(row)
      },
      (cause) => qrError('storage_failure', `No se pudo leer el código: ${String(cause)}`),
    )
    if (isErr(fila)) return fila

    // El código tiene que ser de este evento. El identificador llega de un formulario, y
    // uno copiado de otra boda no puede escribir aquí.
    if (fila.value.eventId !== input.eventId) {
      return err(qrError('not_found', `El código ${input.id} no es de este evento.`))
    }

    const validado = createQrCode({
      id: input.id,
      label: input.label,
      kind: 'custom',
      target: input.target,
      active: fila.value.active,
    })
    if (isErr(validado)) return validado

    return attempt(
      async () => {
        await deps.qr.update(input.id, { label: validado.value.label, target: validado.value.target })
        return ok(null)
      },
      (cause) => qrError('storage_failure', `No se pudo guardar el código: ${String(cause)}`),
    )
  }

/**
 * Apaga o enciende un código.
 *
 * Apagar, no borrar, es lo que se hace con algo impreso: el cartel sigue en la pared y
 * quien lo escanee tiene que encontrarse un «ya no está disponible», no una redirección a
 * cualquier parte.
 */
export const toggleEventQrCode =
  (deps: Deps) =>
  async (input: { eventId: string; id: string; active: boolean }): Promise<Result<null, QrError>> =>
    attempt(
      async () => {
        const row = await deps.qr.findById(input.id)
        if (row === null || row.eventId !== input.eventId) {
          return err(qrError('not_found', `El código ${input.id} no es de este evento.`))
        }

        await deps.qr.update(input.id, { active: input.active })
        return ok(null)
      },
      (cause) => qrError('storage_failure', `No se pudo cambiar el estado: ${String(cause)}`),
    )

export type ResolvedQr = { readonly target: string }

/**
 * Lo que hace la ruta pública `/r/<id>`.
 *
 * Un código apagado o inexistente devuelve `not_found`, y la ruta responde **404**: quien
 * escanea un cartel viejo no debe acabar en la portada como si nada, ni averiguar que ese
 * identificador existió.
 */
export const resolveQrCode =
  (deps: Deps) =>
  async (id: string): Promise<Result<ResolvedQr, QrError>> =>
    attempt(
      async () => {
        const row = await deps.qr.findById(id)
        if (row === null || !row.active) return err(qrError('not_found', `No existe el código ${id}`))

        await deps.qr.countScan(id, deps.clock())
        return ok({ target: row.target })
      },
      (cause) => qrError('storage_failure', `No se pudo resolver el código: ${String(cause)}`),
    )
