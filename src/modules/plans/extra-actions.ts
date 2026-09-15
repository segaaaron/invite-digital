'use server'

import { redirect } from 'next/navigation'
import { orders } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

export type ExtraActionState = { status: 'idle' } | { status: 'error'; message: string }

/**
 * Pide un extra para el evento. Lo pide **el anfitrión** —sección `equipo`—, o su atelier o el
 * admin: es dinero, y un co-anfitrión o una planner no compran por él. El pedido sigue el
 * camino del Plan B: referencia, comprobante y aprobación; al aprobarse se aplica solo.
 */
export async function orderExtraAction(_previo: ExtraActionState, fd: FormData): Promise<ExtraActionState> {
  const actor = await requireSession()
  const eventId = String(fd.get('eventId') ?? '')
  const eventSlug = String(fd.get('eventSlug') ?? '')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'equipo' })

  const pedido = await orders.placeAddon({ addonSlug: String(fd.get('addonSlug') ?? ''), eventId, customerName: actor.email, contact: actor.email })
  if (isErr(pedido)) return { status: 'error', message: pedido.error.kind === 'invalid_input' ? pedido.error.detail : 'No pudimos crear el pedido. Vuelve a intentarlo.' }

  // `redirect` lanza: va fuera de cualquier try, después de escribir.
  redirect(`/es/pedido/ref/${pedido.value.publicRef}`)
}
