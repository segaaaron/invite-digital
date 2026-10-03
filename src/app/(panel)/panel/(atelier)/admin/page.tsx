import Link from 'next/link'
import { admin, cargarHoy, checkin, diseno } from '@/app/composition/container'
import { AvisoGrupo } from '@/modules/admin/ui/HoyPiezas'
import { requireAdmin } from '@/app/_acciones/sesion'
import { diasEntre } from '@/modules/admin/domain/hoy'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { EtiquetaDeFiesta, Semaforo } from '@/shared/design/ui/panel/lista'
import { ArrowRightIcon, CheckIcon } from '@/shared/design/ui/icons'
import { formatAmount } from '@/shared/money'
import { diaDelEvento, faltaPara } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { registrarFallo } from '@/shared/observability/fallos'

export const metadata = { title: 'Hoy · Administración' }
export const dynamic = 'force-dynamic'

const HOY = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', timeZone: 'UTC' })
const SEMANA = new Intl.DateTimeFormat('es-BO', { weekday: 'short', timeZone: 'UTC' })
/** «Esta semana» mira siete días; lo demás de los próximos treinta, en una línea cada uno. */
const SEMANA_DIAS = 7
const MES_DIAS = 30

/**
 * **«Hoy»: lo que espera por ti, en una bandeja.** Ventas que piden respuesta, eventos en riesgo,
 * cambios de plan y oportunidades —sacados de las mismas lecturas que Ventas y Eventos—, y a la
 * derecha lo que se celebra esta semana. El dinero es una línea que lleva a Ingresos, y los
 * gráficos se fueron al Calendario y a Ingresos: Hoy es para actuar, no para analizar.
 */
