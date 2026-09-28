import Link from 'next/link'
import { admin, cargarVentas } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { mesDe, mesVecino, semanasDelMes } from '@/modules/admin/domain/calendario'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { fiestaDeTema } from '@/modules/events'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { ArrowLeftIcon, ArrowRightIcon } from '@/shared/design/ui/icons'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EtiquetaDeFiesta, TiraDeCifras, puntoDeFiesta, type FiestaDeLista } from '@/shared/design/ui/panel/lista'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { diaDelEvento } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { EmptyState } from '@/shared/design/ui/panel/estados'

export const metadata = { title: 'Calendario · Administración' }
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/eventos/calendario'
const MES = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
/** Las ventas abiertas con fecha: aún no son eventos, pero ya ocupan el día en la cabeza del planner. */
const TENTATIVAS = new Set(['nueva', 'contactada', 'esperando_pago', 'por_revisar', 'por_crear_evento'])

type Entrada = { readonly clave: string; readonly titulo: string; readonly fiesta: FiestaDeLista; readonly href: string; readonly tentativa: boolean }

/**
 * **¿Qué fin de semana tengo libre?** El mes entero, con cada evento en el color de su fiesta y
 * **las ventas abiertas con fecha, punteadas**: todavía no son eventos, pero cotizar otro para ese
 * sábado es comprometerse dos veces. Un día con tantos eventos como la agenda aguanta (Ajustes ›
 * Mensajes y agenda) lleva el filete de oro de «lleno».
 *
 * Sustituye a «Próximos eventos» de Hoy, a las cifras de la cartera y al gráfico de doce meses.
 * En el celular, la rejilla no cabe: se lee como agenda, día por día.
 */
