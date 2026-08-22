import { err, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from './errors'
import type { Gift, GiftStatus } from './gift'

export type { GiftStatus }

/**
 * Quién pide el cambio. El invitado llega autorizado por su token y solo puede tocar lo
 * suyo; el atelier llega con sesión y manda sobre toda la lista.
 */
export type GiftActor = { readonly kind: 'atelier' } | { readonly kind: 'guest'; readonly groupId: string }

/**
 * La tabla de la sección 4.1 del diseño, y nada más:
 *
 * | De         | A          | Quién                                  |
 * |------------|------------|----------------------------------------|
 * | available  | reserved   | Invitado, desde su enlace              |
 * | reserved   | available  | El invitado que reservó, o el atelier  |
 * | reserved   | purchased  | Atelier                                |
 * | available  | purchased  | Atelier (llegó sin reservar)           |
 * | purchased  | cualquiera | Nadie: comprado es definitivo          |
 *
 * De quién es el regalo no se ve desde aquí —solo llegan los estados—, así que la regla
 * de propiedad la aplica `transitionGift`, que sí tiene el regalo delante.
 */
export const canTransition = (from: GiftStatus, to: GiftStatus, actor: GiftActor): boolean => {
  // Comprado es definitivo. Va primero para que ninguna regla posterior lo contradiga.
  if (from === 'purchased') return false

  if (to === 'reserved') return from === 'available' && actor.kind === 'guest'
  if (to === 'available') return from === 'reserved'
  return actor.kind === 'atelier'
}

/**
 * Pura: ni reloj ni base. El instante llega como argumento —`at`— justo por eso; la
 * reserva real la resuelve la base con un `UPDATE` condicional y su propio `now()`, y
 * esta función es la regla que el panel comprueba antes de escribir.
 */
export function transitionGift(
  gift: Gift,
  to: GiftStatus,
  actor: GiftActor,
  at: Date,
): Result<Gift, RegistryError> {
  if (gift.status === 'purchased') {
    return err(registryError('already_purchased', 'Este regalo ya está comprado y no vuelve atrás.'))
  }

  // Reservar lo ya reservado es la carrera perdida: el invitado tiene que enterarse de
  // que llegó tarde, aunque sea él mismo quien lo tenía.
  if (to === 'reserved' && gift.status === 'reserved') {
    return err(registryError('already_claimed', 'Este regalo ya lo reservó otro invitado.'))
  }

  // Pedir «disponible» sobre algo que ya lo está es el estado que se pedía: no hay nada
  // que hacer ni nada que reprochar.
  if (to === 'available' && gift.status === 'available') return ok(gift)

  if (!canTransition(gift.status, to, actor)) {
    return err(
      registryError(
        'not_yours',
        actor.kind === 'guest'
          ? 'Eso no lo decide el invitado: la lista la gestiona el atelier.'
          : 'La reserva la hace el invitado desde su enlace, no el atelier.',
      ),
    )
  }

  if (to === 'available' && actor.kind === 'guest' && gift.claimedByGroupId !== actor.groupId) {
    return err(registryError('not_yours', 'Ese regalo lo reservó otro invitado; solo él puede soltarlo.'))
  }

  // `canTransition` ya garantizó que quien reserva es un invitado, pero el compilador no
  // ve a través de ella: la comprobación explícita es lo que ata el `groupId` al tipo.
  if (to === 'reserved' && actor.kind === 'guest') {
    return ok({ ...gift, status: 'reserved', claimedByGroupId: actor.groupId, claimedAt: at })
  }

  if (to === 'available') {
    return ok({ ...gift, status: 'available', claimedByGroupId: null, claimedAt: null })
  }

  // Comprado conserva quién lo había reservado: el regalo ya no está en juego, pero la
  // pareja todavía necesita saber a quién agradecérselo.
  return ok({ ...gift, status: 'purchased' })
}
