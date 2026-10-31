import type { ReactNode } from 'react'
import { avisos, events, identity, plans } from '@/app/composition/container'
import { Campana } from '@/modules/notifications/ui/Campana'
import { BarraSuperior } from '@/modules/shell/ui/BarraSuperior'
import { isAdmin, rolEnEquipo } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { panelNav, rotuloDeRol } from '@/modules/shell/ui/nav'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { SalidaDeSoporte, SupportBanner } from '@/modules/admin/ui/SupportBanner'
import { MenuCrearMovil } from '@/modules/admin/ui/MenuCrear'
import { MenuMovil } from '@/modules/shell/ui/MenuMovil'
import { BarraDelAdmin } from '@/modules/admin'
import { insigniasDeAdmin } from '../_carcasa/insignias-de-admin'
import { nombreDePlan } from '../_carcasa/nombre-de-plan'
import { isErr } from '@/shared/result'
import { seccionesFueraDelPlan } from '@/modules/plans'
import { diaLargo } from '@/shared/format/fecha'
import { fiestaDeTema } from '@/modules/events'
import { portadaParaCompartir } from '@/modules/events/ui/themes/portada-para-compartir'
import { cuandoEs } from '../_carcasa/cuenta-atras'

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
  const [t, locale] = await Promise.all([tr(), idiomaDeLaPeticion()])

  const admin = isAdmin(actor)
  const listed = admin ? null : await events.listFor(actor)
  const activo = listed === null || isErr(listed) ? null : (listed.value[0] ?? null)

  // Todo lo de la barra en paralelo: eran nueve lecturas en fila antes de pintar nada.
  const conCampana = actor.role !== 'puerta' && actor.soporte === undefined
  const [capacidad, insignias, rolEquipo, mesaPlanner, sinVer, nombre] = await Promise.all([
    activo === null ? null : plans.allowanceFor(activo.id),
    insigniasDeAdmin(actor),
    actor.role === 'cliente' && activo !== null ? events.staff.de(actor, activo.id).then(rolEnEquipo) : null,
    actor.role === 'puerta' || admin ? false : events.staff.eventIdsOf(actor.userId, ['planner']).then((ids) => ids.length > 0),
    conCampana ? avisos.sinVer(actor.userId).catch(() => 0) : 0,
    identity.nombreDe(actor.userId),
  ])
  const campana = conCampana ? <Campana clavePublica={avisos.clavePublica} sinVer={sinVer} /> : null

  const nombreDelPlan = capacidad === null || isErr(capacidad) ? null : await nombreDePlan(capacidad.value.planSlug)

  // Un cliente con varios eventos elige cuál organizar: fuera de un evento su barra es solo «Tu cuenta» (E32).
  const variosEventos = actor.role === 'cliente' && listed !== null && !isErr(listed) && listed.value.length > 1
  const sections = variosEventos
    ? [{ label: t('Tu cuenta', 'Your account'), items: [{ href: '/dashboard', label: t('Mis eventos', 'My events'), icon: 'eventos' as const }, { href: '/dashboard/account', label: t('Mi cuenta', 'My account'), icon: 'equipo' as const }] }]
    : panelNav(activo?.slug ?? null, {
    pedidos: insignias.pedidos,
    consultas: insignias.consultas,
  }, admin, actor.role === 'puerta', actor.role === 'cliente', { equipo: rolEquipo, mesaPlanner, misEventos: actor.role === 'cliente' && listed !== null && !isErr(listed) && listed.value.length > 1, fueraDelPlan: capacidad === null || isErr(capacidad) ? [] : seccionesFueraDelPlan(capacidad.value), t })
  return (
    <PanelFrame
      aviso={actor.soporte === undefined ? null : <SupportBanner cliente={actor.soporte.eventoSinCliente === undefined ? (nombre ?? actor.email) : t('el anfitrión del evento (sin cliente)', 'the event host (no client)')} />}
      barra={
        admin ? (
          <BarraDelAdmin campana={campana} hoy={diaLargo(new Date(), locale)} menu={<MenuMovil crear={<MenuCrearMovil />} />} />
        ) : (
          <BarraSuperior izquierda={nombre === null ? undefined : <span className="text-[15px] text-ink-soft">{t('Hola', 'Hi')}, {nombre.split(' ')[0]}</span>}>
            {campana}
            {actor.soporte === undefined ? null : <SalidaDeSoporte />}
          </BarraSuperior>
        )
      }
      brandSub={admin ? 'ADMINISTRACIÓN' : 'PANEL'}
      conBuscador={admin}
      sections={sections}
      evento={
        activo === null || variosEventos
          ? null
          : {
              title: activo.title,
              planLabel: nombreDelPlan === null ? 'Plan —' : `Plan ${nombreDelPlan}`,
              cuando: cuandoEs(fiestaDeTema(activo.themeKey), activo.eventDate, locale),
              portada: portadaParaCompartir(activo.themeKey),
              salirHref: null,
              salirLabel: '',
            }
      }
      user={{ email: actor.email, nombre, rol: rotuloDeRol(actor.role, t), soporte: actor.soporte !== undefined }}
    >
      {children}
    </PanelFrame>
  )
}
