import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { guestError, type GuestError } from '../domain/errors'
import type { GuestGroupRepository } from './ports'

export type ResentInvitation = { readonly token: string; readonly label: string }

/**
 * Vuelve a repartir la invitación de un grupo: **acuña un token nuevo** y deja el
 * anterior inservible.
 *
 * No hay forma de «volver a enseñar» el enlace viejo —en la base solo estaba su hash— y
 * tampoco sería buena idea: si hizo falta reenviarlo es porque se perdió, y un enlace
 * perdido pudo acabar en cualquier parte. Rotarlo cierra esa puerta.
 *
 * El RSVP y la mesa **no** se tocan: son del grupo, no del token.
 *
 * El **pase de la puerta sí**: el QR del invitado codifica su enlace, y la puerta resuelve
 * por el hash del token. Quien guardó su pase antes del reenvío se planta en la puerta con
 * una tarjeta roja, y un manifiesto descargado antes de la rotación tampoco lo reconoce.
 * Por eso la pantalla lo avisa antes de pulsar, y por eso reenviar no es gratis.
 *
 * Un grupo revocado **no** se reenvía: revocar es una decisión que hay que deshacer a
 * propósito, no de refilón al pulsar «reenviar».
 */
export const resendInvitation =
  (deps: { groups: GuestGroupRepository; minter: Minter; clock: () => Date }) =>
  async (input: { eventId: string; id: string }): Promise<Result<ResentInvitation, GuestError>> =>
    attempt<ResentInvitation, GuestError>(
      async () => {
        const row = await deps.groups.findById(input.eventId, input.id)
        if (row === null) return err(guestError('not_found', 'La invitación no existe'))
        if (row.revokedAt !== null) {
          return err(guestError('revoked', 'Esta invitación está revocada: reactívala antes de volver a repartirla.'))
        }

        const minted = deps.minter.mint()
        await deps.groups.replaceToken(input.eventId, input.id, minted.hash, minted.token)
        await deps.groups.markSent(input.eventId, input.id, deps.clock())

        return ok({ token: minted.token, label: row.label })
      },
      (cause) => guestError('storage_failure', `No se pudo reenviar la invitación: ${String(cause)}`),
    )

/**
 * El enlace de una invitación, **siempre**.
 *
 * Si lo tiene guardado (desde `0062`), ese. Si no —las invitaciones de antes—, se le acuña uno y
 * se guarda **sin invalidar el repartido**: el hash del viejo se conserva (`adoptToken`, `0064`) y
 * los dos abren la misma invitación. Así el panel puede enseñar y copiar un enlace de cualquiera
 * sin dejar fuera al invitado que ya tiene el suyo en el chat.
 *
 * No marca el reparto: enseñar un enlace no es repartirlo.
 */
export const asegurarEnlace =
  (deps: { groups: GuestGroupRepository; minter: Minter }) =>
  async (input: { eventId: string; id: string }): Promise<Result<ResentInvitation, GuestError>> =>
    attempt<ResentInvitation, GuestError>(
      async () => {
        const row = await deps.groups.findById(input.eventId, input.id)
        if (row === null) return err(guestError('not_found', 'La invitación no existe'))
        if (row.revokedAt !== null) return err(guestError('revoked', 'Esta invitación está revocada: reactívala para volver a repartirla.'))

        const guardado = (await deps.groups.tokensOf(input.eventId)).get(input.id)
        if (guardado !== undefined) return ok({ token: guardado, label: row.label })

        const minted = deps.minter.mint()
        await deps.groups.adoptToken(input.eventId, input.id, minted.hash, minted.token)
        return ok({ token: minted.token, label: row.label })
      },
      (cause) => guestError('storage_failure', `No se pudo preparar el enlace: ${String(cause)}`),
    )

/**
 * Enviar la invitación **sin tocar el enlace que el invitado ya tiene**: se reparte por WhatsApp,
 * correo o donde sea, y queda marcada como enviada. El enlace lo da `asegurarEnlace`, así que una
 * invitación de antes de `0062` también se puede repartir: recibe uno nuevo y el viejo sigue
 * abriendo.
 */
export const enviarInvitacion =
  (deps: { groups: GuestGroupRepository; minter: Minter; clock: () => Date }) =>
  async (input: { eventId: string; id: string }): Promise<Result<ResentInvitation, GuestError>> => {
    const enlace = await asegurarEnlace(deps)(input)
    if (isErr(enlace)) return enlace
    await deps.groups.markSent(input.eventId, input.id, deps.clock())
    return enlace
  }
