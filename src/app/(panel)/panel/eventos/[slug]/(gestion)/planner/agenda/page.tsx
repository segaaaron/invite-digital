import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { avisos, events, planner } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { classifyDevice } from '@/modules/analytics'
import { ActivarAvisos } from '@/modules/notifications/ui/ActivarAvisos'
import { atrasadasDeLaAgenda, diasHasta, proximasDeLaAgenda, semanasDelMes, type ClaseDeAgenda, type EntradaDeAgenda } from '@/modules/planner'
import { CitaDialog, MarcarEnLaAgenda, ReprogramarDialog, SuscripcionAlCalendario } from '@/modules/planner/ui/AgendaDialogos'
import { CLASES_FILTRABLES, diaLargo, FiltrosDeAgenda, ListaDeAgenda, ListaDeAtrasadas, MesDeAgenda, nombreDelMes } from '@/modules/planner/ui/AgendaVista'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { SegmentedTabs } from '@/shared/design/ui/panel/SegmentedTabs'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Agenda' }
export const dynamic = 'force-dynamic'

const hoyEnBolivia = () => new Date(Date.now() - 4 * 3_600_000).toISOString().slice(0, 10)
const moverMes = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7)
}
const mayuscula = (t: string) => t.replace(/^./, (c) => c.toUpperCase())

/** «Faltan 64 días · sábado 12 de diciembre», «Es mañana», «Es hoy» o «Fue el …». */
function cuentaRegresiva(hoy: string, dia: string): string {
  const faltan = diasHasta(hoy, dia)
  const cuando = diaLargo(dia)
  if (faltan > 1) return `Faltan ${faltan} días · ${cuando}`
  if (faltan === 1) return `Es mañana · ${cuando}`
  if (faltan === 0) return `Es hoy · ${cuando}`
  return `Fue el ${cuando}`
}

type Busqueda = { mes?: string; dia?: string; cita?: string; vista?: string; ocultar?: string; hecho?: string; mover?: string }

/**
 * **La agenda del evento** (29 sep; rehecha el 9 oct como un calendario de planner): todo lo que tiene fecha
 * —tareas, pagos, cronograma, ensayos, citas, el cierre de confirmaciones y el día— en un solo sitio.
 * - **Atrasado** arriba, con su salida rápida: «Hecha» o «Pagado» (con «Deshacer») y «Cambiar fecha».
 * - **Mes o lista** (`?vista=`); en el celular abre la lista. La leyenda es el filtro (`?ocultar=`).
 * - **El día** (`?dia=`) se abre entero en un diálogo: nada queda escondido tras «+N más».
 * - **Hoy**, **Lo que viene** (14 días), los **avisos** de este aparato y la suscripción del teléfono.
 * Todo el estado vive en la URL: las acciones remontan la página.
 */
