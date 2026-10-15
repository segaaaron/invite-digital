'use client'

import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { PhoneIcon } from '@/shared/design/ui/icons'
import { setPaymentPaidAction } from '@/app/_acciones/planner/actions'
import { setVendorArrivedAction } from '@/app/_acciones/planner/dia-actions'
import { Accion, type Evento } from './Accion'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

export type ProveedorDelDia = {
  readonly id: string
  /** La empresa si se escribió; si no, el servicio. */
  readonly nombre: string
  readonly service: string
  readonly arrivalTime: string | null
  /** «12:52» si ya llegó. */
  readonly llegoA: string | null
  /** Minutos de retraso, si ya pasó su hora y no llegó. */
  readonly retraso: number | null
  readonly confirmado: boolean
  readonly telHref: string | null
}

export type DiaDVista = {
  readonly hora: string
  readonly ahora: { title: string; startsAt: string; cue: string | null; owner: string | null } | null
  readonly sigue: { title: string; startsAt: string; enMinutos: number } | null
  /** Los próximos momentos del cronograma, en orden. */
  readonly loQueSigue: ReadonlyArray<{ id: string; startsAt: string; title: string }>
  readonly llegadas: { grupos: number; esperados: number; personas: number; personasEsperadas: number } | null
  readonly recientes: ReadonlyArray<{ id: string; nombre: string; cuantos: number; hora: string }>
  /** Donde se escanean los pases y se ve la lista entera. */
  readonly ingreso: string
  /** Si hay proveedores con trato y mesas creadas: sin ellos, «llegaron todos» y «mesas completas» no son verdad. */
  readonly conProveedores: boolean
  readonly conMesas: boolean
  readonly proveedores: readonly ProveedorDelDia[]
  readonly pagos: ReadonlyArray<{ id: string; concepto: string; importe: string }>
  readonly mesas: ReadonlyArray<{ id: string; label: string; faltan: readonly string[] }> | null
}

const Titulo = ({ children }: { children: React.ReactNode }) => <h2 className="border-b border-line-panel pb-2.5 font-display text-[24px] font-medium">{children}</h2>

/** «en 42 minutos», «en 1 h 10 min». */
const enCuanto = (min: number, t: T) =>
  min < 60
    ? t(`en ${min} minuto${min === 1 ? '' : 's'}`, `in ${min} minute${min === 1 ? '' : 's'}`)
    : t(`en ${Math.floor(min / 60)} h${min % 60 === 0 ? '' : ` ${min % 60} min`}`, `in ${Math.floor(min / 60)} h${min % 60 === 0 ? '' : ` ${min % 60} min`}`)

/**
 * El Día D (E28, M15): lo que pasa ahora en la tarjeta esmeralda con cuántos están dentro, lo que sigue, los proveedores
 * con su llegada y las últimas llegadas. Todo entra solo, en vivo.
 */
