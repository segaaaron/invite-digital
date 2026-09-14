import type { ReactNode } from 'react'
import { events, guestbook, guests, leads, orders, plans } from '@/app/composition/container'
import { unreadCount } from '@/modules/guestbook'
import { isAdmin } from '@/modules/identity/domain/access'
import { requireSession } from '@/modules/identity/session-cookie'
import { panelNav } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { isErr } from '@/shared/result'

/**
 * La carcasa fuera de un evento: la bandeja, el evento nuevo y la ayuda.
 *
 * Al atelier le enseña las secciones de su evento activo —el de fecha más próxima, que es
 * como los ordena el repositorio—; sin ninguno, no salen. **Al admin, no**: aquí trabaja
 * sobre todos los eventos, y «evento activo» sería el primero de un atelier cualquiera.
 * Las del evento las ve al entrar en uno.
 */
export default async function AtelierLayout({ children }: { children: ReactNode }) {
  const actor = await requireSession()

  const admin = isAdmin(actor)
  const listed = admin ? null : await events.listFor(actor)
  const activo = listed === null || isErr(listed) ? null : (listed.value[0] ?? null)

  const grupos = activo === null ? null : await guests.list(activo.id)
  const libro = activo === null ? null : await guestbook.list(activo.id)
  const capacidad = activo === null ? null : await plans.allowanceFor(activo.id)

  // La insignia cuenta lo que espera decisión. Un pedido con comprobante y sin mirar es
  // alguien que transfirió y no ha recibido nada.
  const pedidos = await orders.list()
  const porRevisar = isErr(pedidos) ? null : pedidos.value.filter((p) => p.order.status === 'proof_submitted').length
  // Solo para el admin: es el único que ve la bandeja de consultas.
  const consultasNuevas = admin ? await leads.countNew() : null

  return (
    <PanelFrame
      brandSub={admin ? 'ADMINISTRACIÓN' : activo === null ? 'ATELIER' : `EVENTO · ${activo.slug.toUpperCase()}`}
      sections={panelNav(activo?.slug ?? null, {
        invitados: grupos === null || isErr(grupos) ? null : grupos.value.length,
        sinLeer: libro === null || isErr(libro) ? null : unreadCount(libro.value),
        pedidos: porRevisar,
        consultas: consultasNuevas,
      }, admin, actor.role === 'puerta', actor.role === 'cliente')}
      user={{
        title: admin ? 'Administración' : (activo?.title ?? 'Sin eventos todavía'),
        planLabel: admin
          ? 'ADMIN'
          : capacidad === null || isErr(capacidad)
            ? 'CREA EL PRIMERO'
            : `PLAN ${capacidad.value.planSlug.toUpperCase()}`,
      }}
    >
      {children}
    </PanelFrame>
  )
}
