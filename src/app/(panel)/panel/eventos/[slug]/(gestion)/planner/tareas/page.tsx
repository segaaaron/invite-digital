import { notFound } from 'next/navigation'
import { events, planner } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { fiestaDeTema } from '@/modules/events'
import { requireSession } from '@/modules/identity/session-cookie'
import { avanceDeTareas, estadoDeTarea, etapasDe, FILTROS_DE_TAREAS, filtrarTareas, type FiltroDeTareas } from '@/modules/planner'
import { NewTaskForm, SeedTasksButton, TaskBoard } from '@/modules/planner/ui/TaskBoard'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { fecha } from '@/shared/format/fecha'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

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
  // «Mías»: quien celebra ve las de los anfitriones; quien lleva el evento, las del planner.
  const mias = actor.role === 'cliente' ? 'anfitrion' : 'planner'
  const visibles = filtrarTareas(todas, filtro, { hoy, mias }).map((t) => ({
    ...t,
    estado: estadoDeTarea(t, hoy),
    vence: t.dueDate === null ? null : diaLegible(t.dueDate),
    hechaCuando: t.doneAt === null ? null : fecha(t.doneAt),
  }))
  const atrasadas = filtrarTareas(todas, 'atrasadas', { hoy, mias }).length
  const base = `/panel/eventos/${event.value.slug}/planner/tareas`

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={`${base}?panel=tarea`} variant="primary">
            Sumar tarea
          </PanelButton>
        }
        kicker="Planner"
        meta={`${avanceDeTareas(todas)} % hecho · ${atrasadas} atrasada${atrasadas === 1 ? '' : 's'}`}
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
                Este evento se creó antes del planner. La plantilla trae las tareas de {fiesta === 'xv' ? 'unos XV' : 'una boda'} por etapas, con
                fechas contadas desde el {diaLegible(event.value.eventDate)}.
              </p>
              <SeedTasksButton eventId={event.value.id} eventSlug={event.value.slug} />
            </div>
          </PanelCard>
        ) : (
          <>
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
