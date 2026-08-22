'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { guests, plans, registry } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'
import type { ContributionMethod } from './domain/fund'

/**
 * Lo que la UI recibe de vuelta. Que un regalo ya esté reservado no es excepcional: es
 * el resultado normal de que dos invitados miren la lista a la vez, y tiene que leerse
 * en la pantalla, no en un error 500.
 */
export type RegistryActionResult = { ok: true; message?: string } | { ok: false; kind: string; message: string }

const fallo = (error: { kind: string; detail: string }): RegistryActionResult => ({
  ok: false,
  kind: error.kind,
  message: error.detail,
})

const refreshPanel = (slug: string) => revalidatePath(`/panel/eventos/${slug}/regalos`)

/**
 * La mesa de regalos solo la traen algunos planes. La comprobación va aquí, en la
 * acción, y no en el dominio de los regalos: qué plan la incluye es una decisión
 * comercial y cambiará sin que las reglas de un regalo cambien.
 *
 * Ocultar la sección del panel no protege de nada: una Server Action es un extremo HTTP
 * público. Por eso el corte está en el servidor.
 */
const sinMesaDeRegalos = async (eventId: string): Promise<RegistryActionResult | null> => {
  const permitido = await plans.requireFeature(eventId, 'registry')
  return isErr(permitido) ? { ok: false, kind: permitido.error.kind, message: permitido.error.detail } : null
}

// ============================================================================
// ACCIONES DEL PANEL — todas empiezan por `await requireSession()`.
//
// Una Server Action es un extremo HTTP público: vivir detrás de un formulario del panel
// no la protege de nadie. Si añades una acción del atelier, va EN ESTE BLOQUE y empieza
// por `requireSession()`. Ponerla en el bloque de abajo la dejaría sin sesión y
// cualquiera con la URL podría borrar la lista de regalos de una boda.
// ============================================================================

export async function addGiftAction(input: {
  eventId: string
  eventSlug: string
  name: string
  priceCents: number
  store: string | null
  url: string | null
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.addGift(input)
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true }
}

export async function updateGiftAction(input: {
  id: string
  eventId: string
  eventSlug: string
  name: string
  priceCents: number
  store: string | null
  url: string | null
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.updateGift(input)
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true }
}

export async function removeGiftAction(input: {
  id: string
  eventId: string
  eventSlug: string
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.removeGift({ id: input.id, eventId: input.eventId })
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true }
}

export async function markPurchasedAction(input: {
  id: string
  eventId: string
  eventSlug: string
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.markPurchased({ id: input.id, eventId: input.eventId })
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true, message: 'Marcado como comprado. Este cambio no tiene vuelta atrás.' }
}

export async function releaseGiftAsAtelierAction(input: {
  id: string
  eventId: string
  eventSlug: string
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.releaseAsAtelier({ id: input.id, eventId: input.eventId })
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true, message: 'Reserva liberada. El regalo vuelve a estar disponible.' }
}

export async function addFundAction(input: {
  eventId: string
  eventSlug: string
  name: string
  description: string | null
  goalCents: number
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.addFund(input)
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true }
}

export async function updateFundAction(input: {
  id: string
  eventId: string
  eventSlug: string
  name: string
  description: string | null
  goalCents: number
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.updateFund(input)
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true }
}

export async function removeFundAction(input: {
  id: string
  eventId: string
  eventSlug: string
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.removeFund({ id: input.id, eventId: input.eventId })
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  const { contributions } = result.value
  return {
    ok: true,
    message:
      contributions === 0
        ? 'Fondo eliminado.'
        : `Fondo eliminado junto a ${contributions} aportación${contributions === 1 ? '' : 'es'}.`,
  }
}

export async function recordContributionAction(input: {
  eventId: string
  eventSlug: string
  fundId: string
  guestGroupId: string | null
  displayName: string
  amountCents: number
  method: ContributionMethod
  message: string | null
}): Promise<RegistryActionResult> {
  await requireSession()

  const cerrado = await sinMesaDeRegalos(input.eventId)
  if (cerrado) return cerrado

  const result = await registry.recordContribution(input)
  if (isErr(result)) return fallo(result.error)

  refreshPanel(input.eventSlug)
  return { ok: true }
}

// ============================================================================
// ACCIONES DEL INVITADO — SIN sesión, a propósito.
//
// El invitado no tiene cuenta y nunca la tendrá: se autoriza con el token de su enlace,
// por el mismo camino que el RSVP (`resolveByToken`). Llamar aquí a `requireSession()`
// redirigiría a todos los invitados al formulario de acceso del atelier.
//
// A cambio, estas dos acciones no pueden hacer NADA fuera del evento de su token: el
// caso de uso comprueba que el regalo sea de ese evento y responde `not_found` —404,
// nunca 403— ante un token desconocido o revocado.
//
// Si lo que vas a añadir es una acción del atelier, va ARRIBA, no aquí.
// ============================================================================

/**
 * La misma puerta, para el invitado. El plan del evento se resuelve desde su token, no
 * desde un `eventId` que la petición podría inventarse.
 *
 * Que el mensaje sea la clase del error y no el detalle es a propósito: el detalle dice
 * qué plan tiene contratado el evento y a cuál habría que subir, y eso es una
 * conversación entre el atelier y su cliente. Al invitado le llega la clase, y la página
 * la traduce al idioma del evento.
 *
 * Un token desconocido no se corta aquí: cae al caso de uso, que responde `not_found`
 * —404, nunca 403— igual que siempre. Distinguirlos confirmaría que el token existe.
 */
const cerradaParaElInvitado = async (token: string): Promise<RegistryActionResult | null> => {
  const group = await guests.resolveByToken(token)
  if (isErr(group)) return null

  const permitido = await plans.requireFeature(group.value.eventId, 'registry')
  return isErr(permitido) ? { ok: false, kind: permitido.error.kind, message: permitido.error.kind } : null
}

// Veinte pulsaciones por minuto y por IP: un invitado indeciso cabe de sobra; recorrer
// tokens ajenos a fuerza bruta, no.
const limiter = createRateLimiter({ windowMs: 60_000, max: 20 })

const ipDeLaPeticion = async (): Promise<string> => {
  const headerBag = await headers()
  return clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })
}

export async function claimGiftAction(input: { token: string; giftId: string }): Promise<RegistryActionResult> {
  if (limiter.isLimited(await ipDeLaPeticion(), Date.now())) {
    return { ok: false, kind: 'rate_limited', message: 'Demasiados intentos. Espera un minuto.' }
  }

  const cerrado = await cerradaParaElInvitado(input.token)
  if (cerrado) return cerrado

  const result = await registry.claim(input)
  if (isErr(result)) {
    // El detalle puede llevar identificadores: se queda en el registro del servidor.
    console.error('reserva rechazada', result.error.kind, result.error.detail)
    return { ok: false, kind: result.error.kind, message: result.error.kind }
  }

  revalidatePath(`/i/${input.token}`)
  return { ok: true }
}

export async function releaseGiftAction(input: { token: string; giftId: string }): Promise<RegistryActionResult> {
  if (limiter.isLimited(await ipDeLaPeticion(), Date.now())) {
    return { ok: false, kind: 'rate_limited', message: 'Demasiados intentos. Espera un minuto.' }
  }

  const cerrado = await cerradaParaElInvitado(input.token)
  if (cerrado) return cerrado

  const result = await registry.release(input)
  if (isErr(result)) {
    console.error('liberación rechazada', result.error.kind, result.error.detail)
    return { ok: false, kind: result.error.kind, message: result.error.kind }
  }

  revalidatePath(`/i/${input.token}`)
  return { ok: true }
}