export default async function AdminPage() {
  await requireAdmin()
  const ahora = new Date()
  const [cargado, dinero, disenos] = await Promise.all([cargarHoy(ahora), admin.todayMoney(), diseno.porEntregar().catch(() => [])])

  if (isErr(cargado)) {
    registrarFallo('panel/admin/page', 'Hoy', cargado.error)
    return (
      <>
        <PanelHeader kicker="Administración" title="Hoy" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer lo pendiente. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const { hoy, bandeja, ventas, eventos } = cargado.value
  const dia = HOY.format(new Date(`${hoy}T00:00:00Z`))
  const bs = (cents: number) => formatAmount(cents, 'BOB')
  const esperandoPago = ventas.filter((v) => v.etapa === 'esperando_pago').reduce((s, v) => s + (v.importeCents ?? 0), 0)
  const proximos = eventos
    .map((e) => ({ ...e, dias: diasEntre(hoy, e.eventDate) }))
    .filter((e) => e.dias >= 0 && e.dias <= MES_DIAS)
    .sort((a, b) => a.dias - b.dias)
  const semana = proximos.filter((e) => e.dias <= SEMANA_DIAS)
  // El día del evento: cuánta gente va entrando, en vivo. Solo recuentos, nunca nombres.
  const deHoy = await Promise.all(
    proximos
      .filter((e) => e.dias === 0)
      .map(async (e) => {
        const puerta = await checkin.state(e.id)
        return { ...e, tally: isErr(puerta) ? null : puerta.value.tally }
      }),
  )
  const despues = proximos.filter((e) => e.dias > SEMANA_DIAS)

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta={`${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${bandeja.total === 0 ? 'nada pendiente' : bandeja.total === 1 ? '1 cosa espera por ti' : `${bandeja.total} cosas esperan por ti`}`}
        title="Hoy"
      />

      {/* El dinero, en una línea. Lo demás de cifras vive en Ingresos. */}
      {isErr(dinero) ? null : (
        <Link
          className="group mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[18px] border border-line-panel bg-white/75 px-5 py-3.5 shadow-card transition-shadow hover:shadow-float"
          href="/panel/admin/ingresos"
        >
          <Cifra etiqueta="Cobrado este mes" valor={bs(dinero.value.esteMes)} />
          <Cifra etiqueta="Comprobantes por revisar" valor={bs(dinero.value.porRevisar)} />
          <Cifra etiqueta="Esperando pago" valor={bs(esperandoPago)} />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft group-hover:text-ink">
            Ingresos <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {deHoy.length === 0 ? null : (
        <section aria-labelledby="se-celebra-hoy" className="mb-5 rounded-[22px] border border-ink bg-ink p-5 text-white shadow-float">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-[10px] tracking-[0.2em] text-gold uppercase" id="se-celebra-hoy">
              Se celebra hoy
            </h2>
            {/* Un indicador a la vista; cada evento escucha sus ingresos y cada uno repinta los recuentos. */}
            <div className="rounded-full bg-bg-raised px-3 pt-1 text-ink [&>div]:mb-1">
              <EnVivo modo="auto" tipos={['ingreso']} url={`/panel/admin/en-vivo/${deHoy[0]!.slug}`} />
            </div>
            {deHoy.slice(1).map((e) => (
              <EnVivo key={e.slug} modo="auto" oculto tipos={['ingreso']} url={`/panel/admin/en-vivo/${e.slug}`} />
            ))}
          </div>
          <ul className="grid gap-3 min-[700px]:grid-cols-2">
            {deHoy.map((e) => {
              const dentro = e.tally?.headsInside ?? 0
              const esperados = e.tally?.expectedHeads ?? 0
              const pct = esperados === 0 ? 0 : Math.min(100, Math.round((dentro / esperados) * 100))
              return (
                <li className="rounded-[16px] bg-white/[0.06] p-4" key={e.slug}>
                  <Link className="font-display text-[20px] leading-tight hover:underline" href={`/panel/admin/eventos?evento=${e.slug}`}>
                    {e.title}
                  </Link>
                  {e.tally === null ? (
                    <p className="mt-2 text-[13px] text-white/70">No pudimos leer la puerta.</p>
                  ) : (
                    <>
                      <p className="mt-2 text-[13px] text-white/80">
                        <b className="font-display text-[26px] font-normal text-white [font-variant-numeric:lining-nums]">{dentro}</b> de {esperados} personas dentro
                      </p>
                      <div
                        aria-label={`${pct} % de los esperados ya entró`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={pct}
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"
                        role="progressbar"
                      >
                        <div className="h-full rounded-full bg-gold transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {disenos.length === 0 ? null : (
        <PanelCard className="mb-4.5" title="Diseños por entregar">
          <ul className="flex flex-col divide-y divide-line-panel">
            {disenos.map((d) => {
              const atrasado = d.entregaHasta !== null && d.entregaHasta < hoy
              return (
                <li className="flex flex-wrap items-baseline justify-between gap-2 py-2.5" key={d.slug}>
                  <Link className="text-[14px] text-ink underline-offset-4 hover:underline" href={`/panel/eventos/${d.slug}/configuracion#diseno`}>
                    {d.title}
                  </Link>
                  <span className={`text-[12.5px] ${atrasado ? 'text-danger' : 'text-ink-soft'}`}>
                    {d.estado === 'esperando_datos'
                      ? 'Esperando sus datos'
                      : d.entregaHasta === null
                        ? 'En diseño'
                        : `${atrasado ? 'Atrasado · era para el' : 'Entrega'} ${diaDelEvento(d.entregaHasta)}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </PanelCard>
      )}

      <div className="grid items-start gap-4.5 min-[1000px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <PanelCard title="Por hacer">
          {bandeja.grupos.length === 0 ? (
            <EmptyState compact description="Ninguna venta esperando, ningún evento en riesgo ni cambio de plan por decidir." icon={<CheckIcon />} title="Todo al día" />
          ) : (
            <div className="flex flex-col gap-7">
              {bandeja.grupos.map((g) => (
                <div className="scroll-mt-24" id={g.id} key={g.id}>
                  <AvisoGrupo avisos={g.avisos} titulo={g.titulo} vacio="" />
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Esta semana">
          {semana.length === 0 ? (
            <EmptyState compact title="Nada que celebrar estos siete días" />
          ) : (
            <ul className="flex flex-col">
              {semana.map((e) => (
                <li className="border-t border-line-panel first:border-t-0" key={e.slug}>
                  <Link className="flex items-center gap-3.5 py-3 transition-colors hover:bg-bg-sunken/50" href={`/panel/admin/eventos?evento=${e.slug}`}>
                    <span className="flex w-12 shrink-0 flex-col items-center rounded-[12px] border border-line-panel bg-white py-1.5 shadow-card">
                      <span className="font-mono text-[9px] tracking-[0.14em] text-ink-mute uppercase">{SEMANA.format(new Date(`${e.eventDate}T00:00:00Z`)).replace('.', '')}</span>
                      <span className="font-display text-[20px] leading-none text-ink [font-variant-numeric:lining-nums]">{DIA.format(new Date(`${e.eventDate}T00:00:00Z`))}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-display text-[17px] leading-tight text-ink">{e.title}</span>
                        <EtiquetaDeFiesta fiesta={e.fiesta} />
                      </span>
                      <span className="mt-1 block">
                        <Semaforo tono={e.salud.tono}>{e.dias === 0 ? `Es hoy · ${e.salud.texto}` : e.salud.texto}</Semaforo>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {despues.length === 0 ? null : (
            <>
              <h3 className="mt-5 mb-1 font-mono text-[10px] tracking-[0.16em] text-ink-mute uppercase">Hasta dentro de un mes</h3>
              <ul className="flex flex-col">
                {despues.map((e) => (
                  <li className="border-t border-line-panel" key={e.slug}>
                    <Link className="flex items-center justify-between gap-3 py-2.5 text-[13px] transition-colors hover:text-ink" href={`/panel/admin/eventos?evento=${e.slug}`}>
                      <span className="min-w-0 truncate text-ink">{e.title}</span>
                      <span className="shrink-0 text-ink-mute">{faltaPara(e.dias)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft hover:text-ink" href="/panel/admin/eventos/calendario">
            Ver el calendario <ArrowRightIcon className="size-3.5" />
          </Link>
        </PanelCard>
      </div>
    </>
  )
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <span className="flex flex-col">
      <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">{etiqueta}</span>
      <span className="font-display text-[20px] leading-tight text-ink [font-variant-numeric:lining-nums]">{valor}</span>
    </span>
  )
}
