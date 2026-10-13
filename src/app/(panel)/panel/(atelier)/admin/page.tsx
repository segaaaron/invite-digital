import Link from 'next/link'
import { admin, cargarHoy, checkin, diseno, identity } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { diasEntre, type Aviso } from '@/modules/admin/domain/hoy'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { Iniciales, PanelButton, Pill, TARJETA_DESTACADA } from '@/shared/design/ui/panel/PanelKit'
import { CheckIcon } from '@/shared/design/ui/icons'
import { formatAmount } from '@/shared/money'
import { diaDelEvento } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { registrarFallo } from '@/shared/observability/fallos'

export const metadata = { title: 'Hoy · Administración' }
export const dynamic = 'force-dynamic'

const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', timeZone: 'UTC' })
const SEMANA = new Intl.DateTimeFormat('es-BO', { weekday: 'short', timeZone: 'UTC' })
const HORA = new Intl.DateTimeFormat('es-BO', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/La_Paz' })
const MES = new Intl.DateTimeFormat('es-BO', { month: 'long', timeZone: 'UTC' })
/** «Esta semana se celebran» mira siete días. */
const SEMANA_DIAS = 7
const NUMEROS = ['ninguna', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']

/** «Buenos días» hasta las 12, «Buenas tardes» hasta las 19, en hora de Bolivia. */
function saludo(ahora: Date): string {
  const hora = Number(HORA.format(ahora))
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/** «Tienes cuatro cosas por resolver.»: con palabras hasta diez, como lo diría una persona. */
function cuantasCosas(n: number): string {
  if (n === 0) return 'Nada espera por ti: todo está al día.'
  const cuantas = NUMEROS[n] ?? String(n)
  return n === 1 ? 'Tienes una cosa por resolver.' : `Tienes ${cuantas} cosas por resolver.`
}

/**
 * **«Hoy», como en la maqueta «Esmeralda y Latón»** (12 de octubre): el saludo y cuántas cosas esperan; a la izquierda
 * «Por resolver» —la primera destacada en su tarjeta, las demás en filas con su botón—; a la derecha lo que se celebra
 * esta semana (el día de la fiesta, con la gente que va entrando en vivo); y abajo, la tira del mes: cobrado,
 * eventos activos, consultas que compran y los últimos seis meses en barras.
 */
export default async function AdminPage() {
  const actor = await requireAdmin()
  const ahora = new Date()
  const [cargado, dinero, disenos, ingresos, nombre] = await Promise.all([
    cargarHoy(ahora),
    admin.todayMoney(),
    diseno.porEntregar().catch(() => []),
    admin.income(),
    identity.nombreDe(actor.userId),
  ])
  const titulo = `${saludo(ahora)}${nombre === null ? '' : `, ${nombre.trim().split(/\s+/)[0]}`}`

  if (isErr(cargado)) {
    registrarFallo('panel/admin/page', 'Hoy', cargado.error)
    return (
      <>
        <h1 className="font-display text-[34px] leading-[1.06] font-medium min-[560px]:text-[46px]">{titulo}</h1>
        <PanelCard className="mt-8">
          <p className="text-[14px] text-danger" role="alert">
            No pudimos leer lo pendiente. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const { hoy, bandeja, eventos } = cargado.value
  const bs = (cents: number) => formatAmount(cents, 'BOB').replace(/,00$/, '')
  // Lo que pide acción, en una sola lista: la primera se destaca. Los diseños por entregar van detrás.
  const avisos: Aviso[] = [
    ...bandeja.grupos.flatMap((g) => g.avisos),
    ...disenos.map((d) => {
      const atrasado = d.entregaHasta !== null && d.entregaHasta < hoy
      return {
        clave: `diseno-${d.slug}`,
        tono: atrasado ? ('no' as const) : ('pending' as const),
        etiqueta: 'Diseño',
        titulo: `El diseño de ${d.title}`,
        detalle:
          d.estado === 'esperando_datos'
            ? 'Esperando sus datos para empezar.'
            : d.entregaHasta === null
              ? 'En diseño.'
              : `${atrasado ? 'Atrasado: era para el' : 'Se entrega el'} ${diaDelEvento(d.entregaHasta)}.`,
        href: `/panel/eventos/${d.slug}/configuracion#diseno`,
        accion: 'Ver',
        desde: 0,
      }
    }),
  ]
  const [primero, ...resto] = avisos

  const semana = eventos
    .map((e) => ({ ...e, dias: diasEntre(hoy, e.eventDate) }))
    .filter((e) => e.dias >= 0 && e.dias <= SEMANA_DIAS)
    .sort((a, b) => a.dias - b.dias)
  // El día del evento: cuánta gente va entrando, en vivo. Solo recuentos, nunca nombres.
  const puertas = new Map(
    await Promise.all(
      semana
        .filter((e) => e.dias === 0)
        .map(async (e) => {
          const puerta = await checkin.state(e.id)
          return [e.slug, isErr(puerta) ? null : puerta.value.tally] as const
        }),
    ),
  )

  // La tira del mes.
  const mes = hoy.slice(0, 7)
  const nombreDelMes = MES.format(new Date(`${mes}-01T00:00:00Z`))
  const meses = isErr(ingresos) ? [] : ingresos.value.porMes.slice(-6)
  const anterior = meses.at(-2)?.total ?? 0
  const cobrado = isErr(dinero) ? null : dinero.value.esteMes
  const cambio = cobrado === null || anterior === 0 ? null : Math.round(((cobrado - anterior) / anterior) * 100)
  const techo = Math.max(1, ...meses.map((m) => m.total))
  const activos = eventos.filter((e) => e.eventDate >= hoy).length
  const esteMes = eventos.filter((e) => e.eventDate.slice(0, 7) === mes && e.eventDate >= hoy).length
  const cierre = isErr(dinero) ? null : dinero.value.cierreDeConsultas
  const mesAnterior = meses.at(-2) === undefined ? null : MES.format(new Date(`${meses.at(-2)!.mes}-01T00:00:00Z`))

  return (
    <div className="flex flex-col gap-10 max-[859px]:gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-[1.06] font-medium min-[560px]:text-[46px]">{titulo}</h1>
        <p className="mt-3 max-w-[620px] text-[17px] text-ink-mute max-[859px]:text-[16px]">
          {cuantasCosas(avisos.length)}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-12 max-[859px]:gap-9">
        <section aria-labelledby="por-resolver" className="min-w-0 flex-[999_1_520px]">
          {/* En el celular la primera va sola, sin título; las demás, bajo «También por resolver» (maqueta M01). */}
          <h2 className="mb-4.5 font-display text-[24px] font-medium max-[767px]:sr-only" id="por-resolver">
            Por resolver
          </h2>
          {primero === undefined ? (
            <EmptyState compact description="Ninguna venta esperando, ningún evento en riesgo ni cambio de plan por decidir." icon={<CheckIcon />} title="Todo al día" />
          ) : (
            <>
              <article className={`${TARJETA_DESTACADA} flex flex-wrap items-center gap-6 p-7.5 max-[559px]:p-6`}>
                <div className="min-w-0 flex-[1_1_260px]">
                  <Pill tone={primero.tono}>{primero.etiqueta}</Pill>
                  <h3 className="mt-2.5 font-display text-[24px] leading-tight font-medium">{primero.titulo}</h3>
                  <p className="mt-1.5 text-[15px] text-ink-mute">{primero.detalle}</p>
                </div>
                <PanelButton className="max-[559px]:w-full" href={primero.href} variant="primary">
                  {primero.accion}
                </PanelButton>
              </article>
              {resto.length === 0 ? null : (
                <h3 className="mt-8 mb-1 font-display text-[24px] font-medium min-[768px]:hidden">También por resolver</h3>
              )}
              {resto.length === 0 ? null : (
                <ul className="mt-3.5 max-[767px]:mt-0">
                  {resto.map((a, i) => (
                    <li className={`flex items-center gap-4 px-1 py-4 ${i === 0 ? '' : 'border-t border-line-panel'}`} key={a.clave}>
                      <Iniciales nombre={a.titulo} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{a.titulo}</p>
                        <p className="text-[14px] text-ink-mute">{a.detalle}</p>
                      </div>
                      <span className="hidden max-[559px]:hidden min-[560px]:inline">
                        <Pill tone={a.tono}>{a.etiqueta}</Pill>
                      </span>
                      <PanelButton className="min-w-[118px] max-[559px]:min-w-0" href={a.href}>
                        {a.accion}
                      </PanelButton>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="semana" className="min-w-0 flex-[1_1_300px]">
          <h2 className="mb-4.5 font-display text-[24px] font-medium" id="semana">
            Esta semana se celebran
          </h2>
          {semana.length === 0 ? (
            <p className="text-[15px] text-ink-mute">Nada que celebrar estos siete días.</p>
          ) : (
            <ol>
              {semana.map((e, i) => {
                const tally = puertas.get(e.slug)
                const pct = tally ? (tally.expectedHeads === 0 ? 0 : Math.round((tally.headsInside / tally.expectedHeads) * 100)) : e.grupos === 0 ? 0 : Math.round((e.respondidos / e.grupos) * 100)
                return (
                  <li className={i === 0 ? '' : 'border-t border-line-panel'} key={e.slug}>
                    <Link className="flex items-center gap-4.5 py-4.5 text-ink no-underline" href={`/panel/admin/eventos?evento=${e.slug}`}>
                      <span className="w-[54px] shrink-0 text-center">
                        <span className="block font-display text-[38px] leading-[0.95] font-medium">{DIA.format(new Date(`${e.eventDate}T00:00:00Z`))}</span>
                        <span className="text-[12.5px] text-ink-mute">{e.dias === 0 ? 'hoy' : SEMANA.format(new Date(`${e.eventDate}T00:00:00Z`)).replace('.', '')}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.75">
                        <span className="font-medium">{e.title}</span>
                        <span aria-hidden className="h-1 overflow-hidden rounded-full bg-line-panel">
                          <span className="block h-full bg-shell-deep transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="text-[13px] text-ink-mute">
                          {tally ? `${tally.headsInside} de ${tally.expectedHeads} personas dentro` : `${e.respondidos} de ${e.grupos} respondieron`}
                        </span>
                      </span>
                    </Link>
                    {/* El día de la fiesta, cada ingreso repinta el recuento sin recargar. */}
                    {tally === undefined ? null : <EnVivo modo="auto" oculto tipos={['ingreso']} url={`/panel/admin/en-vivo/${e.slug}`} />}
                  </li>
                )
              })}
            </ol>
          )}
          <Link className="mt-1 inline-flex min-h-11 items-center text-[14px]" href="/panel/admin/eventos/calendario">
            Ver el calendario
          </Link>
        </section>
      </div>

      {/* En el celular, el mes en una tarjeta esmeralda (maqueta M01). */}
      <Link className="block rounded-[16px] bg-shell-deep bg-[radial-gradient(140%_80%_at_0%_0%,var(--color-shell)_0%,var(--color-shell-deep)_65%)] p-5.5 text-shell-ink no-underline min-[768px]:hidden" href="/panel/admin/ingresos">
        <span className="block text-[14px] text-gold-light">Cobrado en {nombreDelMes}</span>
        <span className="mt-1 block font-display text-[38px] leading-tight font-medium">{cobrado === null ? '—' : bs(cobrado)}</span>
        <span className="block text-[14px] text-shell-ink/85">
          {cambio === null || mesAnterior === null ? '' : `${Math.abs(cambio)} % ${cambio >= 0 ? 'más' : 'menos'} que ${mesAnterior}, `}
          {activos === 1 ? '1 evento activo' : `${activos} eventos activos`}
        </span>
      </Link>

      <section aria-labelledby="mes" className="max-[767px]:hidden">
        <div aria-hidden className="mb-6.5 h-[3px] border-y border-gold" />
        <div className="flex flex-wrap items-end gap-8 max-[1279px]:gap-6">
          <h2 className="flex-[0_0_140px] font-display text-[24px] font-medium capitalize" id="mes">
            {nombreDelMes}
          </h2>
          <Link className="flex-[1_1_180px] border-l border-line-panel pl-7 text-ink no-underline" href="/panel/admin/ingresos">
            <span className="block text-[13.5px] text-ink-mute">Cobrado</span>
            <span className="block font-display text-[34px] leading-[1.15] font-medium">{cobrado === null ? '—' : bs(cobrado)}</span>
            <span className={`block text-[13px] ${cambio !== null && cambio >= 0 ? 'text-pill-ok-ink' : 'text-ink-mute'}`}>
              {cambio === null || mesAnterior === null ? 'Lo aprobado este mes' : `${Math.abs(cambio)} % ${cambio >= 0 ? 'más' : 'menos'} que ${mesAnterior}`}
            </span>
          </Link>
          <div className="flex-[1_1_160px] border-l border-line-panel pl-7">
            <span className="block text-[13.5px] text-ink-mute">Eventos activos</span>
            <span className="block font-display text-[34px] leading-[1.15] font-medium">{activos}</span>
            <span className="block text-[13px] text-ink-mute">{esteMes === 1 ? '1 se celebra este mes' : `${esteMes} se celebran este mes`}</span>
          </div>
          <div className="flex-[1_1_160px] border-l border-line-panel pl-7">
            <span className="block text-[13.5px] text-ink-mute">Consultas que compran</span>
            <span className="block font-display text-[34px] leading-[1.15] font-medium">{cierre === null ? '—' : `${cierre} %`}</span>
            <span className="block text-[13px] text-ink-mute">{cierre === null ? 'Aún sin consultas decididas' : `de cada 10, ${Math.round(cierre / 10)}`}</span>
          </div>
          {meses.length === 0 ? null : (
            <div
              aria-label={`Cobrado por mes, de ${MES.format(new Date(`${meses[0]!.mes}-01T00:00:00Z`))} a ${nombreDelMes}: ${meses.map((m) => bs(m.total)).join(', ')}`}
              className="flex h-16 flex-none items-end gap-1.75 border-l border-line-panel pl-7"
              role="img"
            >
              {meses.map((m, i) => (
                <span
                  className={`w-3 rounded-[2px] ${i === meses.length - 1 ? 'bg-shell-deep' : 'bg-barra-suave'}`}
                  key={m.mes}
                  style={{ height: `${Math.max(6, Math.round((m.total / techo) * 100))}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
