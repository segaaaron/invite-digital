import { EmptyState } from '@/shared/design/ui/panel/estados'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { analytics, checkin, events, guestbook, guests, planner, plans, registry, rsvp, venue } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { loQueFaltaParaInvitar } from '@/modules/events'
import { avanceDeTareas, estadoDeTarea, pagosQueVencen, proveedoresSinConfirmar, totalesDelPresupuesto } from '@/modules/planner'
import { buildWhatsAppLink } from '@/modules/leads'
import { ThisWeekCard } from '@/modules/planner/ui/ThisWeekCard'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { fecha as diaCorto } from '@/shared/format/fecha'
import { ArrivalStrip } from '@/modules/checkin/ui/ArrivalStrip'
import type { GuestGroupRowView } from '@/modules/guests/ui/invitation-row'
import { gestionaElEvento } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { ActivityFeed, mergeActivity, type ActivityItem } from '@/modules/shell/ui/ActivityFeed'
import { DonutChart, PanelCard, PanelCardLink, StatCard } from '@/shared/design/ui/panel/cards'
import { TimelineChart } from '@/modules/rsvp/ui/TimelineChart'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { CheckIcon, ClockIcon, EyeIcon, MailIcon, PenIcon, QrIcon, UsersIcon, TableIcon } from '@/shared/design/ui/icons'

