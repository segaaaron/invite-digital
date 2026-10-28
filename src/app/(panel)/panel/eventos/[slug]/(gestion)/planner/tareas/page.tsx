import { notFound } from 'next/navigation'
import { events, guests, planner, plans, porters, registry, venue } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { fiestaDeTema, loQueFaltaParaInvitar, requisitosParaInvitar } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { atajoDeTarea, type LoQueYaHay, resueltaEnLaApp } from '@/modules/planner/domain/atajos'
import { gestionaElEvento } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { estadoDeTarea, etapasDe, sembrarTareas } from '@/modules/planner'
import { NewTaskForm, SeedTasksButton, TaskBoard, type GrupoDeTareas, type TareaVista } from '@/modules/planner/ui/TaskBoard'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { diaCorto, diasHasta, fecha } from '@/shared/format/fecha'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { PlusIcon } from '@/shared/design/ui/icons'
import { isErr, isOk } from '@/shared/result'
import { seccionesFueraDelPlan } from '@/modules/plans'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { INTL } from '@/shared/i18n/t'
import type { Locale } from '@/shared/i18n/locales'
import { traducir } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const txt = await tr()
  return { title: txt('Plan de tareas', 'Task plan') }
}
export const dynamic = 'force-dynamic'

/** Los filtros de la maqueta (E12). Sin filtro, «Esta semana»: lo atrasado, lo de estos días y lo recién hecho. */
const FILTROS = ['mias', 'planner', 'hechas', 'todas'] as const
type Filtro = (typeof FILTROS)[number] | 'semana' | 'atrasadas'

const SEMANA_CORTA = { es: new Intl.DateTimeFormat(INTL.es, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }), en: new Intl.DateTimeFormat(INTL.en, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }) }
const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000)

const diaLegible = (iso: string, locale: Locale) => fecha(new Date(`${iso}T12:00:00.000Z`), locale)

