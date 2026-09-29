import { notFound } from 'next/navigation'
import { events, planner } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { proximasDeLaAgenda, semanasDelMes, type EntradaDeAgenda } from '@/modules/planner'
import { CitaDialog, SuscripcionAlCalendario } from '@/modules/planner/ui/AgendaDialogos'
import { diaCorto, ListaDeAgenda, MesDeAgenda, nombreDelMes } from '@/modules/planner/ui/AgendaVista'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Agenda' }
export const dynamic = 'force-dynamic'

const hoyEnBolivia = () => new Date(Date.now() - 4 * 3_600_000).toISOString().slice(0, 10)
const moverMes = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7)
}

/**
 * **La agenda del evento** (29 de septiembre): en un solo calendario todo lo que tiene fecha —tareas,
 * pagos, momentos, ensayos, el cierre de confirmaciones, el día— y las citas, que son lo único suyo. Vista
 * de mes, «Lo que viene» (14 días) y la suscripción para verla en el teléfono.
 */
export default async function AgendaPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mes?: string; dia?: string; cita?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { mes: mesPedido, dia, cita } = await searchParams
  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const hoy = hoyEnBolivia()
  const mes = mesPedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesPedido) ? mesPedido : hoy.slice(0, 7)
  const diaElegido = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : null
  const [entradas, citas, proveedores] = await Promise.all([planner.dia.agenda(event.value), planner.dia.listCitas(event.value.id), planner.dia.listVendors(event.value.id)])
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }

  const raiz = `/panel/eventos/${event.value.slug}`
  const base = `${raiz}/planner/agenda?mes=${mes}`
  const enlace = (e: EntradaDeAgenda) => (e.clase === 'cita' ? `${base}&cita=${e.id}` : `${raiz}${e.ruta}`)
  const proximas = proximasDeLaAgenda(entradas, hoy)
  const delDia = diaElegido === null ? [] : entradas.filter((e) => e.dia === diaElegido)
  const editando = cita === undefined || cita === 'nueva' ? undefined : citas.find((c) => c.id === cita)
  const cerrarEn = diaElegido ? `${base}&dia=${diaElegido}` : base

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={`${cerrarEn}&cita=nueva`} variant="primary">
            Nueva cita
          </PanelButton>
        }
        kicker="Planner"
        meta={`${proximas.length === 0 ? 'Nada' : proximas.length === 1 ? '1 cosa' : `${proximas.length} cosas`} en los próximos 14 días · tareas, pagos, cronograma y citas en un solo calendario`}
        title="Agenda"
      />
      {cita === 'nueva' || editando ? <CitaDialog cerrarEn={cerrarEn} cita={editando} dia={diaElegido ?? hoy} evento={evento} key={cita} proveedores={proveedores.map((p) => ({ id: p.id, service: p.service }))} /> : null}

      <div className="grid items-start gap-4.5 min-[1200px]:grid-cols-[minmax(0,1fr)_360px]">
        <PanelCard
          action={
            <nav aria-label="Cambiar de mes" className="flex items-center gap-1.5">
              <PanelButton aria-label="Mes anterior" href={`${raiz}/planner/agenda?mes=${moverMes(mes, -1)}`}>
                ‹
              </PanelButton>
              <PanelButton href={`${raiz}/planner/agenda`}>Hoy</PanelButton>
              <PanelButton aria-label="Mes siguiente" href={`${raiz}/planner/agenda?mes=${moverMes(mes, 1)}`}>
                ›
              </PanelButton>
            </nav>
          }
          title={nombreDelMes(mes).replace(/^./, (c) => c.toUpperCase())}
        >
          <MesDeAgenda base={base} diaElegido={diaElegido} entradas={entradas} hoy={hoy} semanas={semanasDelMes(mes)} />
          {diaElegido === null ? null : (
            <section aria-label={`El ${diaCorto(diaElegido)}`} className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-[20px] font-light text-ink">{diaCorto(diaElegido).replace(/^./, (c) => c.toUpperCase())}</h3>
                <PanelButton href={`${cerrarEn}&cita=nueva`}>Agendar este día</PanelButton>
              </div>
              <ListaDeAgenda enlace={enlace} entradas={delDia} vacio="Nada este día." />
            </section>
          )}
        </PanelCard>

        <div className="flex flex-col gap-4.5 min-[1200px]:sticky min-[1200px]:top-6">
          <PanelCard title="Lo que viene">
            <ListaDeAgenda enlace={enlace} entradas={proximas} vacio="Nada en los próximos 14 días." />
          </PanelCard>
          <PanelCard title="En tu teléfono">
            <SuscripcionAlCalendario evento={evento} />
          </PanelCard>
        </div>
      </div>
    </>
  )
}