export default async function AgendaPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Busqueda> }) {
  const actor = await requireSession()
  const { slug } = await params
  const q = await searchParams
  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const hoy = hoyEnBolivia()
  const mes = q.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(q.mes) ? q.mes : hoy.slice(0, 7)
  const diaElegido = q.dia && /^\d{4}-\d{2}-\d{2}$/.test(q.dia) ? q.dia : null
  const enCelular = classifyDevice((await headers()).get('user-agent') ?? '') === 'mobile'
  const vista = q.vista === 'lista' || q.vista === 'mes' ? q.vista : enCelular ? 'lista' : 'mes'
  const ocultas = (q.ocultar ?? '').split(',').filter((c): c is ClaseDeAgenda => (CLASES_FILTRABLES as readonly string[]).includes(c))

  const [todas, citas, proveedores] = await Promise.all([planner.dia.agenda(event.value), planner.dia.listCitas(event.value.id), planner.dia.listVendors(event.value.id)])
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }
  const entradas = todas.filter((e) => !ocultas.includes(e.clase))

  // La dirección de la agenda con lo que se mira (mes, vista, filtros) y los cambios que se pidan.
  const raiz = `/panel/eventos/${event.value.slug}`
  const url = (cambios: Partial<Record<keyof Busqueda, string | null>> = {}) => {
    const p = new URLSearchParams()
    const valor: Record<string, string | null | undefined> = { mes, vista: q.vista ?? null, ocultar: ocultas.join(',') || null, dia: null, cita: null, hecho: null, mover: null, ...cambios }
    for (const [k, v] of Object.entries(valor)) if (v) p.set(k, v)
    return `${raiz}/planner/agenda?${p.toString()}`
  }
  const enlace = (e: EntradaDeAgenda) => (e.clase === 'cita' ? url({ cita: e.id, dia: diaElegido }) : `${raiz}${e.ruta}`)

  const atrasadas = atrasadasDeLaAgenda(todas, hoy)
  const deHoy = entradas.filter((e) => e.dia === hoy)
  const proximas = proximasDeLaAgenda(entradas, hoy).filter((e) => e.dia > hoy)
  // La lista del mes en curso empieza hoy: lo de antes ya está hecho o arriba, en «Atrasado».
  const delMes = entradas.filter((e) => e.dia.startsWith(mes) && (mes !== hoy.slice(0, 7) || e.dia >= hoy))
  const delDia = diaElegido === null ? [] : entradas.filter((e) => e.dia === diaElegido)
  const editando = q.cita === undefined || q.cita === 'nueva' ? undefined : citas.find((c) => c.id === q.cita)
  const buscar = (clave: string | undefined) => (clave === undefined ? undefined : todas.find((e) => `${e.clase}.${e.id}` === clave))
  const hecho = buscar(q.hecho)
  const moviendo = buscar(q.mover)
  const cerrarDia = url({ dia: diaElegido })

  // Lo que se hace sin salir: «Hecha» o «Pagado» en tareas y pagos sin cerrar.
  const marcar = (e: EntradaDeAgenda, despues: (e: EntradaDeAgenda) => string) =>
    (e.clase === 'tarea' || e.clase === 'pago') && !e.hecha ? (
      <MarcarEnLaAgenda despues={despues(e)} entrada={e} evento={evento} hecha>
        {e.clase === 'pago' ? 'Pagado' : 'Hecha'}
      </MarcarEnLaAgenda>
    ) : null
  const trasMarcar = (dia: string | null) => (e: EntradaDeAgenda) => url({ hecho: `${e.clase}.${e.id}`, dia })

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={url({ cita: 'nueva', dia: diaElegido })} variant="primary">
            Nueva cita
          </PanelButton>
        }
        kicker="Planner"
        meta={cuentaRegresiva(hoy, event.value.eventDate)}
        title="Agenda"
      />

      {q.cita === 'nueva' || editando ? (
        <CitaDialog cerrarEn={cerrarDia} cita={editando} dia={diaElegido ?? hoy} evento={evento} key={q.cita} proveedores={proveedores.map((p) => ({ id: p.id, service: p.service }))} />
      ) : moviendo && (moviendo.clase === 'tarea' || moviendo.clase === 'pago') ? (
        <ReprogramarDialog cerrarEn={url()} entrada={moviendo} evento={evento} hoy={hoy} key={q.mover} />
      ) : diaElegido !== null ? (
        <PanelDialog closeHref={url()} title={mayuscula(diaLargo(diaElegido))} width={560}>
          <div className="flex flex-col gap-4">
            <ListaDeAgenda
              accion={(e) => marcar(e, trasMarcar(diaElegido))}
              agrupar={false}
              entradas={delDia}
              enlace={enlace}
              hoy={hoy}
              vacio={{ titulo: 'Nada este día', texto: 'Agenda una cita: la prueba del vestido, una degustación, una visita al salón.' }}
            />
            <div className="flex justify-end border-t border-line-panel pt-4">
              <PanelButton href={url({ cita: 'nueva', dia: diaElegido })} variant="primary">
                Agendar este día
              </PanelButton>
            </div>
          </div>
        </PanelDialog>
      ) : null}

      {hecho ? (
        <div
          className="mb-4.5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line-panel bg-white px-4 py-3 text-[13.5px] text-ink shadow-card"
          role="status"
        >
          <span>
            «{hecho.titulo}» {hecho.hecha ? (hecho.clase === 'pago' ? 'quedó pagado' : 'quedó hecha') : 'volvió a la agenda'}.
          </span>
          <span className="flex items-center gap-2">
            {hecho.hecha ? (
              <MarcarEnLaAgenda despues={url({ dia: diaElegido, hecho: q.hecho ?? null })} entrada={hecho} evento={evento} hecha={false}>
                Deshacer
              </MarcarEnLaAgenda>
            ) : null}
            <Link aria-label="Cerrar el aviso" className="grid size-9 place-items-center rounded-full text-ink-mute hover:bg-bg-top hover:text-ink" href={url({ dia: diaElegido })} scroll={false}>
              ×
            </Link>
          </span>
        </div>
      ) : null}

      {atrasadas.length > 0 ? (
        <PanelCard className="mb-4.5 border-l-4 border-l-pill-no-ink/70" title={`Atrasado · ${atrasadas.length}`}>
          <ListaDeAtrasadas
            accion={(e) => (
              <>
                {marcar(e, trasMarcar(null))}
                <PanelButton aria-label={`Cambiar la fecha de «${e.titulo}»`} href={url({ mover: `${e.clase}.${e.id}` })}>
                  Cambiar fecha
                </PanelButton>
              </>
            )}
            enlace={enlace}
            entradas={atrasadas}
            hoy={hoy}
          />
        </PanelCard>
      ) : null}

      <div className="grid items-start gap-4.5 min-[1200px]:grid-cols-[minmax(0,1fr)_360px]">
        <PanelCard
          action={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedTabs
                current={vista}
                label="Cómo se ve la agenda"
                segments={[
                  { key: 'mes', label: 'Mes', href: url({ vista: 'mes' }) },
                  { key: 'lista', label: 'Lista', href: url({ vista: 'lista' }) },
                ]}
              />
              <nav aria-label="Cambiar de mes" className="flex items-center gap-1.5">
                <PanelButton aria-label="Mes anterior" href={url({ mes: moverMes(mes, -1) })}>
                  ‹
                </PanelButton>
                <PanelButton href={url({ mes: hoy.slice(0, 7) })}>Hoy</PanelButton>
                <PanelButton aria-label="Mes siguiente" href={url({ mes: moverMes(mes, 1) })}>
                  ›
                </PanelButton>
              </nav>
            </div>
          }
          title={mayuscula(nombreDelMes(mes))}
        >
          <div className="mb-4">
            <FiltrosDeAgenda enlace={(o) => url({ ocultar: o.join(',') || null })} ocultas={ocultas} />
          </div>
          {vista === 'mes' ? (
            <MesDeAgenda diaDelEvento={event.value.eventDate} enlaceDelDia={(dia) => url({ dia })} entradas={entradas} hoy={hoy} semanas={semanasDelMes(mes)} />
          ) : (
            <ListaDeAgenda
              accion={(e) => marcar(e, trasMarcar(null))}
              entradas={delMes}
              enlace={enlace}
              hoy={hoy}
              vacio={{
                titulo: `Nada en ${nombreDelMes(mes)}`,
                texto: ocultas.length > 0 ? 'Hay tipos ocultos: tócalos arriba para volver a verlos.' : 'Lo que tenga fecha —tareas, pagos, citas— aparece aquí solo.',
                accion: <PanelButton href={url({ cita: 'nueva' })}>Nueva cita</PanelButton>,
              }}
            />
          )}
        </PanelCard>

        <div className="flex flex-col gap-4.5 min-[1200px]:sticky min-[1200px]:top-6">
          {vista === 'mes' ? (
            <>
              <PanelCard title="Hoy">
                <ListaDeAgenda
                  accion={(e) => marcar(e, trasMarcar(null))}
                  agrupar={false}
                  entradas={deHoy}
                  enlace={enlace}
                  hoy={hoy}
                  vacio={{ titulo: 'Nada para hoy', texto: proximas[0] ? `Lo próximo: ${proximas[0].titulo}, el ${diaLargo(proximas[0].dia)}.` : 'Disfruta el día.' }}
                />
              </PanelCard>
              <PanelCard title="Lo que viene">
                <ListaDeAgenda enlace={enlace} entradas={proximas} hoy={hoy} vacio={{ titulo: 'Nada en los próximos 14 días' }} />
              </PanelCard>
            </>
          ) : null}
          <PanelCard title="Avisos">
            <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-ink-soft">
              <p>Cada mañana a las 8:00 te aviso lo de hoy y de mañana —tareas, pagos, citas, ensayos y el cierre de confirmaciones—, lo que se atrasó y cuánto falta para tu evento.</p>
              <ActivarAvisos clavePublica={avisos.clavePublica} />
            </div>
          </PanelCard>
          <PanelCard title="En tu teléfono">
            <SuscripcionAlCalendario evento={evento} />
          </PanelCard>
        </div>
      </div>
    </>
  )
}