export default async function TareasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ filtro?: string; panel?: string }>
}) {
  const [txt, locale] = await Promise.all([tr(), idiomaDeLaPeticion()])
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
  const filtro: Filtro | null = ([...FILTROS, 'semana', 'atrasadas'] as readonly string[]).includes(pedido ?? '') ? (pedido as Filtro) : null
  // «Mías»: quien celebra ve las de los anfitriones; su planner y quien lleva el evento, las del planner.
  const dueno = gestionaElEvento(actor, event.value)
  const mias = dueno || (await events.staff.de(actor, event.value.id)).includes('planner') ? 'planner' : 'anfitrion'
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
    invitacionLista: loQueFaltaParaInvitar(contenido, requisitosParaInvitar(themeFor(event.value.themeKey), fiestaDeTema(event.value.themeKey))).length === 0,
    invitacionesRepartidas: !isErr(grupos) && grupos.value.some((g) => g.invitationSentAt !== null && g.invitationSentAt !== undefined),
    mesasRepartidas: salon !== null && !isErr(salon) && salon.value.tables.length > 0 && salon.value.unseated.length === 0,
    regalos: mesaDeRegalos !== null && !isErr(mesaDeRegalos) && mesaDeRegalos.value.gifts.length > 0,
    proveedoresContratados: proveedores.filter((v) => v.status !== 'cotizando').map((v) => [v.service, v.company].filter(Boolean).join(' ')),
    cortejo: cortejo.length > 0,
    cronograma: momentos.length > 0,
    recepcion: recepcion.length > 0,
  }
  const base = `/dashboard/events/${event.value.slug}/planner/tasks`
  // Una tarea no lleva a una sección que el plan no trae: el atajo se quita y la tarea queda.
  const capacidad = await plans.allowanceFor(eventId)
  const fuera = new Set(isErr(capacidad) ? [] : seccionesFueraDelPlan(capacidad.value))
  const atajoDentro = (titulo: string) => {
    const atajo = atajoDeTarea(titulo)
    return atajo === null || fuera.has(atajo.ruta) ? null : atajo
  }
  const raiz = `/dashboard/events/${event.value.slug}`
  // La tarea resuelta en su pantalla cuenta como hecha también para el avance y los filtros.
  const conApp = todas.map((t) => (t.doneAt === null && resueltaEnLaApp(t.title, ya) ? { ...t, doneAt: new Date(0), doneBy: null } : t))
  const vista = (t: (typeof conApp)[number]): TareaVista => {
    const atajo = atajoDentro(t.title)
    const porLaApp = t.doneAt?.getTime() === 0
    const estado = estadoDeTarea(t, hoy)
    const cuando =
      estado === 'hecha'
        ? porLaApp || t.doneAt === null
          ? ''
          : diaCorto(fechaEnBolivia(t.doneAt), hoy, locale)
        : t.dueDate === null
          ? txt('Sin fecha', 'No date')
          : estado === 'atrasada'
            ? diasEntre(t.dueDate, hoy) === 1
              ? txt('venció ayer', 'was due yesterday')
              : txt(`venció hace ${diasEntre(t.dueDate, hoy)} días`, `was due ${diasEntre(t.dueDate, hoy)} days ago`)
            : estado === 'semana'
              ? SEMANA_CORTA[locale].format(new Date(`${t.dueDate}T00:00:00Z`)).replace('.', '').replace(',', '')
              : diaCorto(t.dueDate, hoy, locale)
    return { ...t, estado, cuando, porLaApp, atajo: atajo === null ? null : { href: `${raiz}${atajo.ruta}`, texto: traducir(atajo.texto, txt) } }
  }
  const tareas = conApp.map(vista)
  const porFecha = (x: TareaVista, y: TareaVista) => (x.dueDate ?? '9999').localeCompare(y.dueDate ?? '9999')
  const hechas = conApp.filter((t) => t.doneAt !== null)
  const hechaHace = new Map(hechas.map((t) => [t.id, t.doneAt?.getTime() ?? 0]))
  const porHecha = (x: TareaVista, y: TareaVista) => (hechaHace.get(y.id) ?? 0) - (hechaHace.get(x.id) ?? 0)
  const de = (estado: TareaVista['estado'], lista = tareas) => lista.filter((t) => t.estado === estado)
  const pendientes = tareas.filter((t) => t.estado === 'atrasada' || t.estado === 'semana')
  const recientes = tareas
    .filter((t) => t.estado === 'hecha' && !t.porLaApp && (hechaHace.get(t.id) ?? 0) > Date.parse(`${hoy}T00:00:00Z`) - 14 * 86_400_000)
    .sort(porHecha)
    .slice(0, 5)
  const atrasadas = (lista: readonly TareaVista[]) => de('atrasada', [...lista]).sort(porFecha)
  const porEstado = (lista: readonly TareaVista[], conHechas: boolean): GrupoDeTareas[] => {
    const tarde = atrasadas(lista)
    return [
      { clave: 'atrasada', titulo: tarde.length === 1 ? txt('Atrasada', 'Overdue') : txt('Atrasadas', 'Overdue'), atrasada: true, tareas: tarde },
      { clave: 'semana', titulo: txt('Esta semana', 'This week'), tareas: de('semana', [...lista]).sort(porFecha) },
      { clave: 'despues', titulo: txt('Más adelante', 'Later'), tareas: de('pendiente', [...lista]).sort(porFecha) },
      ...(conHechas ? [{ clave: 'hechas', titulo: txt('Hechas', 'Done'), tareas: de('hecha', [...lista]).sort(porHecha) }] : []),
    ]
  }
  const porGrupo: GrupoDeTareas[] =
    filtro === null
      ? // «Más adelante» también: una tarea recién creada sin fecha no puede desaparecer al guardarla.
        [...porEstado(tareas.filter((t) => t.estado !== 'hecha'), false), { clave: 'recientes', titulo: txt('Hechas hace poco', 'Recently done'), tareas: recientes }]
      : filtro === 'mias'
        ? porEstado(
            tareas.filter((t) => t.assignee === mias),
            true,
          )
        : filtro === 'planner'
          ? porEstado(
              tareas.filter((t) => t.assignee === 'planner'),
              true,
            )
          : filtro === 'hechas'
            ? [{ clave: 'hechas', titulo: txt('Hechas', 'Done'), tareas: de('hecha').sort(porHecha) }]
            : filtro === 'semana'
              ? [{ clave: 'semana', titulo: txt('Esta semana', 'This week'), tareas: de('semana').sort(porFecha) }]
              : filtro === 'atrasadas'
                ? [{ clave: 'atrasada', titulo: txt('Atrasadas', 'Overdue'), atrasada: true, tareas: atrasadas(tareas) }]
                : porEstado(tareas, true)
  const chips: { clave: Filtro | null; texto: string; cuenta?: number }[] = [
    { clave: null, texto: txt('Esta semana', 'This week'), cuenta: pendientes.length },
    { clave: 'mias', texto: txt('Mías', 'Mine') },
    { clave: 'planner', texto: txt('De la planner', 'The planner’s') },
    { clave: 'hechas', texto: txt('Hechas', 'Done'), cuenta: hechas.length },
    { clave: 'todas', texto: txt('Todas', 'All') },
  ]

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={`${base}?panel=tarea`} variant="primary">
            <PlusIcon className="size-4" /> {txt('Añadir tarea', 'Add task')}
          </PanelButton>
        }
        meta={txt(`El plan de un planner para ${fiesta === 'xv' ? 'tus XV' : fiesta === 'cumple' ? 'tu cumpleaños' : 'tu boda'}. Lo que ya resolviste en el panel se marca solo.`, `A planner’s plan for your ${fiesta === 'xv' ? 'quinceañera' : fiesta === 'cumple' ? 'birthday' : 'wedding'}. Whatever you already sorted out in the panel is checked off automatically.`)}
        title={txt('Tareas', 'Tasks')}
      />

      <div className="flex flex-col gap-4.5">
        {panel === 'tarea' ? (
          <PanelDialog closeHref={base} title={txt('Añadir tarea', 'Add task')} width={520}>
            <NewTaskForm etapas={etapas} eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelDialog>
        ) : null}

        {todas.length === 0 ? (
          <PanelCard title={txt('Tu plan de tareas', 'Your task plan')}>
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              {/* Con la fiesta encima, la plantilla de meses no sirve: dejaba quince tareas «para hoy» la víspera (16 oct). */}
              {diasHasta(event.value.eventDate, new Date()) <= 14 ? (
                <p className="max-w-[52ch] rounded-[12px] bg-pill-pending px-4 py-3 text-[14px] leading-[1.6] text-pill-pending-ink">
                  {txt(`Faltan ${Math.max(0, diasHasta(event.value.eventDate, new Date()))} días. La plantilla es para preparar la fiesta con meses de tiempo: con la fecha tan cerca, mejor añade solo lo que te falta con «Añadir tarea».`, `${Math.max(0, diasHasta(event.value.eventDate, new Date()))} days to go. The template is for planning with months of time: with the date this close, just add what you still need with “Add task”.`)}
                </p>
              ) : null}
              <p className="max-w-[52ch] text-[13px] leading-[1.7] text-ink-soft">
                {txt(`Tu lista de pendientes para ${fiesta === 'xv' ? 'los XV' : fiesta === 'cumple' ? 'el cumpleaños' : 'la boda'}: lo que hay que ir resolviendo mes a mes —salón, vestido, fotógrafo, invitaciones—, con fechas contadas hacia atrás desde el ${diaLegible(event.value.eventDate, 'es')}. Lo que ya pasó vence hoy; puedes editar, quitar o sumar tareas.`, `Your to-do list for the ${fiesta === 'xv' ? 'quinceañera' : fiesta === 'cumple' ? 'birthday' : 'wedding'}: what to sort out month by month —venue, dress, photographer, invitations—, with dates counted back from ${diaLegible(event.value.eventDate, 'en')}. Anything already past is due today; you can edit, remove or add tasks.`)}
              </p>
              {/* Qué se va a crear, antes de pulsar: las primeras de la plantilla con su fecha. */}
              {(() => {
                const plantilla = sembrarTareas(fiesta, event.value.eventDate, hoy)
                return (
                  <div className="w-full max-w-[460px] rounded-[16px] border border-line-panel bg-bg-top/40 p-4 text-left">
                    <p className="mb-2 text-[12px] font-medium tracking-[0.1em] text-ink-mute uppercase">{txt(`Así empieza · ${plantilla.length} tareas`, `How it starts · ${plantilla.length} tasks`)}</p>
                    <ul aria-label={txt('Vista previa de la plantilla', 'Template preview')} className="flex flex-col gap-1.5">
                      {plantilla.slice(0, 4).map((t) => (
                        <li className="flex items-baseline justify-between gap-3 text-[13px] text-ink" key={t.sortOrder}>
                          <span>{t.title}</span>
                          <span className="shrink-0 text-[12px] text-ink-mute">{t.dueDate === null ? '' : fecha(new Date(`${t.dueDate}T12:00:00Z`), locale)}</span>
                        </li>
                      ))}
                    </ul>
                    {plantilla.length > 4 ? <p className="mt-2 text-[12px] text-ink-mute">{txt(`y ${plantilla.length - 4} más, hasta el día de la fiesta.`, `and ${plantilla.length - 4} more, up to the day of the party.`)}</p> : null}
                  </div>
                )
              })()}
              <SeedTasksButton eventId={event.value.id} eventSlug={event.value.slug} />
            </div>
          </PanelCard>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-panel">
                <span className="block h-full rounded-full bg-shell-deep" style={{ width: `${(hechas.length / conApp.length) * 100}%` }} />
              </span>
              <span className="shrink-0 text-[15px] font-medium [font-variant-numeric:tabular-nums]">
                {txt(`${hechas.length} de ${conApp.length} hechas`, `${hechas.length} of ${conApp.length} done`)}
              </span>
            </div>
            <nav aria-label={txt('Filtrar tareas', 'Filter tasks')} className="mb-2 flex flex-wrap gap-2.5">
              {chips.map((c) => (
                <FilterChipLink active={c.clave === filtro} href={c.clave === null ? base : `${base}?filtro=${c.clave}`} key={c.texto}>
                  {c.texto}
                  {c.cuenta === undefined ? null : <span aria-hidden className="ml-1">{c.cuenta}</span>}
                </FilterChipLink>
              ))}
            </nav>
            <TaskBoard etapas={etapas} eventId={event.value.id} eventSlug={event.value.slug} filtrando={filtro !== null && filtro !== 'todas'} grupos={porGrupo} />
          </>
        )}
      </div>
    </>
  )
}
