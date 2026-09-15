import type { ReactNode } from 'react'
import { events, guestbook, guests, plans } from '@/app/composition/container'
import { isAdmin, rolEnEquipo } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { panelNav, ROTULO_DE_ROL } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { SupportBanner } from '@/modules/admin/ui/SupportBanner'
import { insigniasDeAdmin } from '../_carcasa/insignias-de-admin'
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

  // Todo lo de la barra en paralelo: eran nueve lecturas en fila antes de pintar nada.
  const [grupos, libro, capacidad, insignias, rolEquipo, mesaPlanner] = await Promise.all([
    activo === null ? null : guests.contar(activo.id).catch(() => null),
    activo === null ? null : guestbook.sinLeer(activo.id).catch(() => null),
    activo === null ? null : plans.allowanceFor(activo.id),
    insigniasDeAdmin(actor),
    actor.role === 'cliente' && activo !== null ? events.staff.membershipsOf(activo.id, actor.userId).then(rolEnEquipo) : null,
    actor.role === 'puerta' || admin ? false : events.staff.eventIdsOf(actor.userId, ['planner']).then((ids) => ids.length > 0),
  ])

  return (
    <PanelFrame
      brandSub={admin ? 'ADMINISTRACIÓN' : 'PANEL'}
      sections={panelNav(activo?.slug ?? null, {
        invitados: grupos,
        sinLeer: libro,
        pedidos: insignias.pedidos,
        consultas: insignias.consultas,
      }, admin, actor.role === 'puerta', actor.role === 'cliente', { equipo: rolEquipo, mesaPlanner })}
      evento={
        activo === null
          ? null
          : {
              title: activo.title,
              planLabel: capacidad === null || isErr(capacidad) ? 'Plan —' : `Plan ${capacidad.value.planSlug}`,
              salirHref: null,
              salirLabel: '',
            }
      }
      user={{ email: actor.email, rol: ROTULO_DE_ROL[actor.role], soporte: actor.soporte !== undefined }}
    >
      {actor.soporte === undefined ? null : <SupportBanner clienteEmail={actor.email} />}
      {children}
    </PanelFrame>
  )
}
