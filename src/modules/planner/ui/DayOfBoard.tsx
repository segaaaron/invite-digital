'use client'

import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { PhoneIcon } from '@/shared/design/ui/icons'
import { setPaymentPaidAction } from '@/app/_acciones/planner/actions'
import { setVendorArrivedAction } from '@/app/_acciones/planner/dia-actions'
import { Accion, type Evento } from './Accion'

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
const enCuanto = (min: number) => (min < 60 ? `en ${min} minuto${min === 1 ? '' : 's'}` : `en ${Math.floor(min / 60)} h${min % 60 === 0 ? '' : ` ${min % 60} min`}`)

/**
 * El Día D (E28, M15): lo que pasa ahora en la tarjeta esmeralda con cuántos están dentro, lo que sigue, los proveedores
 * con su llegada y las últimas llegadas. Todo entra solo, en vivo.
 */
export function DayOfBoard({ evento, dia }: { evento: Evento; dia: DiaDVista }) {
  const avance = dia.llegadas === null || dia.llegadas.personasEsperadas === 0 ? 0 : Math.min(1, dia.llegadas.personas / dia.llegadas.personasEsperadas)
  return (
    <div className="flex flex-col gap-9">
      {/* Las llegadas de la puerta y las respuestas entran solas, en vivo (SSE). */}
      <EnVivo modo="auto" tipos={['ingreso', 'rsvp']} url={`/panel/eventos/${evento.eventSlug}/en-vivo`} />

      <div className="grid items-stretch gap-4 min-[1100px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section
          aria-label="Ahora"
          className="flex flex-col justify-center gap-6 rounded-[18px] bg-linear-to-br from-shell to-shell-deep px-8 py-9 text-shell-ink min-[768px]:flex-row min-[768px]:items-center max-[767px]:px-6 max-[767px]:py-6"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[14px] text-gold-light">{dia.ahora ? `Ahora, desde las ${dia.ahora.startsAt}` : `Ahora · ${dia.hora}`}</p>
            <p className="font-display text-[44px] leading-[1.05] font-medium max-[767px]:text-[40px]">{dia.ahora?.title ?? 'Entre momentos'}</p>
            {dia.ahora && (dia.ahora.cue || dia.ahora.owner) ? (
              <p className="text-[13.5px] text-shell-soft">{[dia.ahora.cue ? `♪ ${dia.ahora.cue}` : null, dia.ahora.owner ? `a cargo de ${dia.ahora.owner}` : null].filter(Boolean).join(' · ')}</p>
            ) : null}
            <p className="text-[15px] text-shell-soft">
              {dia.sigue ? `Después, ${dia.sigue.title.charAt(0).toLowerCase()}${dia.sigue.title.slice(1)} a las ${dia.sigue.startsAt}, ${enCuanto(dia.sigue.enMinutos)}.` : 'Nada más en el cronograma.'}
            </p>
          </div>
          {dia.llegadas ? (
            <div className="flex flex-col gap-3 max-[767px]:border-t max-[767px]:border-gold/40 max-[767px]:pt-5 min-[768px]:w-[34%]">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-[44px] leading-none font-medium [font-variant-numeric:lining-nums]">{dia.llegadas.personas}</span>
                <span className="text-[14.5px] text-shell-soft">
                  de {dia.llegadas.personasEsperadas} <span className="min-[768px]:hidden">personas </span>dentro
                </span>
              </p>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-shell-ink/15">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${avance * 100}%` }} />
              </span>
            </div>
          ) : null}
        </section>

        <section aria-label="Lo que sigue" className="flex flex-col rounded-[18px] border border-line-panel bg-tarjeta px-6 py-5 max-[767px]:hidden">
          <h2 className="border-b border-line-panel pb-2.5 font-display text-[20px] font-medium">Lo que sigue</h2>
          {dia.loQueSigue.length === 0 ? (
            <p className="pt-3 text-[14px] text-ink-mute">Nada más en el cronograma.</p>
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
        <section aria-label="Proveedores">
          <Titulo>Proveedores</Titulo>
          {dia.proveedores.length === 0 ? (
            <p className="py-3 text-[14px] text-ink-mute">Todavía no hay proveedores contratados.</p>
          ) : (
            <>
              {dia.conProveedores && dia.proveedores.every((p) => p.llegoA !== null) ? <p className="pt-3 text-[14px] text-ok-deep">Llegaron todos.</p> : null}
              <ul>
                {dia.proveedores.map((p) => (
                  <li className="flex items-center gap-4 border-b border-line-panel py-3.5" key={p.id}>
                    <span className="w-14 shrink-0 font-display text-[22px] font-medium [font-variant-numeric:lining-nums_tabular-nums]">{p.arrivalTime ?? '—'}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-medium">{p.nombre}</span>
                      <span className={`text-[13.5px] ${p.llegoA ? 'text-ok-deep' : p.retraso !== null ? 'text-danger-deep' : 'text-ink-mute'}`}>
                        {p.llegoA
                          ? `Llegó a las ${p.llegoA}`
                          : p.retraso !== null
                            ? `Con ${enCuanto(p.retraso).slice(3)} de retraso`
                            : p.confirmado
                              ? 'Confirmó su llegada'
                              : 'Por confirmar'}
                      </span>
                    </span>
                    {p.llegoA ? (
                      <Pill tone="ok">Llegó</Pill>
                    ) : (
                      <span className="flex items-center gap-2">
                        {p.retraso !== null && p.telHref ? (
                          <PanelButton aria-label={`Llamar a ${p.nombre}`} external href={p.telHref} size="sm">
                            <PhoneIcon className="size-4" /> <span className="max-[767px]:hidden">Llamar</span>
                          </PanelButton>
                        ) : null}
                        <Accion action={setVendorArrivedAction} evento={evento} extra={{ vendorId: p.id, arrived: 'true' }} label={`Llegó ${p.service}`}>
                          <span className="max-[767px]:hidden">Marcar llegada</span>
                          <span className="min-[768px]:hidden">Llegó</span>
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
          <section aria-label="Llegadas recientes">
            <Titulo>Llegadas recientes</Titulo>
            {dia.recientes.length === 0 ? (
              <p className="py-3 text-[14px] text-ink-mute">Todavía no llegó nadie.</p>
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
        <section aria-label="Pagos del día">
          <Titulo>Pagos del día</Titulo>
          <ul>
            {dia.pagos.map((g) => (
              <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line-panel py-3" key={g.id}>
                <span className="text-[15px]">
                  {g.concepto} · {g.importe}
                </span>
                <Accion action={setPaymentPaidAction} evento={evento} extra={{ paymentId: g.id, paid: 'true' }} label={`Pagado ${g.concepto}`}>
                  Pagado
                </Accion>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dia.mesas === null || dia.mesas.length === 0 ? null : (
        <section aria-label="Quién falta en cada mesa">
          <Titulo>Quién falta en cada mesa</Titulo>
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

      <div className="min-[768px]:hidden">
        <PanelButton className="w-full" href={dia.ingreso}>
          Ir al ingreso
        </PanelButton>
      </div>
    </div>
  )
}
