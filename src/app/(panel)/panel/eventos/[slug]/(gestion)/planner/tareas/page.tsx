import { notFound } from 'next/navigation'
import { events, guests, planner, plans, porters, registry, venue } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { fiestaDeTema, loQueFaltaParaInvitar } from '@/modules/events'
import { atajoDeTarea, type LoQueYaHay, resueltaEnLaApp } from '@/modules/planner/domain/atajos'
import { gestionaElEvento } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { avanceDeTareas, estadoDeTarea, etapasDe, FILTROS_DE_TAREAS, filtrarTareas, type FiltroDeTareas } from '@/modules/planner'
import { NewTaskForm, SeedTasksButton, TaskBoard } from '@/modules/planner/ui/TaskBoard'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { fecha } from '@/shared/format/fecha'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr, isOk } from '@/shared/result'

export const metadata = { title: 'Plan de tareas' }
export const dynamic = 'force-dynamic'

const NOMBRE_FILTRO: Record<FiltroDeTareas, string> = { todas: 'Todas', mias: 'Mías', atrasadas: 'Atrasadas', semana: 'Esta semana' }

const diaLegible = (iso: string) => fecha(new Date(`${iso}T12:00:00.000Z`))

export default async function TareasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ filtro?: string; panel?: string }>
}) {
  const actor = await requireSession()
  const { slug } = await params
  const { filtro: pedido, panel } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const fiesta = fiestaDeTema(event.value.themeKey)
  const etapas = etapasDe(fiesta).map((e) => ({ clave: e.clave, nombre: e.nombre }))
  const hoy = fechaEnBolivia(new Date())
  const todas = await planner.listTasks(event.value.id)
  const filtro = (FILTROS_DE_TAREAS as readonly string[]).includes(pedido ?? '') ? (pedido as FiltroDeTareas) : 'todas'
  // «Mías»: quien celebra ve las de los anfitriones; su planner y quien lleva el evento, las del planner.
  const dueno = gestionaElEvento(actor, event.value)
  const mias = dueno || (await events.staff.membershipsOf(event.value.id, actor.userId)).includes('planner') ? 'planner' : 'anfitrion'
  // Lo que ya está hecho en el panel: una tarea cuya pantalla ya lo resolvió se da por hecha.
  const eventId = event.value.id
  const [contenido, grupos, plan, proveedores, cortejo, momentos, recepcion] = await Promise.all([
    events.contentFor(eventId, {}),
    guests.list(eventId),
    planner.getBudgetPlan(eventId),
    planner.dia.listVendors(eventId),
    planner.dia.listCourt(eventId),
    planner.dia.listMoments(eventId),
    porters.list(eventId),
  ])
  const salon = isOk(await plans.requireFeature(eventId, 'seating')) ? await venue.seating(eventId) : null
  const mesaDeRegalos = isOk(await plans.requireFeature(eventId, 'registry')) ? await registry.list(eventId) : null
  const ya: LoQueYaHay = {
    presupuesto: plan !== null,
    invitacionLista: loQueFaltaParaInvitar(contenido).length === 0,
    invitacionesRepartidas: !isErr(grupos) && grupos.value.some((g) => g.invitationSentAt !== null && g.invitationSentAt !== undefined),
    mesasRepartidas: salon !== null && !isErr(salon) && salon.value.tables.length > 0 && salon.value.unseated.length === 0,
    regalos: mesaDeRegalos !== null && !isErr(mesaDeRegalos) && mesaDeRegalos.value.gifts.length > 0,
    proveedoresContratados: proveedores.filter((v) => v.status !== 'cotizando').map((v) => [v.service, v.company].filter(Boolean).join(' ')),
    cortejo: cortejo.length > 0,
    cronograma: momentos.length > 0,
    recepcion: recepcion.length > 0,
  }
  const base = `/panel/eventos/${event.value.slug}/planner/tareas`
  const raiz = `/panel/eventos/${event.value.slug}`
  // La tarea resuelta en su pantalla cuenta como hecha también para el avance y los filtros.
  const conApp = todas.map((t) => (t.doneAt === null && resueltaEnLaApp(t.title, ya) ? { ...t, doneAt: new Date(0), doneBy: null } : t))
  const visibles = filtrarTareas(conApp, filtro, { hoy, mias }).map((t) => {
    const atajo = atajoDeTarea(t.title)
    const porLaApp = t.doneAt?.getTime() === 0
    return {
      ...t,
      estado: estadoDeTarea(t, hoy),
      vence: t.dueDate === null ? null : diaLegible(t.dueDate),
      hechaCuando: t.doneAt === null || porLaApp ? null : fecha(t.doneAt),
      porLaApp,
      atajo: atajo === null ? null : { href: `${raiz}${atajo.ruta}`, texto: atajo.texto },
    }
  })
  const atrasadas = filtrarTareas(conApp, 'atrasadas', { hoy, mias }).length
  // Lo que viene: las tres próximas sin hacer, para no tener que leer la lista entera.
  const proximas = conApp
    .filter((t) => t.doneAt === null)
    .sort((x, y) => (x.dueDate ?? '9999').localeCompare(y.dueDate ?? '9999'))
    .slice(0, 3)
    .map((t) => ({ id: t.id, title: t.title, vence: t.dueDate === null ? null : diaLegible(t.dueDate), atrasada: t.dueDate !== null && t.dueDate < hoy, atajo: atajoDeTarea(t.title) }))

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={`${base}?panel=tarea`} variant="primary">
            Sumar tarea
          </PanelButton>
        }
        kicker="Planner"
        meta={`${avanceDeTareas(conApp)} % hecho · ${atrasadas} atrasada${atrasadas === 1 ? '' : 's'}`}
        title="Plan de tareas"
      />

      <div className="flex flex-col gap-4.5">
        {panel === 'tarea' ? (
          <PanelCard title="Tarea nueva">
            <NewTaskForm etapas={etapas} eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelCard>
        ) : null}

        {todas.length === 0 ? (
          <PanelCard title="Tu plan de tareas">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="max-w-[52ch] text-[13px] leading-[1.7] text-ink-soft">
                Tu lista de pendientes para {fiesta === 'xv' ? 'los XV' : 'la boda'}: lo que hay que ir resolviendo mes a mes —salón, vestido,
                fotógrafo, invitaciones—, con fechas contadas hacia atrás desde el {diaLegible(event.value.eventDate)}. Lo que ya pasó vence hoy; puedes
                editar, quitar o sumar tareas.
              </p>
              <SeedTasksButton eventId={event.value.id} eventSlug={event.value.slug} />
            </div>
          </PanelCard>
        ) : (
          <>
            {proximas.length === 0 ? null : (
              <PanelCard title="Lo que viene">
                <ul className="flex flex-col">
                  {proximas.map((t) => (
                    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-2.5 last:border-none" key={t.id}>
                      <span className="min-w-0 text-[14px] text-ink">
                        {t.title}
                        <span className={`block text-[11.5px] ${t.atrasada ? 'text-danger-deep' : 'text-ink-mute'}`}>
                          {t.vence === null ? 'Sin fecha' : t.atrasada ? `Atrasada · vencía ${t.vence}` : `Vence ${t.vence}`}
                        </span>
                      </span>
                      {t.atajo === null ? null : (
                        <PanelButton href={`${raiz}${t.atajo.ruta}`}>{t.atajo.texto}</PanelButton>
                      )}
                    </li>
                  ))}
                </ul>
              </PanelCard>
            )}
            <nav aria-label="Filtrar tareas" className="flex flex-wrap gap-2">
              {FILTROS_DE_TAREAS.map((f) => (
                <FilterChipLink active={f === filtro} href={f === 'todas' ? base : `${base}?filtro=${f}`} key={f}>
                  {NOMBRE_FILTRO[f]}
                </FilterChipLink>
              ))}
            </nav>
            <TaskBoard etapas={etapas} eventId={event.value.id} eventSlug={event.value.slug} filtrando={filtro !== 'todas'} tareas={visibles} />
          </>
        )}
      </div>
    </>
  )
}