export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireAdmin()
  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)
  const mes = mesDe((await searchParams).mes, hoy)

  const [eventos, ventas, agenda] = await Promise.all([admin.events(), cargarVentas(ahora), admin.mensajes()])
  if (isErr(eventos)) {
    return (
      <>
        <PanelHeader kicker="Eventos" title="Calendario" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }
  const capacidad = isErr(agenda) ? 3 : agenda.value.capacidad

  const porDia = new Map<string, Entrada[]>()
  const poner = (dia: string, e: Entrada) => porDia.set(dia, [...(porDia.get(dia) ?? []), e])
  for (const e of eventos.value) {
    if (!e.eventDate.startsWith(mes.slice(0, 4))) continue
    poner(e.eventDate, { clave: e.id, titulo: e.title, fiesta: fiestaDeTema(e.themeKey), href: `/panel/admin/eventos?evento=${e.slug}`, tentativa: false })
  }
  if (!isErr(ventas)) {
    for (const v of ventas.value.ventas) {
      if (v.fechaEvento === null || !TENTATIVAS.has(v.etapa)) continue
      poner(v.fechaEvento, { clave: v.clave, titulo: v.nombre, fiesta: v.fiesta, href: `/panel/admin/ventas?venta=${v.clave}`, tentativa: true })
    }
  }

  const semanas = semanasDelMes(mes)
  const delMes = semanas.flat().filter((d) => d.delMes)
  const confirmados = (dia: string) => (porDia.get(dia) ?? []).filter((e) => !e.tentativa).length
  const eventosDelMes = delMes.reduce((s, d) => s + confirmados(d.iso), 0)
  const tentativasDelMes = delMes.reduce((s, d) => s + (porDia.get(d.iso) ?? []).filter((e) => e.tentativa).length, 0)
  const sabados = delMes.filter((d) => new Date(`${d.iso}T00:00:00Z`).getUTCDay() === 6)
  const sabadosOcupados = sabados.filter((d) => confirmados(d.iso) > 0).length
  const diasLlenos = delMes.filter((d) => confirmados(d.iso) >= capacidad).length
  const titulo = MES.format(new Date(`${mes}-01T00:00:00Z`))

  return (
    <>
      <PanelHeader
        actions={
          <div className="flex items-center gap-2">
            <PanelButton aria-label="Mes anterior" href={`${BASE}?mes=${mesVecino(mes, -1)}`}>
              <ArrowLeftIcon className="size-4" />
            </PanelButton>
            <PanelButton href={BASE}>Hoy</PanelButton>
            <PanelButton aria-label="Mes siguiente" href={`${BASE}?mes=${mesVecino(mes, 1)}`}>
              <ArrowRightIcon className="size-4" />
            </PanelButton>
          </div>
        }
        kicker="Eventos"
        meta={`Tu agenda aguanta ${capacidad} ${capacidad === 1 ? 'evento' : 'eventos'} por día · se cambia en Ajustes › Mensajes y agenda`}
        title={titulo.charAt(0).toUpperCase() + titulo.slice(1)}
      />

      <TiraDeCifras
        cifras={[
          { label: 'Eventos del mes', value: eventosDelMes },
          { label: 'Sábados ocupados', value: `${sabadosOcupados} de ${sabados.length}`, detail: `${sabados.length - sabadosOcupados} libres` },
          { label: 'Días llenos', value: diasLlenos, tono: diasLlenos > 0 ? 'alerta' : 'normal', detail: 'Con la agenda completa' },
          { label: 'Tentativos', value: tentativasDelMes, detail: 'Ventas abiertas con fecha', href: '/panel/admin/ventas' },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-soft">
        <EtiquetaDeFiesta fiesta="boda" />
        <EtiquetaDeFiesta fiesta="xv" />
        <EtiquetaDeFiesta fiesta="cumple" />
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-6 rounded-full border border-dashed border-ink-mute" /> Tentativo (venta abierta)
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-3.5 rounded-[4px] ring-2 ring-gold" /> Día lleno
        </span>
      </div>

      {/* La rejilla, desde tableta. */}
      <div className="hidden overflow-hidden rounded-[22px] border border-line-panel bg-white/80 shadow-card min-[760px]:block">
        <div className="grid grid-cols-7 border-b border-line-panel bg-bg-sunken/40">
          {DIAS.map((d, i) => (
            <span className={`px-3 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase ${i >= 5 ? 'text-ink' : 'text-ink-mute'}`} key={d}>
              {d}
            </span>
          ))}
        </div>
        {semanas.map((semana) => (
          <div className="grid grid-cols-7 border-b border-line-panel last:border-b-0" key={semana[0]?.iso}>
            {semana.map((d) => {
              const entradas = porDia.get(d.iso) ?? []
              const lleno = confirmados(d.iso) >= capacidad
              const esHoy = d.iso === hoy
              return (
                <div
                  className={`relative flex min-h-[118px] flex-col gap-1 border-r border-line-panel p-2 last:border-r-0 ${d.finDeSemana ? 'bg-bg-sunken/45' : ''} ${d.delMes ? '' : 'opacity-45'} ${
                    lleno ? 'shadow-[inset_0_0_0_2px_var(--color-gold)]' : ''
                  }`}
                  key={d.iso}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`grid size-7 place-items-center rounded-full font-display text-[15px] [font-variant-numeric:lining-nums] ${esHoy ? 'bg-ink text-white' : 'text-ink'}`}
                    >
                      {d.dia}
                    </span>
                    {lleno ? <span className="font-mono text-[9px] tracking-[0.14em] text-gold-deep uppercase">Lleno</span> : null}
                  </span>
                  <ul className="flex flex-col gap-1">
                    {entradas.slice(0, 3).map((e) => (
                      <li key={e.clave}>
                        <Pastilla entrada={e} />
                      </li>
                    ))}
                  </ul>
                  {entradas.length > 3 ? <span className="px-1 text-[11px] text-ink-mute">y {entradas.length - 3} más</span> : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* En el celular, la agenda: solo los días con algo. */}
      <div className="min-[760px]:hidden">
        {delMes.every((d) => (porDia.get(d.iso) ?? []).length === 0) ? (
          <PanelCard>
            <EmptyState compact title="Nada este mes" />
          </PanelCard>
        ) : (
          <ol className="flex flex-col gap-3">
            {delMes
              .filter((d) => (porDia.get(d.iso) ?? []).length > 0)
              .map((d) => (
                <li className={`rounded-[18px] border bg-white p-3.5 shadow-card ${confirmados(d.iso) >= capacidad ? 'border-gold' : 'border-line-panel'}`} key={d.iso}>
                  <p className="mb-2 flex items-center justify-between text-[13px] text-ink">
                    <span className="first-letter:uppercase">{diaDelEvento(d.iso)}</span>
                    {confirmados(d.iso) >= capacidad ? <span className="font-mono text-[9.5px] tracking-[0.14em] text-gold-deep uppercase">Lleno</span> : null}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {(porDia.get(d.iso) ?? []).map((e) => (
                      <li key={e.clave}>
                        <Pastilla entrada={e} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        )}
      </div>
    </>
  )
}

function Pastilla({ entrada: e }: { entrada: Entrada }) {
  return (
    <Link
      className={`flex items-center gap-1.5 truncate rounded-full px-2 py-1 text-[11.5px] transition-colors ${
        e.tentativa ? 'border border-dashed border-ink-mute/60 text-ink-soft hover:border-ink' : 'bg-white text-ink shadow-card ring-1 ring-line-panel hover:ring-ink/40'
      }`}
      href={e.href}
      title={e.tentativa ? `${e.titulo} · venta abierta` : e.titulo}
    >
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${puntoDeFiesta(e.fiesta)}`} />
      <span className="truncate">{e.titulo}</span>
      {e.tentativa ? <span className="sr-only"> (tentativo)</span> : null}
    </Link>
  )
}
