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
import { traducir } from '@/shared/i18n/en-ingles'
import type { Locale } from '@/shared/i18n/locales'
import { INTL, type T } from '@/shared/i18n/t'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Hoy · Administración', 'Today · Administration') }
}
export const dynamic = 'force-dynamic'

const formatoDia = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { day: 'numeric', timeZone: 'UTC' })
const formatoSemana = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { weekday: 'short', timeZone: 'UTC' })
const HORA = new Intl.DateTimeFormat('es-BO', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/La_Paz' })
const formatoMes = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { month: 'long', timeZone: 'UTC' })
/** «Esta semana se celebran» mira siete días. */
const SEMANA_DIAS = 7
const NUMEROS = ['ninguna', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

/** «Buenos días» hasta las 12, «Buenas tardes» hasta las 19, en hora de Bolivia. */
function saludo(ahora: Date, t: T): string {
  const hora = Number(HORA.format(ahora))
  return hora < 12 ? t('Buenos días', 'Good morning') : hora < 19 ? t('Buenas tardes', 'Good afternoon') : t('Buenas noches', 'Good evening')
}

/** «Tienes cuatro cosas por resolver.»: con palabras hasta diez, como lo diría una persona. */
function cuantasCosas(n: number, t: T): string {
  if (n === 0) return t('Nada espera por ti: todo está al día.', 'Nothing is waiting for you: everything is up to date.')
  const cuantas = NUMEROS[n] ?? String(n)
  const howMany = NUMBERS[n] ?? String(n)
  return n === 1 ? t('Tienes una cosa por resolver.', 'You have one thing to sort out.') : t(`Tienes ${cuantas} cosas por resolver.`, `You have ${howMany} things to sort out.`)
}

/**
 * **«Hoy», como en la maqueta «Esmeralda y Latón»** (12 de octubre): el saludo y cuántas cosas esperan; a la izquierda
 * «Por resolver» —la primera destacada en su tarjeta, las demás en filas con su botón—; a la derecha lo que se celebra
 * esta semana (el día de la fiesta, con la gente que va entrando en vivo); y abajo, la tira del mes: cobrado,
 * eventos activos, consultas que compran y los últimos seis meses en barras.
 */
export default async function AdminPage() {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const actor = await requireAdmin()
  const ahora = new Date()
  const [cargado, dinero, disenos, ingresos, nombre] = await Promise.all([
    cargarHoy(ahora),
    admin.todayMoney(),
    diseno.porEntregar().catch(() => []),
    admin.income(),
    identity.nombreDe(actor.userId),
  ])
  const titulo = `${saludo(ahora, t)}${nombre === null ? '' : `, ${nombre.trim().split(/\s+/)[0]}`}`

  if (isErr(cargado)) {
    registrarFallo('panel/admin/page', 'Hoy', cargado.error)
    return (
      <>
        <h1 className="font-display text-[34px] leading-[1.06] font-medium min-[560px]:text-[46px]">{titulo}</h1>
        <PanelCard className="mt-8">
          <p className="text-[14px] text-danger" role="alert">
            {t('No pudimos leer lo pendiente. La base no responde; vuelve a intentarlo en un momento.', 'We could not read what is pending. The database is not responding; try again in a moment.')}
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
        etiqueta: t('Diseño', 'Design'),
        titulo: t(`El diseño de ${d.title}`, `${d.title}’s design`),
        detalle:
          d.estado === 'esperando_datos'
            ? t('Esperando sus datos para empezar.', 'Waiting for their details to start.')
            : d.entregaHasta === null
              ? t('En diseño.', 'In design.')
              : `${atrasado ? t('Atrasado: era para el', 'Late: it was due') : t('Se entrega el', 'Due')} ${diaDelEvento(d.entregaHasta, locale)}.`,
        href: `/panel/eventos/${d.slug}/configuracion#diseno`,
        accion: t('Ver', 'View'),
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
  const nombreDelMes = formatoMes(locale).format(new Date(`${mes}-01T00:00:00Z`))
  const meses = isErr(ingresos) ? [] : ingresos.value.porMes.slice(-6)
  const anterior = meses.at(-2)?.total ?? 0
  const cobrado = isErr(dinero) ? null : dinero.value.esteMes
  const cambio = cobrado === null || anterior === 0 ? null : Math.round(((cobrado - anterior) / anterior) * 100)
  const techo = Math.max(1, ...meses.map((m) => m.total))
  const activos = eventos.filter((e) => e.eventDate >= hoy).length
  const esteMes = eventos.filter((e) => e.eventDate.slice(0, 7) === mes && e.eventDate >= hoy).length
  const cierre = isErr(dinero) ? null : dinero.value.cierreDeConsultas
  const mesAnterior = meses.at(-2) === undefined ? null : formatoMes(locale).format(new Date(`${meses.at(-2)!.mes}-01T00:00:00Z`))

  return (
    <div className="flex flex-col gap-10 max-[859px]:gap-8">
      <div>
        <h1 className="font-display text-[34px] leading-[1.06] font-medium min-[560px]:text-[46px]">{titulo}</h1>
        <p className="mt-3 max-w-[620px] text-[17px] text-ink-mute max-[859px]:text-[16px]">
          {cuantasCosas(avisos.length, t)}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-12 max-[859px]:gap-9">
        <section aria-labelledby="por-resolver" className="min-w-0 flex-[999_1_520px]">
          {/* En el celular la primera va sola, sin título; las demás, bajo «También por resolver» (maqueta M01). */}
          <h2 className="mb-4.5 font-display text-[24px] font-medium max-[767px]:sr-only" id="por-resolver">
            {t('Por resolver', 'To sort out')}
          </h2>
          {primero === undefined ? (
            <EmptyState compact description={t('Ninguna venta esperando, ningún evento en riesgo ni cambio de plan por decidir.', 'No sale waiting, no event at risk and no plan change to decide.')} icon={<CheckIcon />} title={t('Todo al día', 'All up to date')} />
          ) : (
            <>
              <article className={`${TARJETA_DESTACADA} flex flex-wrap items-center gap-6 p-7.5 max-[559px]:p-6`}>
                <div className="min-w-0 flex-[1_1_260px]">
                  <Pill tone={primero.tono}>{traducir(primero.etiqueta, t)}</Pill>
                  <h3 className="mt-2.5 font-display text-[24px] leading-tight font-medium">{traducir(primero.titulo, t)}</h3>
                  <p className="mt-1.5 text-[15px] text-ink-mute">{traducir(primero.detalle, t)}</p>
                </div>
                <PanelButton className="max-[559px]:w-full" href={primero.href} variant="primary">
                  {traducir(primero.accion, t)}
                </PanelButton>
              </article>
              {resto.length === 0 ? null : (
                <h3 className="mt-8 mb-1 font-display text-[24px] font-medium min-[768px]:hidden">{t('También por resolver', 'Also to sort out')}</h3>
              )}
              {resto.length === 0 ? null : (
                <ul className="mt-3.5 max-[767px]:mt-0">
                  {resto.map((a, i) => (
                    <li className={`flex items-center gap-4 px-1 py-4 ${i === 0 ? '' : 'border-t border-line-panel'}`} key={a.clave}>
                      <Iniciales nombre={a.titulo} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{traducir(a.titulo, t)}</p>
                        <p className="text-[14px] text-ink-mute">{traducir(a.detalle, t)}</p>
                      </div>
                      <span className="hidden max-[559px]:hidden min-[560px]:inline">
                        <Pill tone={a.tono}>{traducir(a.etiqueta, t)}</Pill>
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
            {t('Esta semana se celebran', 'Celebrated this week')}
          </h2>
          {semana.length === 0 ? (
            <p className="text-[15px] text-ink-mute">{t('Nada que celebrar estos siete días.', 'Nothing to celebrate these seven days.')}</p>
          ) : (
            <ol>
              {semana.map((e, i) => {
                const tally = puertas.get(e.slug)
                const pct = tally ? (tally.expectedHeads === 0 ? 0 : Math.round((tally.headsInside / tally.expectedHeads) * 100)) : e.grupos === 0 ? 0 : Math.round((e.respondidos / e.grupos) * 100)
                return (
                  <li className={i === 0 ? '' : 'border-t border-line-panel'} key={e.slug}>
                    <Link className="flex items-center gap-4.5 py-4.5 text-ink no-underline" href={`/panel/admin/eventos?evento=${e.slug}`}>
                      <span className="w-[54px] shrink-0 text-center">
                        <span className="block font-display text-[38px] leading-[0.95] font-medium">{formatoDia(locale).format(new Date(`${e.eventDate}T00:00:00Z`))}</span>
                        <span className="text-[12.5px] text-ink-mute">{e.dias === 0 ? t('hoy', 'today') : formatoSemana(locale).format(new Date(`${e.eventDate}T00:00:00Z`)).replace('.', '')}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.75">
                        <span className="font-medium">{e.title}</span>
                        <span aria-hidden className="h-1 overflow-hidden rounded-full bg-line-panel">
                          <span className="block h-full bg-shell-deep transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="text-[13px] text-ink-mute">
                          {tally ? t(`${tally.headsInside} de ${tally.expectedHeads} personas dentro`, `${tally.headsInside} of ${tally.expectedHeads} people inside`) : t(`${e.respondidos} de ${e.grupos} respondieron`, `${e.respondidos} of ${e.grupos} replied`)}
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
            {t('Ver el calendario', 'See the calendar')}
          </Link>
        </section>
      </div>

      {/* En el celular, el mes en una tarjeta esmeralda (maqueta M01). */}
      <Link className="block rounded-[16px] bg-shell-deep bg-[radial-gradient(140%_80%_at_0%_0%,var(--color-shell)_0%,var(--color-shell-deep)_65%)] p-5.5 text-shell-ink no-underline min-[768px]:hidden" href="/panel/admin/ingresos">
        <span className="block text-[14px] text-gold-light">{t('Cobrado en', 'Collected in')} {nombreDelMes}</span>
        <span className="mt-1 block font-display text-[38px] leading-tight font-medium">{cobrado === null ? '—' : bs(cobrado)}</span>
        <span className="block text-[14px] text-shell-ink/85">
          {cambio === null || mesAnterior === null ? '' : t(`${Math.abs(cambio)} % ${cambio >= 0 ? 'más' : 'menos'} que ${mesAnterior}, `, `${Math.abs(cambio)} % ${cambio >= 0 ? 'more' : 'less'} than ${mesAnterior}, `)}
          {activos === 1 ? t('1 evento activo', '1 active event') : t(`${activos} eventos activos`, `${activos} active events`)}
        </span>
      </Link>

      <section aria-labelledby="mes" className="max-[767px]:hidden">
        <div aria-hidden className="mb-6.5 h-[3px] border-y border-gold" />
        <div className="flex flex-wrap items-end gap-8 max-[1279px]:gap-6">
          <h2 className="flex-[0_0_140px] font-display text-[24px] font-medium capitalize" id="mes">
            {nombreDelMes}
          </h2>
          <Link className="flex-[1_1_180px] border-l border-line-panel pl-7 text-ink no-underline" href="/panel/admin/ingresos">
            <span className="block text-[13.5px] text-ink-mute">{t('Cobrado', 'Collected')}</span>
            <span className="block font-display text-[34px] leading-[1.15] font-medium">{cobrado === null ? '—' : bs(cobrado)}</span>
            <span className={`block text-[13px] ${cambio !== null && cambio >= 0 ? 'text-pill-ok-ink' : 'text-ink-mute'}`}>
              {cambio === null || mesAnterior === null ? t('Lo aprobado este mes', 'Approved this month') : t(`${Math.abs(cambio)} % ${cambio >= 0 ? 'más' : 'menos'} que ${mesAnterior}`, `${Math.abs(cambio)} % ${cambio >= 0 ? 'more' : 'less'} than ${mesAnterior}`)}
            </span>
          </Link>
          <div className="flex-[1_1_160px] border-l border-line-panel pl-7">
            <span className="block text-[13.5px] text-ink-mute">{t('Eventos activos', 'Active events')}</span>
            <span className="block font-display text-[34px] leading-[1.15] font-medium">{activos}</span>
            <span className="block text-[13px] text-ink-mute">{esteMes === 1 ? t('1 se celebra este mes', '1 celebrated this month') : t(`${esteMes} se celebran este mes`, `${esteMes} celebrated this month`)}</span>
          </div>
          <div className="flex-[1_1_160px] border-l border-line-panel pl-7">
            <span className="block text-[13.5px] text-ink-mute">{t('Consultas que compran', 'Inquiries that buy')}</span>
            <span className="block font-display text-[34px] leading-[1.15] font-medium">{cierre === null ? '—' : `${cierre} %`}</span>
            <span className="block text-[13px] text-ink-mute">{cierre === null ? t('Aún sin consultas decididas', 'No decided inquiries yet') : t(`de cada 10, ${Math.round(cierre / 10)}`, `${Math.round(cierre / 10)} out of 10`)}</span>
          </div>
          {meses.length === 0 ? null : (
            <div
              aria-label={t(
                `Cobrado por mes, de ${formatoMes(locale).format(new Date(`${meses[0]!.mes}-01T00:00:00Z`))} a ${nombreDelMes}: ${meses.map((m) => bs(m.total)).join(', ')}`,
                `Collected per month, from ${formatoMes(locale).format(new Date(`${meses[0]!.mes}-01T00:00:00Z`))} to ${nombreDelMes}: ${meses.map((m) => bs(m.total)).join(', ')}`,
              )}
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
