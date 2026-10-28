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
import type { Locale } from '@/shared/i18n/locales'
import { INTL, type T } from '@/shared/i18n/t'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Calendario · Administración', 'Calendar · Administration') }
}
export const dynamic = 'force-dynamic'

const BASE = '/dashboard/admin/events/calendar'
const formatoDeMes = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dias = (t: T) => [t('Lun', 'Mon'), t('Mar', 'Tue'), t('Mié', 'Wed'), t('Jue', 'Thu'), t('Vie', 'Fri'), t('Sáb', 'Sat'), t('Dom', 'Sun')]
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
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)
  const mes = mesDe((await searchParams).mes, hoy)

  const [eventos, ventas, agenda] = await Promise.all([admin.events(), cargarVentas(ahora), admin.mensajes()])
  if (isErr(eventos)) {
    return (
      <>
        <PanelHeader kicker={t('Eventos', 'Events')} title={t('Calendario', 'Calendar')} />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the events. The database is not responding; try again in a moment.')}
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
    poner(e.eventDate, { clave: e.id, titulo: e.title, fiesta: fiestaDeTema(e.themeKey), href: `/dashboard/admin/events?evento=${e.slug}`, tentativa: false })
  }
  if (!isErr(ventas)) {
    for (const v of ventas.value.ventas) {
      if (v.fechaEvento === null || !TENTATIVAS.has(v.etapa)) continue
      poner(v.fechaEvento, { clave: v.clave, titulo: v.nombre, fiesta: v.fiesta, href: `/dashboard/admin/sales?venta=${v.clave}`, tentativa: true })
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
  const titulo = formatoDeMes(locale).format(new Date(`${mes}-01T00:00:00Z`))

  return (
    <>
      <PanelHeader
        actions={
          <div className="flex items-center gap-2">
            <PanelButton className="min-w-11 justify-center" aria-label={t('Mes anterior', 'Previous month')} href={`${BASE}?mes=${mesVecino(mes, -1)}`}>
              <ArrowLeftIcon className="size-4" />
            </PanelButton>
            <PanelButton href={BASE}>{t('Hoy', 'Today')}</PanelButton>
            <PanelButton className="min-w-11 justify-center" aria-label={t('Mes siguiente', 'Next month')} href={`${BASE}?mes=${mesVecino(mes, 1)}`}>
              <ArrowRightIcon className="size-4" />
            </PanelButton>
          </div>
        }
        kicker={t('Eventos', 'Events')}
        meta={t(
          `Hasta ${capacidad} ${capacidad === 1 ? 'evento' : 'eventos'} por día.`,
          `Up to ${capacidad} ${capacidad === 1 ? 'event' : 'events'} per day.`,
        )}
        title={titulo.charAt(0).toUpperCase() + titulo.slice(1)}
      />

      <TiraDeCifras
        cifras={[
          { label: t('Eventos del mes', 'Events this month'), value: eventosDelMes },
          { label: t('Sábados ocupados', 'Saturdays booked'), value: t(`${sabadosOcupados} de ${sabados.length}`, `${sabadosOcupados} of ${sabados.length}`), detail: t(`${sabados.length - sabadosOcupados} libres`, `${sabados.length - sabadosOcupados} free`) },
          { label: t('Días llenos', 'Full days'), value: diasLlenos, tono: diasLlenos > 0 ? 'alerta' : 'normal', detail: t('Con la agenda completa', 'With the calendar full') },
          { label: t('Tentativos', 'Tentative'), value: tentativasDelMes, detail: t('Ventas abiertas con fecha', 'Open sales with a date'), href: '/dashboard/admin/sales' },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-soft">
        <EtiquetaDeFiesta fiesta="boda" />
        <EtiquetaDeFiesta fiesta="xv" />
        <EtiquetaDeFiesta fiesta="cumple" />
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-6 rounded-full border border-dashed border-ink-mute" /> {t('Tentativo (venta abierta)', 'Tentative (open sale)')}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-6 rounded-[4px] border-2 border-gold bg-pill-pending" /> {t('Día lleno', 'Full day')}
        </span>
      </div>

      {/* La rejilla, desde tableta. */}
      <div className="hidden overflow-hidden rounded-[22px] border border-line-panel bg-white/80 shadow-card min-[760px]:block">
        <div className="grid grid-cols-7 border-b border-line-panel bg-bg-sunken/40">
          {dias(t).map((d, i) => (
            <span className={`px-3 py-2.5 font-mono text-[12px] tracking-[0.18em] uppercase ${i >= 5 ? 'text-ink' : 'text-ink-mute'}`} key={d}>
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
                    {lleno ? <span className="font-mono text-[12px] tracking-[0.14em] text-gold-deep uppercase">{t('Lleno', 'Full')}</span> : null}
                  </span>
                  <ul className="flex flex-col gap-1">
                    {entradas.slice(0, 3).map((e) => (
                      <li key={e.clave}>
                        <Pastilla entrada={e} />
                      </li>
                    ))}
                  </ul>
                  {entradas.length > 3 ? <span className="px-1 text-[12px] text-ink-mute">{t(`y ${entradas.length - 3} más`, `and ${entradas.length - 3} more`)}</span> : null}
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
            <EmptyState compact title={t('Nada este mes', 'Nothing this month')} />
          </PanelCard>
        ) : (
          <ol className="flex flex-col gap-3">
            {delMes
              .filter((d) => (porDia.get(d.iso) ?? []).length > 0)
              .map((d) => (
                <li className={`rounded-[18px] border bg-white p-3.5 shadow-card ${confirmados(d.iso) >= capacidad ? 'border-gold' : 'border-line-panel'}`} key={d.iso}>
                  <p className="mb-2 flex items-center justify-between text-[13px] text-ink">
                    <span className="first-letter:uppercase">{diaDelEvento(d.iso, locale)}</span>
                    {confirmados(d.iso) >= capacidad ? <span className="font-mono text-[12px] tracking-[0.14em] text-gold-deep uppercase">{t('Lleno', 'Full')}</span> : null}
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

async function Pastilla({ entrada: e }: { entrada: Entrada }) {
  const t = await tr()
  return (
    <Link
      className={`flex items-center gap-1.5 truncate rounded-full px-2 py-1 text-[12px] transition-colors max-[859px]:min-h-11 max-[859px]:px-3 max-[859px]:text-[13px] ${
        e.tentativa ? 'border border-dashed border-ink-mute/60 text-ink-soft hover:border-ink' : 'bg-white text-ink shadow-card ring-1 ring-line-panel hover:ring-ink/40'
      }`}
      href={e.href}
      title={e.tentativa ? t(`${e.titulo} · venta abierta`, `${e.titulo} · open sale`) : e.titulo}
    >
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${puntoDeFiesta(e.fiesta)}`} />
      <span className="truncate">{e.titulo}</span>
      {e.tentativa ? <span className="sr-only">{t(' (tentativo)', ' (tentative)')}</span> : null}
    </Link>
  )
}
