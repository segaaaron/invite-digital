'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { admin, asistente, diseno, orders, plans } from '@/app/composition/container'
import { tieneLuxury } from '@/modules/asistente'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import { extraDisponible, type ExtraNoDisponible } from '@/modules/plans/domain/extras'
import { campo } from '@/shared/forms/campo'
import { tr } from '@/shared/i18n/idioma-servidor'
import type { T } from '@/shared/i18n/t'

const noDisponible = (t: T): Record<ExtraNoDisponible, string> => ({
  incluido: t('Tu evento ya lo tiene.', 'Your event already has it.'),
  requiere_plan: t('Este extra es para el plan Gala. Cambia de plan para tenerlo.', 'This extra is for the Gala plan. Change plans to get it.'),
})

export type ExtraActionState = { status: 'idle' } | { status: 'error'; message: string } | { status: 'success'; message: string }

/**
 * Pide un extra para el evento. Lo pide **el anfitrión** —sección `equipo`—, o su atelier o el
 * admin: es dinero, y un co-anfitrión o una planner no compran por él. El pedido sigue el
 * camino del Plan B: referencia, comprobante y aprobación; al aprobarse se aplica solo.
 */
export async function orderExtraAction(_previo: ExtraActionState, fd: FormData): Promise<ExtraActionState> {
  const t = await tr()
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'equipo' })

  // El corte va aquí y no solo en la pantalla: la acción es un extremo público y el plan del
  // evento lo decide el servidor. Se mira con los extras ya aprobados dentro.
  const addonSlug = campo(fd, 'addonSlug')
  const extra = (await plans.listActiveExtras()).find((x) => x.slug === addonSlug)
  if (extra === undefined) return { status: 'error', message: t('Ese extra no está a la venta.', 'That extra is not for sale.') }
  const capacidad = await plans.allowanceFor(eventId)
  if (isErr(capacidad)) return { status: 'error', message: t('No pudimos leer tu plan. Vuelve a intentarlo en un momento.', 'We couldn’t read your plan. Try again in a moment.') }
  // Luxury: no se vende sin modelo configurado ni a un plan que ya lo trae (Admin › Asistente).
  if (extra.effect === 'asistente' && !asistente.disponible) return { status: 'error', message: t('Ese extra no está a la venta.', 'That extra is not for sale.') }
  const conLuxury = extra.effect === 'asistente' ? { ...capacidad.value, asistente: tieneLuxury(capacidad.value, await asistente.config()) } : capacidad.value
  const disponible = extraDisponible(conLuxury, extra.effect, { encargo: (await diseno.leer(eventId)) !== null })
  if (!disponible.ok) return { status: 'error', message: noDisponible(t)[disponible.motivo] }

  // Sin cliente, el evento lo lleva el atelier y su cobro va fuera del sistema (igual que el alta
  // del evento, que no genera pedido): el extra se aplica ya, sin pedido a nombre del admin ni
  // comprobante que subirse a sí mismo. Queda en la auditoría.
  if (actor.soporte?.eventoSinCliente === eventId) {
    const aplicado = await plans.applyExtraWithoutOrder(eventId, addonSlug)
    if (!aplicado) return { status: 'error', message: t('Tu evento ya lo tiene.', 'Your event already has it.') }
    await admin.record(
      { userId: actor.soporte.adminUserId, email: actor.soporte.adminEmail, role: 'admin', mustChangePassword: false },
      { action: 'extra.aplicado', subject: eventSlug || null, detail: `${extra.name} (sin pedido: evento sin cliente)` },
    )
    revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
    return { status: 'success', message: t(`${extra.name}: aplicado al evento. Sin cliente no se genera pedido.`, `${extra.name}: applied to the event. Without a client no order is created.`) }
  }

  // Con un pedido abierto del mismo extra, `placeAddon` devuelve ese: pedir dos veces lleva al mismo.
  const pedido = await orders.placeAddon({ addonSlug, eventId, customerName: actor.email, contact: actor.email })
  if (isErr(pedido)) return { status: 'error', message: pedido.error.kind === 'invalid_input' ? pedido.error.detail : t('No pudimos crear el pedido. Vuelve a intentarlo.', 'We couldn’t create the order. Try again.') }

  // `redirect` lanza: va fuera de cualquier try, después de escribir. Se paga sin salir del panel: el diálogo
  // «Pedir el extra» (maqueta E71) con los datos de la transferencia y la subida del comprobante.
  redirect(`/panel/eventos/${eventSlug}/extras?pedido=${pedido.value.publicRef}`)
}
