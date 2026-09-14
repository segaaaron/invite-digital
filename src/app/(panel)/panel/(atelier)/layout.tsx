import type { ReactNode } from 'react'
import { events, guestbook, guests, orders, plans } from '@/app/composition/container'
import { unreadCount } from '@/modules/guestbook'
import { isAdmin } from '@/modules/identity/domain/access'
import { requireSession } from '@/modules/identity/session-cookie'
import { panelNav } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { isErr } from '@/shared/result'

/**
 * La carcasa fuera de un evento: la bandeja, el evento nuevo y la ayuda.
 *
 * Enseña la **misma** barra que dentro de un evento, apuntando al evento activo —el de
 * fecha más próxima, que es como los ordena el repositorio—. La maqueta entregada no
 * tiene una barra reducida, y una que encoge al cambiar de página desorienta. Sin ningún
 * evento creado, los enlaces del evento se pintan apagados.
 */
export default async function AtelierLayout({ children }: { children: ReactNode }) {
  const actor = await requireSession()

  const listed = await events.listFor(actor)
  const activo = isErr(listed) ? null : (listed.value[0] ?? null)

  const grupos = activo === null ? null : await guests.list(activo.id)
  const libro = activo === null ? null : await guestbook.list(activo.id)
  const capacidad = activo === null ? null : await plans.allowanceFor(activo.id)

  // La insignia cuenta lo que espera decisión. Un pedido con comprobante y sin mirar es
  // alguien que transfirió y no ha recibido nada.
  const pedidos = await orders.list()
  const porRevisar = isErr(pedidos) ? null : pedidos.value.filter((p) => p.order.status === 'proof_submitted').length

  return (
    <PanelFrame
      brandSub={activo === null ? 'ATELIER' : `EVENTO · ${activo.slug.toUpperCase()}`}
      sections={panelNav(activo?.slug ?? null, {
        invitados: grupos === null || isErr(grupos) ? null : grupos.value.length,
        sinLeer: libro === null || isErr(libro) ? null : unreadCount(libro.value),
        pedidos: porRevisar,
      }, isAdmin(actor), actor.role === 'puerta', actor.role === 'cliente')}
      user={{
        title: activo?.title ?? 'Sin eventos todavía',
        planLabel:
          capacidad === null || isErr(capacidad) ? 'CREA EL PRIMERO' : `PLAN ${capacidad.value.planSlug.toUpperCase()}`,
      }}
    >
      {children}
    </PanelFrame>
  )
}
