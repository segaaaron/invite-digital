'use server'

import { redirect } from 'next/navigation'
import { orders, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import { extraDisponible, type ExtraNoDisponible } from '@/modules/plans/domain/extras'
import { campo } from '@/shared/forms/campo'

const NO_DISPONIBLE: Record<ExtraNoDisponible, string> = {
  incluido: 'Tu evento ya lo tiene.',
  requiere_plan: 'Este extra es para el plan Firma 3D. Cambia de plan para tenerlo.',
}

export type ExtraActionState = { status: 'idle' } | { status: 'error'; message: string }

/**
 * Pide un extra para el evento. Lo pide **el anfitrión** —sección `equipo`—, o su atelier o el
 * admin: es dinero, y un co-anfitrión o una planner no compran por él. El pedido sigue el
 * camino del Plan B: referencia, comprobante y aprobación; al aprobarse se aplica solo.
 */
export async function orderExtraAction(_previo: ExtraActionState, fd: FormData): Promise<ExtraActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'equipo' })

  // El corte va aquí y no solo en la pantalla: la acción es un extremo público y el plan del
  // evento lo decide el servidor. Se mira con los extras ya aprobados dentro.
  const addonSlug = campo(fd, 'addonSlug')
  const extra = (await plans.listActiveExtras()).find((x) => x.slug === addonSlug)
  if (extra === undefined) return { status: 'error', message: 'Ese extra no está a la venta.' }
  const capacidad = await plans.allowanceFor(eventId)
  if (isErr(capacidad)) return { status: 'error', message: 'No pudimos leer tu plan. Vuelve a intentarlo en un momento.' }
  const disponible = extraDisponible(capacidad.value, extra.effect)
  if (!disponible.ok) return { status: 'error', message: NO_DISPONIBLE[disponible.motivo] }

  // Con un pedido abierto del mismo extra, `placeAddon` devuelve ese: pedir dos veces lleva al mismo.
  const pedido = await orders.placeAddon({ addonSlug, eventId, customerName: actor.email, contact: actor.email })
  if (isErr(pedido)) return { status: 'error', message: pedido.error.kind === 'invalid_input' ? pedido.error.detail : 'No pudimos crear el pedido. Vuelve a intentarlo.' }

  // `redirect` lanza: va fuera de cualquier try, después de escribir.
  redirect(`/es/pedido/ref/${pedido.value.publicRef}`)
}
