import { drizzleAcompanamiento } from '@/modules/admin/infrastructure/drizzle-acompanamiento'
import { createTokenMinter } from '@/shared/security/tokens'

const minter = createTokenMinter()

// **Sin correos de acompañamiento** (28 de septiembre, pedido del usuario: el correo es solo para las
// cuentas). Aquí queda la encuesta de opinión, que siguen abriendo los enlaces ya enviados.

/** La encuesta de un enlace de opinión. `null` si el enlace no existe. */
export const leerEncuesta = (token: string) => drizzleAcompanamiento.encuesta(minter.hashOf(token))

/** Guarda la opinión, una sola vez. */
export const responderEncuesta = (token: string, respuesta: { rating: number; comment: string | null; allowPublish: boolean }) =>
  drizzleAcompanamiento.responder(minter.hashOf(token), respuesta)

/** Las opiniones de estos eventos, para enseñarlas en el panel. */
export const opinionesDe = (eventIds: readonly string[]) => drizzleAcompanamiento.opiniones(eventIds)