/** Las dos semanas del gráfico de la maqueta. */
const DIAS_DEL_GRAFICO = 14

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  /**
   * Los primeros pasos, en orden: escribir la invitación, mirarla, publicarla y repartirla.
   *
   * Sin esto se podía crear invitados y mandar enlaces con la invitación en blanco y el evento
   * en borrador, y quien abriera el suyo veía una página de error. La tarjeta desaparece sola
   * cuando los cuatro están hechos.
   */
  const contenidoDelEvento = await events.contentFor(event.value.id, {})
  const invitacionLista = loQueFaltaParaInvitar(contenidoDelEvento).length === 0
  // Quien celebra entra primero a su invitación mientras no esté escrita: al iniciar sesión, desde
  // la barra o desde un enlace. Con ella lista, el resumen. El atelier y el admin ven el resumen.
  if (!invitacionLista && !gestionaElEvento(actor, event.value)) redirect(`/panel/eventos/${event.value.slug}/configuracion`)

  const groups = await guests.list(event.value.id)
  // Las últimas respuestas, en una sola consulta. Una por grupo y en serie convertía el
  // resumen en decenas de viajes a la base cada vez que alguien lo abría.
  const ultimas = await rsvp.latestByEvent(event.value.id)
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : groups.value.map((group) => ({ ...group, confirmed: ultimas.get(group.id)?.attending ?? null }))

  // La maqueta lista **personas** en «Invitados recientes»: nombre, grupo, RSVP,
  // acompañantes y mesa.
  const personasResumen = await guests.listPeople(event.value.id)
  const tally = await rsvp.tally(event.value.id)
  const historial = await rsvp.timeline(event.value.id, DIAS_DEL_GRAFICO)

  // Cuánta gente ha llegado. Solo se lee si el plan trae la puerta: sin ella no hay
  // llegadas que contar, y una tira de ceros haría creer que la recepción ya empezó.
  // La comprobación vive aquí, en la página: `checkin` no sabe nada de planes.
  const conPuerta = await plans.requireFeature(event.value.id, 'checkin')
  const puerta = isErr(conPuerta) ? null : await checkin.state(event.value.id)
  const llegadas = puerta === null || isErr(puerta) ? null : puerta.value.tally

  // Los cupos ya salen en las tarjetas de arriba: repetirlos aquí era ruido.
  const t = isErr(tally) ? null : tally.value
  const respondieron = filas.filter((f) => f.confirmed !== null).length
  const pendientes = filas.length - respondieron
  const noAsisten = filas.filter((f) => f.confirmed === 0).length

  // El salón, para el panel de distribución de mesas del resumen. Si el plan no lo trae,
  // no se pinta: enseñar mesas vacías haría creer que el salón está sin repartir.
  // Los mensajes sin leer, para la acción rápida.
  const libroResumen = await guestbook.list(event.value.id)

  // La actividad reciente se **compone** de lo que ya se registra: mensajes, llegadas y
  // regalos reservados. No hay tabla de actividad, y no hace falta: duplicar esos hechos
  // en un registro aparte crearía dos versiones de la misma verdad.
  const mesaDeRegalos = isErr(await plans.requireFeature(event.value.id, 'registry'))
    ? null
    : await registry.list(event.value.id)

  const actividadMensajes: ActivityItem[] = isErr(libroResumen)
    ? []
    : libroResumen.value.map((mensaje) => ({
        at: mensaje.writtenAt,
        actor: mensaje.groupLabel,
        action: 'dejó un mensaje',
      }))

  const actividadLlegadas: ActivityItem[] =
    puerta === null || isErr(puerta)
      ? []
      : puerta.value.arrivals.map((llegada) => ({
          at: llegada.arrivedAt,
          actor: puerta.value.groups.find((g) => g.id === llegada.guestGroupId)?.label ?? 'Un invitado',
          action: 'llegó al evento',
        }))

  const actividadRegalos: ActivityItem[] =
    mesaDeRegalos === null || isErr(mesaDeRegalos)
      ? []
      : mesaDeRegalos.value.gifts
          .filter((regalo) => regalo.claimedAt !== null)
          .map((regalo) => ({ at: regalo.claimedAt!, actor: regalo.name, action: 'quedó reservado' }))

  const actividad = mergeActivity(actividadMensajes, actividadLlegadas, actividadRegalos)

  // Las visitas a la invitación, que es la cuarta cifra de la maqueta.
  const visitas = await analytics.tally(event.value.id)
  const vistas = isErr(visitas) ? null : visitas.value

  const conSalon = await plans.requireFeature(event.value.id, 'seating')
  const salon = isErr(conSalon) ? null : await venue.seating(event.value.id)
  const mesas = salon === null || isErr(salon) ? null : salon.value

  // «Recientes» son los **últimos** que entraron, no los primeros: el repositorio los
  // devuelve del más viejo al más nuevo, así que hay que darles la vuelta antes de
  // recortar. Y la columna de acompañantes cuenta los del grupo de esa persona; antes
  // decía «Sí/—» sobre la propia fila, así que el titular de una familia de tres salía
  // con un guion.
  const recientes = isErr(personasResumen) ? [] : [...personasResumen.value].reverse().slice(0, 6)
  const acompanantesPorGrupo = new Map<string, number>()
  if (!isErr(personasResumen)) {
    for (const persona of personasResumen.value) {
      if (!persona.isCompanion) continue
      acompanantesPorGrupo.set(persona.guestGroupId, (acompanantesPorGrupo.get(persona.guestGroupId) ?? 0) + 1)
    }
  }

  const fechaDelEvento = new Date(`${event.value.eventDate}T00:00:00`)
  const fecha = fechaDelEvento.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })

  // «Faltan N días» de la maqueta. Se cuenta en días de calendario, no en horas: a doce
  // horas del evento la resta cruda diría «faltan 0 días».
  const hoy = new Date()
  const diasQueFaltan = Math.round(
    (Date.UTC(fechaDelEvento.getFullYear(), fechaDelEvento.getMonth(), fechaDelEvento.getDate()) -
      Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) /
      86_400_000,
  )
  // Los deltas «esta semana» de la maqueta, calculados con lo que ya se mide: grupos
  // creados en los últimos siete días y respuestas recibidas en ese mismo tramo. Nada de
  // porcentajes inventados: si la semana fue en blanco, no se pinta la línea.
  const HACE_UNA_SEMANA = new Date(hoy.getTime() - 7 * 86_400_000)
  const gruposNuevos = filas.filter((fila) => (fila.createdAt?.getTime() ?? 0) >= HACE_UNA_SEMANA.getTime()).length
  const respuestasSemana = isErr(historial)
    ? 0
    : historial.value.slice(-7).reduce((suma, barra) => suma + barra.count, 0)

  // «Esta semana» del planner: tareas y pagos que vencen en siete días o ya vencieron.
  const hoyBolivia = fechaEnBolivia(hoy)
  const tareas = await planner.listTasks(event.value.id)
  const partidas = await planner.listBudget(event.value.id)
  const totales = totalesDelPresupuesto(partidas)
  const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY)
  const dia = (iso: string) => diaCorto(new Date(`${iso}T12:00:00.000Z`))
  // Los proveedores son del anfitrión y su planner: al co-anfitrión no se le ofrecen.
  const dueno = gestionaElEvento(actor, event.value)
  const llevaProveedores = dueno || (await events.staff.membershipsOf(event.value.id, actor.userId)).some((m) => m === 'cliente' || m === 'planner')
  const conProveedores = llevaProveedores && !isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))
  const proveedores = conProveedores ? await planner.dia.listVendors(event.value.id) : []
  const semana = {
    avance: tareas.length === 0 ? null : avanceDeTareas(tareas),
    presupuesto: partidas.length === 0 ? null : { previsto: bs(totales.previsto), comprometido: bs(totales.comprometido), pagado: bs(totales.pagado) },
    tareas: tareas
      .map((t) => ({ t, estado: estadoDeTarea(t, hoyBolivia) }))
      .filter(({ estado }) => estado === 'atrasada' || estado === 'semana')
      .map(({ t, estado }) => ({ id: t.id, title: t.title, vence: dia(t.dueDate!), atrasada: estado === 'atrasada' })),
    marcaPagos: llevaProveedores,
    sinConfirmar: proveedoresSinConfirmar(proveedores).map((v) => ({ id: v.id, service: v.service, whatsappHref: v.whatsapp ? buildWhatsAppLink(v.whatsapp, `Hola, ¿nos confirmas para ${event.value.title}?`) : null })),
    pagos: pagosQueVencen(partidas, hoyBolivia).map((g) => ({ id: g.id, concepto: g.concepto, importe: bs(g.amountCents), vence: dia(g.dueDate!), atrasado: g.dueDate! < hoyBolivia })),
  }

  const cuentaAtras =
    diasQueFaltan > 1 ? `faltan ${diasQueFaltan} días` : diasQueFaltan === 1 ? 'falta un día' : diasQueFaltan === 0 ? 'es hoy' : null

  return (
    <>
      <PanelHeader
        actions={
          <>
            <PanelButton href={`/panel/eventos/${event.value.slug}/configuracion`}>Compartir enlace</PanelButton>
            <PanelButton href={`/panel/eventos/${event.value.slug}/invitados#exportar`}>Exportar lista</PanelButton>
            <PanelButton href={`/panel/eventos/${event.value.slug}/invitados?panel=alta`} variant="primary">
              + Invitar persona
            </PanelButton>
          </>
        }
        highlight={event.value.title}
        kicker="Dashboard / Evento"
        meta={cuentaAtras === null ? fecha : `${fecha} · ${cuentaAtras}`}
        title="Bienvenida, "
      />

      {(() => {
        const pasos = [
          {
            titulo: 'Escribe tu invitación',
            hecho: invitacionLista,
            detalle: 'Los nombres, la fecha, el lugar y la frase. Es lo que verán tus invitados.',
            href: `/panel/eventos/${event.value.slug}/configuracion`,
            accion: 'Escribirla',
          },
          {
            titulo: 'Mírala antes de repartirla',
            hecho: invitacionLista,
            detalle: 'Se abre igual que en el teléfono de un invitado.',
            href: `/panel/eventos/${event.value.slug}/vista-previa`,
            accion: 'Ver la invitación',
          },
          {
            titulo: 'Carga a tus invitados y reparte',
            // Publicar ya no es un paso: preparar el primer enlace publica la invitación.
            hecho: filas.some((f) => f.invitationSentAt !== null && f.invitationSentAt !== undefined),
            detalle: 'Cada invitado recibe su enlace; sus acompañantes entran con el mismo. Al preparar el primero, tu invitación queda publicada.',
            href: `/panel/eventos/${event.value.slug}/invitados`,
            accion: 'Ir a invitados',
          },
        ]
        const siguiente = pasos.find((paso) => !paso.hecho)
        if (siguiente === undefined) return null
        return (
          <PanelCard className="mb-5.5" title="Primeros pasos">
            <ol className="flex flex-col">
              {pasos.map((paso, i) => (
                <li className="flex flex-wrap items-center gap-3 border-b border-line-panel py-3 last:border-none" key={paso.titulo}>
                  <span
                    aria-hidden
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] ${
                      paso.hecho ? 'bg-sage text-white' : 'border border-line-panel-strong text-ink-mute'
                    }`}
                  >
                    {paso.hecho ? '✓' : i + 1}
                  </span>
                  <span className="flex min-w-[240px] flex-1 flex-col">
                    <span className={`text-[14px] ${paso.hecho ? 'text-ink-mute line-through' : 'text-ink'}`}>{paso.titulo}</span>
                    {paso.hecho ? null : <span className="text-[12.5px] leading-[1.5] text-ink-mute">{paso.detalle}</span>}
                  </span>
                  {paso.hecho ? null : (
                    <PanelButton href={paso.href} variant={paso === siguiente ? 'primary' : 'default'}>
                      {paso.accion}
                    </PanelButton>
                  )}
                </li>
              ))}
            </ol>
          </PanelCard>
        )
      })()}

      <div className="mb-5.5 grid grid-cols-2 gap-3.5 min-[900px]:grid-cols-4">
        {/* Las cuatro cifras cuentan lo mismo que la barra: personas. Mezclar invitaciones,
            lugares y personas daba 8 aquí, 27 en la barra y 17 / 30 al lado. */}
        <StatCard
          label="Invitados"
          value={isErr(personasResumen) ? '—' : personasResumen.value.length}
          icon={<UsersIcon />}
          change={gruposNuevos > 0 ? { direction: 'up', text: `${gruposNuevos} invitaci${gruposNuevos === 1 ? 'ón' : 'ones'} esta semana` } : undefined}
          detail={gruposNuevos > 0 ? undefined : `En ${filas.length} invitaci${filas.length === 1 ? 'ón' : 'ones'} · ${t ? t.seatsInvited : 0} lugares`}
        />
        <StatCard
          label="Confirmados"
          value={t ? t.seatsConfirmed : 0}
          suffix={`/ ${t ? t.seatsInvited : 0}`}
          icon={<CheckIcon />}
          change={respuestasSemana > 0 ? { direction: 'up', text: `${respuestasSemana} esta semana` } : undefined}
          progress={t && t.seatsInvited > 0 ? t.seatsConfirmed / t.seatsInvited : 0}
        />
        <StatCard
          label="Sin responder"
          value={pendientes}
          icon={<ClockIcon />}
          detail={`invitaci${pendientes === 1 ? 'ón' : 'ones'} de ${filas.length}`}
          // Cada respuesta de la semana es un pendiente menos: la flecha va hacia abajo,
          // que en esta tarjeta es la buena noticia.
          change={respuestasSemana > 0 ? { direction: 'down', text: `${respuestasSemana} esta semana` } : undefined}
          progress={filas.length > 0 ? pendientes / filas.length : 0}
        />
        <StatCard
          label="Visitas a la invitación"
          value={vistas ? vistas.total : '—'}
          detail={vistas && vistas.today > 0 ? undefined : 'Nadie la ha abierto hoy'}
          change={vistas && vistas.today > 0 ? { direction: 'up', text: `${vistas.today} hoy` } : undefined}
          icon={<EyeIcon />}
        />
      </div>

      <PanelCard className="mb-5.5" title="Esta semana">
        <ThisWeekCard evento={{ eventId: event.value.id, eventSlug: event.value.slug }} semana={semana} />
      </PanelCard>

      {/* Fila del donut y la actividad, en 1.6fr / 1fr como la maqueta. */}
      <div className="mb-5.5 grid items-start gap-4.5 min-[900px]:grid-cols-[1.6fr_1fr]">
        <PanelCard
          action={
            <Link href={`/panel/eventos/${event.value.slug}/estadisticas`}>
              <PanelCardLink>Ver detalle →</PanelCardLink>
            </Link>
          }
          title="Estado de RSVPs"
        >
          <DonutChart
            big={filas.length === 0 ? '—' : `${Math.round((respondieron / filas.length) * 100)}%`}
            caption="RESPONDIERON"
            slices={[
              { label: 'Asistirán', value: respondieron - noAsisten, color: 'var(--color-sage)' },
              { label: 'No podrán', value: noAsisten, color: 'var(--color-danger)' },
              { label: 'Sin responder', value: pendientes, color: 'var(--color-gold-light)' },
            ]}
          />
          {isErr(historial) ? (
            <p className="mt-4 text-[12px] text-danger" role="alert">
              No pudimos leer el historial de respuestas. La base no responde; vuelve a intentarlo en un momento.
            </p>
          ) : (
            <TimelineChart bars={historial.value} caption={`RSVPs por día · últimas ${DIAS_DEL_GRAFICO / 7} semanas`} />
          )}
        </PanelCard>

        <PanelCard
          action={
            <Link href={`/panel/eventos/${event.value.slug}/mensajes`}>
              <PanelCardLink>Ver mensajes →</PanelCardLink>
            </Link>
          }
          title="Actividad reciente"
        >
          <ActivityFeed items={actividad} />
        </PanelCard>
      </div>

      {/* Los invitados recientes ocupan el ancho entero, como en la maqueta. */}
      <PanelCard
        action={
          <Link href={`/panel/eventos/${event.value.slug}/invitados`}>
            <PanelCardLink>Ver todos →</PanelCardLink>
          </Link>
        }
        className="mb-5.5"
        title="Invitados recientes"
      >
        {isErr(personasResumen) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los invitados. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : recientes.length === 0 ? (
          <EmptyState
            action={<PanelButton href={`/panel/eventos/${event.value.slug}/invitados`}>Ir a Invitados</PanelButton>}
            compact
            description="Aquí verás a los últimos que cargaste y cómo responden."
            icon={<UsersIcon />}
            title="Aún no hay invitados"
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Nombre', 'Invitación', 'RSVP', 'Acompañantes', 'Mesa'].map((columna) => (
                    <th
                      key={columna}
                      className="border-b border-line-panel px-3.5 py-3 text-left font-mono text-[9px] font-medium tracking-[0.3em] text-ink-mute uppercase"
                      scope="col"
                    >
                      {columna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recientes.map((persona) => {
                  const grupo = filas.find((f) => f.id === persona.guestGroupId)
                  const mesa = mesas?.tables.find((m) => m.groups.some((g) => g.id === persona.guestGroupId))
                  return (
                    <tr key={persona.id} className="hover:bg-bg-raised">
                      <td className="border-b border-line-panel px-3.5 py-3 text-[13px] text-ink">
                        {persona.fullName}
                        {persona.vip ? (
                          <span aria-label="VIP" className="ml-1 text-gold" title="VIP">
                            ★
                          </span>
                        ) : null}
                      </td>
                      <td className="border-b border-line-panel px-3.5 py-3 text-[13px] text-ink-soft">
                        {grupo?.label ?? '—'}
                      </td>
                      <td className="border-b border-line-panel px-3.5 py-3">
                        {persona.attending === 'yes' ? (
                          <Pill tone="ok">Asistirá</Pill>
                        ) : persona.attending === 'no' ? (
                          <Pill tone="no">No podrá</Pill>
                        ) : persona.attending === 'maybe' ? (
                          <Pill tone="maybe">Tal vez</Pill>
                        ) : (
                          <Pill tone="pending">Pendiente</Pill>
                        )}
                      </td>
                      <td className="border-b border-line-panel px-3.5 py-3 font-mono text-[12px] text-ink-soft">
                        {persona.isCompanion ? '—' : (acompanantesPorGrupo.get(persona.guestGroupId) ?? 0)}
                      </td>
                      <td className="border-b border-line-panel px-3.5 py-3 text-[13px] text-ink-soft">
                        {mesa?.label ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      {/* Distribución de mesas y acciones rápidas, otra vez 1.6fr / 1fr. */}
      <div className="grid items-start gap-4.5 min-[900px]:grid-cols-[1.6fr_1fr]">
        <PanelCard
          action={
            <Link href={`/panel/eventos/${event.value.slug}/mesas`}>
              <PanelCardLink>Editar asignaciones →</PanelCardLink>
            </Link>
          }
          title="Distribución de mesas"
        >
          {mesas === null ? (
            <p className="text-[13px] text-ink-mute">El plan de este evento no incluye el plano del salón.</p>
          ) : mesas.tables.length === 0 ? (
            <EmptyState compact description="Cuando crees las mesas, aquí verás cuántos lugares quedan." icon={<TableIcon />} title="Aún no hay mesas" />
          ) : (
            <>
              <ul className="grid grid-cols-4 gap-1.5">
                {mesas.tables.map((mesa) => {
                  const cupo = mesa.taken + mesa.free
                  const lleno = mesa.free === 0
                  return (
                    <li
                      key={mesa.id}
                      className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-center ${
                        lleno
                          ? 'border-sage bg-sage text-white'
                          : mesa.taken > 0
                            ? 'border-line-panel bg-pill-ok text-ink'
                            : 'border-line-panel bg-bg-raised text-ink'
                      }`}
                    >
                      <span className="font-display text-[16px] font-medium [font-variant-numeric:lining-nums]">
                        {mesa.label.replace(/^mesa\s*/i, '')}
                      </span>
                      <span className="font-mono text-[8px] tracking-[0.2em] opacity-70">
                        {mesa.taken}/{cupo}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 flex justify-between font-mono text-[11px] text-ink-mute">
                <span>
                  {mesas.tables.length} mesas · capacidad {mesas.tables.reduce((suma, mesa) => suma + mesa.taken + mesa.free, 0)}
                </span>
                <span>{mesas.unseated.length} invitaci{mesas.unseated.length === 1 ? 'ón' : 'ones'} sin mesa</span>
              </p>
            </>
          )}
        </PanelCard>

        <div className="flex flex-col gap-4.5">
          <PanelCard title="Acciones rápidas">
            <div className="flex flex-col gap-2">
              {[
                {
                  href: `/panel/eventos/${event.value.slug}/invitados?panel=envio`,
                  icon: <MailIcon />,
                  t: 'Recordar pendientes',
                  d: `${pendientes} invitaci${pendientes === 1 ? 'ón' : 'ones'} sin responder`,
                },
                {
                  href: `/panel/eventos/${event.value.slug}/checkin`,
                  icon: <QrIcon />,
                  t: 'Pases con QR',
                  d: 'Para la puerta el día del evento',
                },
                {
                  href: `/panel/eventos/${event.value.slug}/configuracion`,
                  icon: <PenIcon />,
                  t: 'Editar la invitación',
                  d: 'Textos, fotos y música',
                },
              ].map((accion) => (
                <Link
                  // La clave es el rótulo, no el destino: dos acciones distintas pueden
                  // llevar al mismo sitio —copiar el enlace y editar la invitación viven
                  // las dos en Configuración— y React descarta la segunda si comparten
                  // clave. Se ve como una acción que desaparece de la lista.
                  key={accion.t}
                  className="flex items-center gap-3.5 rounded-[14px] border border-line-panel bg-linear-to-b from-bg-top to-white px-4 py-3.5 shadow-card transition-all duration-200 hover:translate-x-[3px] hover:border-gold/40"
                  href={accion.href}
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-sunken text-sage [&>svg]:size-[18px]"
                  >
                    {accion.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{accion.t}</span>
                    <span className="block truncate text-[11px] text-ink-mute">{accion.d}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-5 rounded-[14px] bg-linear-to-br from-sage to-[var(--color-sage-deep)] p-4 text-white">
              <p className="font-mono text-[9px] tracking-[0.3em] opacity-85 uppercase">Recordatorio</p>
              <p className="mt-1.5 font-display text-[20px] italic">Fecha límite de confirmación</p>
              <p className="mt-1.5 text-[12px] opacity-85">
                {new Date(`${event.value.rsvpDeadline}T00:00:00`).toLocaleDateString('es-BO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </PanelCard>

          {/* La tira de llegadas no está en la maqueta: es del ciclo 4 y se queda, pero
              acomodada a su lenguaje y no ocupando media fila ella sola. */}
          <PanelCard title="Llegada">
            <ArrivalStrip tally={llegadas} />
          </PanelCard>
        </div>
      </div>
    </>
  )
}