export function DayOfBoard({ evento, dia }: { evento: Evento; dia: DiaDVista }) {
  const t = useT()
  const avance = dia.llegadas === null || dia.llegadas.personasEsperadas === 0 ? 0 : Math.min(1, dia.llegadas.personas / dia.llegadas.personasEsperadas)
  return (
    <div className="flex flex-col gap-9">
      {/* Las llegadas de la puerta y las respuestas entran solas, en vivo (SSE). */}
      <EnVivo modo="auto" tipos={['ingreso', 'rsvp']} url={`/panel/eventos/${evento.eventSlug}/en-vivo`} />

      {/* Arriba en el celular (13 oct): el día del evento se usa en el teléfono y al final de las listas no se veía. */}
      <div className="min-[768px]:hidden">
        <PanelButton className="w-full" href={dia.ingreso} variant="primary">
          {t('Ir al ingreso', 'Go to check-in')}
        </PanelButton>
      </div>

      <div className="grid items-stretch gap-4 min-[1100px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section
          aria-label={t('Ahora', 'Now')}
          className="flex flex-col justify-center gap-6 rounded-[18px] bg-linear-to-br from-shell to-shell-deep px-8 py-9 text-shell-ink min-[768px]:flex-row min-[768px]:items-center max-[767px]:px-6 max-[767px]:py-6"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[14px] text-gold-light">{dia.ahora ? t(`Ahora, desde las ${dia.ahora.startsAt}`, `Now, since ${dia.ahora.startsAt}`) : `${t('Ahora', 'Now')} · ${dia.hora}`}</p>
            <p className="font-display text-[44px] leading-[1.05] font-medium max-[767px]:text-[40px]">{dia.ahora?.title ?? t('Entre momentos', 'Between moments')}</p>
            {dia.ahora && (dia.ahora.cue || dia.ahora.owner) ? (
              <p className="text-[13.5px] text-shell-soft">{[dia.ahora.cue ? `♪ ${dia.ahora.cue}` : null, dia.ahora.owner ? `a cargo de ${dia.ahora.owner}` : null].filter(Boolean).join(' · ')}</p>
            ) : null}
            <p className="text-[15px] text-shell-soft">
              {dia.sigue ? t(`Después, ${dia.sigue.title.charAt(0).toLowerCase()}${dia.sigue.title.slice(1)} a las ${dia.sigue.startsAt}, ${enCuanto(dia.sigue.enMinutos, t)}.`, `Next, ${dia.sigue.title} at ${dia.sigue.startsAt}, ${enCuanto(dia.sigue.enMinutos, t)}.`) : t('Nada más en el cronograma.', 'Nothing else on the schedule.')}
            </p>
          </div>
          {dia.llegadas ? (
            <div className="flex flex-col gap-3 max-[767px]:border-t max-[767px]:border-gold/40 max-[767px]:pt-5 min-[768px]:w-[34%]">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-[44px] leading-none font-medium [font-variant-numeric:lining-nums]">{dia.llegadas.personas}</span>
                <span className="text-[14.5px] text-shell-soft">
                  {t('de', 'of')} {dia.llegadas.personasEsperadas} <span className="min-[768px]:hidden">{t('personas ', 'people ')}</span>{t('dentro', 'inside')}
                </span>
              </p>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-shell-ink/15">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${avance * 100}%` }} />
              </span>
            </div>
          ) : null}
        </section>

        <section aria-label={t('Lo que sigue', 'Coming up')} className="flex flex-col rounded-[18px] border border-line-panel bg-tarjeta px-6 py-5 max-[767px]:hidden">
          <h2 className="border-b border-line-panel pb-2.5 font-display text-[20px] font-medium">{t('Lo que sigue', 'Coming up')}</h2>
          {dia.loQueSigue.length === 0 ? (
            <p className="pt-3 text-[14px] text-ink-mute">{t('Nada más en el cronograma.', 'Nothing else on the schedule.')}</p>
          ) : (
            <ul>
              {dia.loQueSigue.map((m) => (
                <li className="flex items-baseline gap-5 border-b border-line-panel py-2.5 last:border-none" key={m.id}>
                  <span className="w-14 font-display text-[20px] font-medium [font-variant-numeric:lining-nums_tabular-nums]">{m.startsAt}</span>
                  <span className="text-[14.5px]">{m.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid items-start gap-x-8 gap-y-9 min-[1100px]:grid-cols-2">
        <section aria-label={t('Proveedores', 'Vendors')}>
          <Titulo>{t('Proveedores', 'Vendors')}</Titulo>
          {dia.proveedores.length === 0 ? (
            <p className="py-3 text-[14px] text-ink-mute">{t('Todavía no hay proveedores contratados.', 'No vendors hired yet.')}</p>
          ) : (
            <>
              {dia.conProveedores && dia.proveedores.every((p) => p.llegoA !== null) ? <p className="pt-3 text-[14px] text-ok-deep">{t('Llegaron todos.', 'Everyone arrived.')}</p> : null}
              <ul>
                {dia.proveedores.map((p) => (
                  <li className="flex items-center gap-4 border-b border-line-panel py-3.5" key={p.id}>
                    <span className="w-14 shrink-0 font-display text-[22px] font-medium [font-variant-numeric:lining-nums_tabular-nums]">{p.arrivalTime ?? '—'}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-medium">{p.nombre}</span>
                      <span className={`text-[13.5px] ${p.llegoA ? 'text-ok-deep' : p.retraso !== null ? 'text-danger-deep' : 'text-ink-mute'}`}>
                        {p.llegoA
                          ? t(`Llegó a las ${p.llegoA}`, `Arrived at ${p.llegoA}`)
                          : p.retraso !== null
                            ? t(`Con ${enCuanto(p.retraso, t).slice(3)} de retraso`, `${enCuanto(p.retraso, t).slice(3)} late`)
                            : p.confirmado
                              ? t('Confirmó su llegada', 'Confirmed their arrival')
                              : t('Por confirmar', 'To be confirmed')}
                      </span>
                    </span>
                    {p.llegoA ? (
                      <Pill tone="ok">{t('Llegó', 'Arrived')}</Pill>
                    ) : (
                      <span className="flex items-center gap-2">
                        {p.retraso !== null && p.telHref ? (
                          <PanelButton aria-label={t(`Llamar a ${p.nombre}`, `Call ${p.nombre}`)} external href={p.telHref} size="sm">
                            <PhoneIcon className="size-4" /> <span className="max-[767px]:hidden">{t('Llamar', 'Call')}</span>
                          </PanelButton>
                        ) : null}
                        <Accion action={setVendorArrivedAction} evento={evento} extra={{ vendorId: p.id, arrived: 'true' }} label={t(`Llegó ${p.service}`, `${p.service} arrived`)}>
                          <span className="max-[767px]:hidden">{t('Marcar llegada', 'Mark arrival')}</span>
                          <span className="min-[768px]:hidden">{t('Llegó', 'Arrived')}</span>
                        </Accion>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {dia.llegadas ? (
          <section aria-label={t('Llegadas recientes', 'Recent arrivals')}>
            <Titulo>{t('Llegadas recientes', 'Recent arrivals')}</Titulo>
            {dia.recientes.length === 0 ? (
              <p className="py-3 text-[14px] text-ink-mute">{t('Todavía no llegó nadie.', 'No one has arrived yet.')}</p>
            ) : (
              <ul>
                {dia.recientes.map((r) => (
                  <li className="flex items-baseline justify-between gap-3 border-b border-line-panel py-3.5 text-[15px] [font-variant-numeric:tabular-nums]" key={r.id}>
                    <span>
                      {r.nombre}
                      {r.cuantos > 1 ? <span className="text-ink-mute">, {r.cuantos}</span> : null}
                    </span>
                    <span className="text-ink-mute">{r.hora}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      {dia.pagos.length === 0 ? null : (
        <section aria-label={t('Pagos del día', 'Today’s payments')}>
          <Titulo>{t('Pagos del día', 'Today’s payments')}</Titulo>
          <ul>
            {dia.pagos.map((g) => (
              <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line-panel py-3" key={g.id}>
                <span className="text-[15px]">
                  {g.concepto} · {g.importe}
                </span>
                <Accion action={setPaymentPaidAction} evento={evento} extra={{ paymentId: g.id, paid: 'true' }} label={t(`Pagado ${g.concepto}`, `${g.concepto} paid`)}>
                  {t('Pagado', 'Paid')}
                </Accion>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dia.mesas === null || dia.mesas.length === 0 ? null : (
        <section aria-label={t('Quién falta en cada mesa', 'Who is missing at each table')}>
          <Titulo>{t('Quién falta en cada mesa', 'Who is missing at each table')}</Titulo>
          <ul>
            {dia.mesas.map((m) => (
              <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-panel py-3" key={m.id}>
                <span className="text-[15px]">{m.label}</span>
                <span className="flex flex-wrap gap-1.5">
                  {m.faltan.map((f) => (
                    <Pill key={f} tone="pending">
                      {f}
                    </Pill>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  )
}
