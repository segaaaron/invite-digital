import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { avisos, checkin, events, guests, plans } from '@/app/composition/container'
import { Campana } from '@/modules/notifications/ui/Campana'
import { BarraSuperior } from '@/modules/shell/ui/BarraSuperior'
import { nombreDePlan } from '../../../_carcasa/nombre-de-plan'
import { fiestaDeTema } from '@/modules/events'
import { gestionaElEvento, isAdmin, rolEnEquipo, sectionForRole } from '@/modules/identity'
import { requireSession, soloParaMirar } from '@/app/_acciones/sesion'
import { ConSoloLectura } from '@/shared/design/ui/panel/solo-lectura'
import { PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { barraDelEvento, panelNav, ROTULO_DE_ROL } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { SupportBanner } from '@/modules/admin/ui/SupportBanner'
import { BarraDelAdmin } from '@/modules/admin'
import { EntrarComoCliente } from '@/modules/admin/ui/EntrarComoCliente'
import { hasFeature, seccionesFueraDelPlan } from '@/modules/plans'
import { TIPOS_DE_CORTEJO } from '@/modules/planner'
import { insigniasDeAdmin } from '../../../_carcasa/insignias-de-admin'
import { accesoAlAsistente, luxuryParaMejorar } from '../../../_carcasa/asistente'
import { Asistente } from '@/modules/asistente/ui/Asistente'
import { LuxuryBloqueado } from '@/modules/asistente/ui/LuxuryBloqueado'
import { isErr } from '@/shared/result'
import { fechaEnBolivia } from '@/shared/format/fecha'
import { ArrowLeftIcon } from '@/shared/design/ui/icons'

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
  const [personas, capacidad, insignias, equipo, mesaPlanner, sinVer, misEventos] = await Promise.all([
    // Personas, no grupos: la insignia dice «Invitados» y un grupo sin nadie dentro no lo es.
    guests.contarPersonas(id).catch(() => null),
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
  ])
  const campana = conCampana ? <Campana clavePublica={avisos.clavePublica} sinVer={sinVer} /> : null
  // La capacidad ya leída dice si trae puerta: `requireFeature` la volvía a calcular entera.
  const anfitriones = isAdmin(actor) ? ((await events.staff.hostsOf([id])).get(id) ?? []) : []
  const puerta = !isErr(capacidad) && hasFeature(capacidad.value, 'checkin') ? await checkin.state(id) : null
  const nombreDelPlan = isErr(capacidad) ? null : await nombreDePlan(capacidad.value.planSlug)
  // Luxury: solo si el plan lo trae y quien entra lleva el evento (la ruta vuelve a comprobarlo todo).
  const conAsistente = (await accesoAlAsistente(actor, slug)) !== null
  // Sin Luxury en su evento, quien podría usarlo lo ve con candado y sabe cómo conseguirlo.
  const luxuryBloqueado = conAsistente ? null : await luxuryParaMejorar(actor, slug)

  // Lo celebrado queda para mirar: aviso arriba y los botones de guardar apagados (el corte, en las acciones).
  const celebrado = soloParaMirar(actor, event.value.eventDate)

  const sections = panelNav(event.value.slug, {
        invitados: personas,
        llegadas: puerta === null || isErr(puerta) ? null : puerta.value.tally.arrivedGroups,
        pedidos: insignias.pedidos,
        consultas: insignias.consultas,
      }, isAdmin(actor), actor.role === 'puerta', actor.role === 'cliente' || equipo !== null, { equipo, mesaPlanner, misEventos, fueraDelPlan: isErr(capacidad) ? [] : seccionesFueraDelPlan(capacidad.value), cortejo: TIPOS_DE_CORTEJO[fiestaDeTema(event.value.themeKey)].length > 0 })

  return (
    <PanelFrame
      // En el celular, la navegación abajo: Inicio · Invitados · Enviar · Ingreso · Más (6 de octubre).
      barraInferior={barraDelEvento(event.value.slug, sections, isAdmin(actor) ? 'admin' : actor.role === 'puerta' ? 'puerta' : 'equipo')}
      conAcciones={campana !== null && !isAdmin(actor)}
      brandSub={isAdmin(actor) ? 'FICHA DEL EVENTO · ADMIN' : 'PANEL'}
      sections={sections}
      evento={{
        title: event.value.title,
        planLabel: nombreDelPlan === null ? 'Plan —' : `Plan ${nombreDelPlan}`,
        // A dónde vuelve cada uno: el admin a la cartera, el atelier a su bandeja. El cliente y
        // la puerta no tienen «fuera»: su panel es este evento.
        salirHref: isAdmin(actor) ? '/panel/admin/eventos' : actor.role === 'atelier' || misEventos ? '/panel' : null,
        salirLabel: isAdmin(actor) ? 'Volver a la administración' : 'Volver a mis eventos',
      }}
      user={{ email: actor.email, rol: ROTULO_DE_ROL[actor.role], soporte: actor.soporte !== undefined }}
    >
      {actor.soporte === undefined ? null : <SupportBanner clienteEmail={actor.soporte.eventoSinCliente === undefined ? actor.email : 'anfitrión del evento (sin cliente)'} />}
      {/* El admin lleva la suya. Los demás, la del evento: en el celular también es la cabecera, con su
          nombre (la puerta no lleva barra inferior y sigue con la oscura). */}
      {isAdmin(actor) ? (
        <BarraDelAdmin campana={campana} />
      ) : actor.role === 'puerta' ? (
        campana === null ? null : <BarraSuperior>{campana}</BarraSuperior>
      ) : (
        <BarraSuperior subtitulo={cabecera(fiestaDeTema(event.value.themeKey), event.value.eventDate)} titulo={event.value.title}>
          {campana}
        </BarraSuperior>
      )}
      {isAdmin(actor) ? (
        // La ruta, arriba del contenido: de dónde viene esta pantalla y cómo volver.
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {/* En el celular, una sola cabecera: volver, qué fiesta y cuándo, y el nombre (maqueta 6 del panel móvil). */}
          <div className="flex min-w-0 flex-1 basis-full items-center gap-3 min-[860px]:hidden">
            <Link aria-label="Volver a todos los eventos" className="grid size-11 shrink-0 place-items-center rounded-full border border-line-panel bg-white/80 text-ink-soft" href="/panel/admin/eventos">
              <ArrowLeftIcon className="size-4.5" />
            </Link>
            <div className="min-w-0">
              <p className="truncate font-mono text-[11px] tracking-[0.16em] text-gold-deep uppercase">{cabecera(fiestaDeTema(event.value.themeKey), event.value.eventDate)}</p>
              <p className="truncate font-display text-[22px] leading-tight text-ink">{event.value.title}</p>
            </div>
          </div>
          <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-mute max-[859px]:hidden">
            <Link className="hover:text-ink hover:underline" href="/panel/admin/eventos">
              Todos los eventos
            </Link>
            <span aria-hidden>›</span>
            <span className="text-ink-soft">{event.value.title}</span>
          </nav>
          {/* Invitados, envíos y planner son del cliente: se llega entrando como él, desde aquí. */}
          <div className="max-[859px]:w-full max-[859px]:*:w-full">
            <EntrarComoCliente anfitriones={anfitriones} eventId={id} variant="primary" />
          </div>
        </div>
      ) : null}
      {celebrado ? (
        <div className="mb-4">
          <PanelAlert tone="info">
            Este evento ya se celebró. Todo queda guardado para que lo mires y lo descargues; ya no se puede cambiar ni borrar. Sí puedes agradecer los mensajes del libro de firmas.
          </PanelAlert>
        </div>
      ) : null}
      <ConSoloLectura activa={celebrado}>
        <div className="contents" data-solo-lectura={celebrado ? '' : undefined}>
          {children}
        </div>
      </ConSoloLectura>
      {conAsistente ? <Asistente eventId={event.value.id} slug={event.value.slug} /> : null}
      {luxuryBloqueado === null ? null : <LuxuryBloqueado comoExtra={luxuryBloqueado.comoExtra} mejorar={luxuryBloqueado.mejorar} planes={luxuryBloqueado.planes} />}
    </PanelFrame>
  )
}

const FIESTA = { boda: 'Boda', xv: 'XV años', cumple: 'Cumpleaños' } as const

/** Lo que va encima del nombre en la cabecera del celular: «Boda · faltan 6 días». Días de calendario en Bolivia. */
function cabecera(fiesta: keyof typeof FIESTA, fecha: string): string {
  const dias = Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${fechaEnBolivia(new Date())}T00:00:00Z`)) / 86_400_000)
  const cuando = dias > 1 ? `faltan ${dias} días` : dias === 1 ? 'mañana' : dias === 0 ? 'es hoy' : 'ya se celebró'
  return `${FIESTA[fiesta]} · ${cuando}`
}
