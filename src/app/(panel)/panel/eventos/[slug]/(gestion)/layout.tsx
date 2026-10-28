import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { avisos, checkin, events, identity, plans } from '@/app/composition/container'
import { Campana } from '@/modules/notifications/ui/Campana'
import { BarraSuperior } from '@/modules/shell/ui/BarraSuperior'
import { nombreDePlan } from '../../../_carcasa/nombre-de-plan'
import { fiestaDeTema } from '@/modules/events'
import { gestionaElEvento, isAdmin, rolEnEquipo, sectionForRole } from '@/modules/identity'
import { requireSession, soloParaMirar } from '@/app/_acciones/sesion'
import { ConSoloLectura } from '@/shared/design/ui/panel/solo-lectura'
import { PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { panelNav, rotuloDeRol } from '@/modules/shell/ui/nav'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { SupportBanner } from '@/modules/admin/ui/SupportBanner'
import { MenuCrearMovil } from '@/modules/admin/ui/MenuCrear'
import { MenuMovil } from '@/modules/shell/ui/MenuMovil'
import { BarraDelAdmin } from '@/modules/admin'
import { hasFeature, seccionesFueraDelPlan } from '@/modules/plans'
import { TIPOS_DE_CORTEJO } from '@/modules/planner'
import { insigniasDeAdmin } from '../../../_carcasa/insignias-de-admin'
import { accesoAlAsistente, luxuryParaMejorar } from '../../../_carcasa/asistente'
import { Asistente } from '@/modules/asistente/ui/Asistente'
import { LuxuryBloqueado } from '@/modules/asistente/ui/LuxuryBloqueado'
import { isErr } from '@/shared/result'
import { diaLargo } from '@/shared/format/fecha'
import { portadaParaCompartir } from '@/modules/events/ui/themes/portada-para-compartir'
import { cuandoEs, cuentaAtras } from '../../../_carcasa/cuenta-atras'
import { EyeIcon } from '@/shared/design/ui/icons'

/**
 * La carcasa de todas las páginas de un evento. Vive aquí y no en cada página porque una
 * página puede olvidarla —lo hicieron ocho— y entonces el panel cambia de forma al pasar
 * de sección.
 *
 * Fuera del grupo `(gestion)` quedan a propósito el modo puerta, que tiene su propio
 * diseño a pantalla completa, y el plan del banquete, que es papel para imprimir.
 */
export default async function EventoLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const actor = await requireSession()
  const [t, locale] = await Promise.all([tr(), idiomaDeLaPeticion()])
  const { slug } = await params

  // La carcasa envuelve al check-in, al panel del cliente y al del atelier, así que pide
  // **la sección del rol de quien entra**: con una fija, dos de los tres se quedarían
  // fuera antes de llegar a su propia pantalla. El corte de cada sección lo hace cada
  // página, no este layout.
  //
  // Un atelier que no es dueño puede ser la planner de ese evento: entra por su pertenencia.
  const primero = await events.getFor(actor, slug, { section: sectionForRole(actor.role) })
  const event = isErr(primero) && actor.role === 'atelier' ? await events.getFor(actor, slug, { section: 'cliente' }) : primero
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Las insignias de la barra, en paralelo: eran once lecturas en fila. Si una falla, la barra
  // se pinta sin ella: un contador no es motivo para tumbar la página que lo rodea.
  const id = event.value.id
  const dueno = gestionaElEvento(actor, event.value)
  // La campana: la recepción no recibe avisos, y en modo soporte abrirla dejaría vistos los del cliente.
  const conCampana = actor.role !== 'puerta' && actor.soporte === undefined
  // Sin insignia en «Invitados» (16 oct): era el total, y una insignia se lee como algo pendiente.
  const [capacidad, insignias, equipo, mesaPlanner, sinVer, misEventos, nombre] = await Promise.all([
    plans.allowanceFor(id),
    insigniasDeAdmin(actor),
    // Quien entra por pertenencia ve la barra de su papel en el equipo.
    dueno || actor.role === 'puerta' ? null : events.staff.de(actor, id).then(rolEnEquipo),
    actor.role === 'puerta' ? false : events.staff.eventIdsOf(actor.userId, ['planner']).then((ids) => ids.length > 0),
    conCampana ? avisos.sinVer(actor.userId).catch(() => 0) : 0,
    // El cliente que compró otro evento elige en «Mis eventos».
    actor.role === 'cliente' && actor.soporte === undefined
      ? events.staff.eventIdsOf(actor.userId, ['cliente', 'coanfitrion', 'planner']).then((ids) => ids.length > 1).catch(() => false)
      : false,
    // El nombre con que firma la tarjeta de quien entró.
    identity.nombreDe(actor.userId),
  ])
  const fiesta = fiestaDeTema(event.value.themeKey)
  const campana = conCampana ? <Campana clavePublica={avisos.clavePublica} sinVer={sinVer} /> : null
  // La capacidad ya leída dice si trae puerta: `requireFeature` la volvía a calcular entera.
  const puerta = !isErr(capacidad) && hasFeature(capacidad.value, 'checkin') ? await checkin.state(id) : null
  const nombreDelPlan = isErr(capacidad) ? null : await nombreDePlan(capacidad.value.planSlug)
  // Luxury: solo si el plan lo trae y quien entra lleva el evento (la ruta vuelve a comprobarlo todo).
  const conAsistente = (await accesoAlAsistente(actor, slug)) !== null
  // Sin Luxury en su evento, quien podría usarlo lo ve con candado y sabe cómo conseguirlo.
  const luxuryBloqueado = conAsistente ? null : await luxuryParaMejorar(actor, slug)

  // Lo celebrado queda para mirar: aviso arriba y los botones de guardar apagados (el corte, en las acciones).
  const celebrado = soloParaMirar(actor, event.value.eventDate)

  // El admin dentro de un evento sigue en su barra de siempre, con «Eventos» marcado (E35): la ficha es una pantalla más.
  const sections = isAdmin(actor)
    ? panelNav(null, { pedidos: insignias.pedidos, consultas: insignias.consultas }, true, false, false, { t })
    : panelNav(event.value.slug, {
        llegadas: puerta === null || isErr(puerta) ? null : puerta.value.tally.arrivedGroups,
        pedidos: insignias.pedidos,
        consultas: insignias.consultas,
      }, isAdmin(actor), actor.role === 'puerta', actor.role === 'cliente' || equipo !== null, { equipo, mesaPlanner, misEventos, fueraDelPlan: isErr(capacidad) ? [] : seccionesFueraDelPlan(capacidad.value), cortejo: TIPOS_DE_CORTEJO[fiestaDeTema(event.value.themeKey)].length > 0, t })

  return (
    <PanelFrame
      aviso={actor.soporte === undefined ? null : <SupportBanner cliente={actor.soporte.eventoSinCliente === undefined ? (nombre ?? actor.email) : t('el anfitrión del evento (sin cliente)', 'the event host (no client)')} />}
      barra={
        isAdmin(actor) ? (
          <BarraDelAdmin campana={campana} evento={event.value.title} hoy={diaLargo(new Date(), locale)} menu={<MenuMovil crear={<MenuCrearMovil />} />} />
        ) : actor.role === 'puerta' ? (
          <BarraSuperior>{campana}</BarraSuperior>
        ) : (
          <BarraSuperior
            arriba={
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line-panel-strong bg-bg-raised px-4.5 text-[14.5px] font-medium text-ink no-underline transition-colors hover:border-gold hover:text-shell-deep" href={`/dashboard/events/${event.value.slug}/preview`}>
                <EyeIcon className="size-[18px]" />
                {t('Ver mi invitación', 'View my invitation')}
              </Link>
            }
            enElCelular={
              <Link aria-label={t('Ver mi invitación', 'View my invitation')} className="grid size-11 place-items-center rounded-xl text-ink" href={`/dashboard/events/${event.value.slug}/preview`}>
                <EyeIcon className="size-[22px]" />
              </Link>
            }
            izquierda={cuentaAtras(fiesta, event.value.eventDate, new Date(), locale)}
          >
            {campana}
          </BarraSuperior>
        )
      }
      brandSub={isAdmin(actor) ? t('Ficha del evento', 'Event record') : 'PANEL'}
      conBuscador={isAdmin(actor)}
      sections={sections}
      evento={isAdmin(actor) ? null : {
        title: event.value.title,
        planLabel: nombreDelPlan === null ? 'Plan —' : `Plan ${nombreDelPlan}`,
        cuando: cuandoEs(fiesta, event.value.eventDate, locale),
        portada: portadaParaCompartir(event.value.themeKey),
        // A dónde vuelve cada uno: el admin a la cartera, el atelier a su bandeja. El cliente y
        // la puerta no tienen «fuera»: su panel es este evento.
        salirHref: isAdmin(actor) ? '/dashboard/admin/events' : actor.role === 'atelier' || misEventos ? '/dashboard' : null,
        salirLabel: isAdmin(actor) ? t('Volver a la administración', 'Back to administration') : t('Volver a mis eventos', 'Back to my events'),
      }}
      user={{ email: actor.email, nombre, rol: rotuloDeRol(actor.role, t), soporte: actor.soporte !== undefined }}
    >
      {celebrado ? (
        <div className="mb-4">
          <PanelAlert tone="info">
            {t('Este evento ya se celebró. Todo queda guardado para que lo mires; ya no se puede cambiar nada y los enlaces de la invitación ya no abren. Si hace falta corregir algo, escríbele a tu atelier.', 'This event has already taken place. Everything stays saved for you to look at; nothing can be changed and the invitation links no longer open. If something needs fixing, message your atelier.')}
          </PanelAlert>
        </div>
      ) : null}
      <ConSoloLectura activa={celebrado}>
        <div className="contents" data-solo-lectura={celebrado ? '' : undefined}>
          {children}
        </div>
      </ConSoloLectura>
      {conAsistente ? <Asistente destinos={sections.flatMap((s) => s.items.map((i) => i.href))} eventId={event.value.id} slug={event.value.slug} /> : null}
      {luxuryBloqueado === null ? null : <LuxuryBloqueado comoExtra={luxuryBloqueado.comoExtra} mejorar={luxuryBloqueado.mejorar} planes={luxuryBloqueado.planes} />}
    </PanelFrame>
  )
}
