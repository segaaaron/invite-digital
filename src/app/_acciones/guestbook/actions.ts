'use server'

import { revalidatePath } from 'next/cache'
import { guestbook } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'

export type GuestbookActionResult = { ok: true } | { ok: false; kind: string; message: string }

const fallo = (error: { kind: string; detail: string }): GuestbookActionResult => ({
  ok: false,
  kind: error.kind,
  message: error.detail,
})

// ============================================================================
// TODAS las acciones del libro de firmas son del atelier y empiezan por
// `await requireSession()`. Una Server Action es un extremo HTTP público: vivir detrás
// de un formulario del panel no la protege de nadie.
//
// **Esta rebanada no crea ninguna acción del invitado.** El invitado ya escribió su
// mensaje al confirmar, y aquí solo lee la respuesta. Si añades una escritura sin
// sesión, has abierto una puerta pública nueva que el diseño evitó a propósito.
// ============================================================================

type Target = { responseId: string; eventId: string; eventSlug: string }

/** La bandeja y la página del invitado cambian a la vez: la respuesta se ve en las dos. */
const refrescar = (slug: string) => revalidatePath(`/panel/eventos/${slug}/mensajes`)

export async function replyAction(input: Target & { text: string }): Promise<GuestbookActionResult> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug, section: 'cliente' })

  const result = await guestbook.reply({
    responseId: input.responseId,
    eventId: input.eventId,
    text: input.text,
  })
  if (isErr(result)) return fallo(result.error)

  refrescar(input.eventSlug)
  return { ok: true }
}
