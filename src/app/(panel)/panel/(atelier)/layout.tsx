import type { ReactNode } from 'react'
import { avisos, events, guests, plans } from '@/app/composition/container'
import { Campana } from '@/modules/notifications/ui/Campana'
import { BarraSuperior } from '@/modules/shell/ui/BarraSuperior'
import { isAdmin, rolEnEquipo } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { barraDelEvento, panelNav, ROTULO_DE_ROL } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { SupportBanner } from '@/modules/admin/ui/SupportBanner'
import { BarraDelAdmin } from '@/modules/admin'
import { insigniasDeAdmin } from '../_carcasa/insignias-de-admin'
import { nombreDePlan } from '../_carcasa/nombre-de-plan'
import { isErr } from '@/shared/result'
import { seccionesFueraDelPlan } from '@/modules/plans'

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
  const conCampana = actor.role !== 'puerta' && actor.soporte === undefined
  const [grupos, capacidad, insignias, rolEquipo, mesaPlanner, sinVer] = await Promise.all([
    // Personas, como dentro del evento: aquí decía 8 (invitaciones) y allí 27 (personas).
    activo === null ? null : guests.contarPersonas(activo.id).catch(() => null),
    activo === null ? null : plans.allowanceFor(activo.id),
    insigniasDeAdmin(actor),
    actor.role === 'cliente' && activo !== null ? events.staff.de(actor, activo.id).then(rolEnEquipo) : null,
    actor.role === 'puerta' || admin ? false : events.staff.eventIdsOf(actor.userId, ['planner']).then((ids) => ids.length > 0),
    conCampana ? avisos.sinVer(actor.userId).catch(() => 0) : 0,
  ])
  const campana = conCampana ? <Campana clavePublica={avisos.clavePublica} sinVer={sinVer} /> : null

  const nombreDelPlan = capacidad === null || isErr(capacidad) ? null : await nombreDePlan(capacidad.value.planSlug)

  const sections = panelNav(activo?.slug ?? null, {
    invitados: grupos,
    pedidos: insignias.pedidos,
    consultas: insignias.consultas,
  }, admin, actor.role === 'puerta', actor.role === 'cliente', { equipo: rolEquipo, mesaPlanner, misEventos: actor.role === 'cliente' && listed !== null && !isErr(listed) && listed.value.length > 1, fueraDelPlan: capacidad === null || isErr(capacidad) ? [] : seccionesFueraDelPlan(capacidad.value) })
  // Quien tiene un evento navega con la misma barra de abajo que dentro de él (Mi cuenta, la ayuda…):
  // antes aquí volvía la barra oscura con «Menú» de antes del 6 de octubre.
  const barra = admin ? actor.soporte === undefined : activo !== null && actor.role !== 'puerta' ? barraDelEvento(activo.slug, sections, 'equipo') : false

  return (
    <PanelFrame
      conAcciones={campana !== null && !admin}
      barraInferior={barra}
      brandSub={admin ? 'ADMINISTRACIÓN' : 'PANEL'}
      sections={sections}
      evento={
        activo === null
          ? null
          : {
              title: activo.title,
              planLabel: nombreDelPlan === null ? 'Plan —' : `Plan ${nombreDelPlan}`,
              salirHref: null,
              salirLabel: '',
            }
      }
      user={{ email: actor.email, rol: ROTULO_DE_ROL[actor.role], soporte: actor.soporte !== undefined }}
    >
      {actor.soporte === undefined ? null : <SupportBanner clienteEmail={actor.soporte.eventoSinCliente === undefined ? actor.email : 'anfitrión del evento (sin cliente)'} />}
      {admin ? (
        <BarraDelAdmin campana={campana} />
      ) : activo !== null && actor.role !== 'puerta' ? (
        <BarraSuperior titulo={activo.title}>{campana}</BarraSuperior>
      ) : campana === null ? null : (
        <BarraSuperior>{campana}</BarraSuperior>
      )}
      {children}
    </PanelFrame>
  )
}
