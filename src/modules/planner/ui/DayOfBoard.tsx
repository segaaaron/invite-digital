'use client'

import Link from 'next/link'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { setPaymentPaidAction } from '@/app/_acciones/planner/actions'
import { setVendorArrivedAction } from '@/app/_acciones/planner/dia-actions'
import { Accion, type Evento } from './Accion'

export type DiaDVista = {
  readonly hora: string
  readonly ahora: { title: string; startsAt: string; cue: string | null; owner: string | null } | null
  readonly sigue: { title: string; startsAt: string } | null
  readonly llegadas: { grupos: number; esperados: number; personas: number } | null
  /** Donde se escanean los pases y se ve la lista entera. */
  readonly ingreso: string
  readonly porLlegar: ReadonlyArray<{ id: string; service: string; arrivalTime: string | null; telHref: string | null }>
  readonly pagos: ReadonlyArray<{ id: string; concepto: string; importe: string }>
  readonly mesas: ReadonlyArray<{ id: string; label: string; faltan: readonly string[] }> | null
}

const Bloque = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2 rounded-[18px] border border-line-panel bg-white px-5 py-4 shadow-card">
    <h2 className="font-mono text-[10px] tracking-[0.3em] text-ink-mute uppercase">{titulo}</h2>
    {children}
  </section>
)

/** El Día D en el teléfono: qué pasa ahora, qué sigue, quién llegó y qué falta. */
export function DayOfBoard({ evento, dia }: { evento: Evento; dia: DiaDVista }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Las llegadas de la puerta y las respuestas entran solas, en vivo (SSE), sin recargar cada
          medio minuto como antes. «Ahora» se pone al día con cada cambio o con «Actualizar». */}
      <EnVivo modo="auto" tipos={['ingreso', 'rsvp']} url={`/panel/eventos/${evento.eventSlug}/en-vivo`} />
      <Bloque titulo={`Ahora · ${dia.hora}`}>
        {dia.ahora ? (
          <p className="font-display text-[26px] leading-tight font-light text-ink">
            {dia.ahora.title}
            <span className="block text-[13px] text-ink-soft">
              {[`desde las ${dia.ahora.startsAt}`, dia.ahora.cue ? `♪ ${dia.ahora.cue}` : null, dia.ahora.owner ? `a cargo de ${dia.ahora.owner}` : null].filter(Boolean).join(' · ')}
            </span>
          </p>
        ) : (
          <p className="text-[14px] text-ink-soft">Nada del cronograma en este momento.</p>
        )}
        {dia.sigue ? (
          <p className="text-[14px] text-ink">
            Sigue: <strong className="font-normal">{dia.sigue.title}</strong> a las {dia.sigue.startsAt}
          </p>
        ) : null}
      </Bloque>

      {dia.llegadas ? (
        <Bloque titulo="Llegadas">
          <p className="font-display text-[34px] leading-none font-light text-ink [font-variant-numeric:lining-nums]">
            {dia.llegadas.personas} <span className="text-[16px] text-ink-mute">personas dentro · {dia.llegadas.grupos} de {dia.llegadas.esperados} invitaciones</span>
          </p>
          <Link className="text-[13px] text-ink underline underline-offset-2" href={dia.ingreso}>
            Ver quién llegó y escanear pases
          </Link>
        </Bloque>
      ) : null}

      <Bloque titulo="Proveedores por llegar">
        {dia.porLlegar.length === 0 ? (
          <p className="text-[14px] text-ink-soft">Llegaron todos.</p>
        ) : (
          <ul className="flex flex-col">
            {dia.porLlegar.map((p) => (
              <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line-panel py-2.5 last:border-none" key={p.id}>
                <span className="text-[14px] text-ink">
                  {p.service}
                  <span className="block text-[11px] text-ink-mute">{p.arrivalTime ? `llega a las ${p.arrivalTime}` : 'sin hora'}</span>
                </span>
                <span className="flex items-center gap-2">
                  {p.telHref ? (
                    <PanelButton external href={p.telHref}>
                      Llamar
                    </PanelButton>
                  ) : null}
                  <Accion action={setVendorArrivedAction} evento={evento} extra={{ vendorId: p.id, arrived: 'true' }} label={`Llegó ${p.service}`} variant="primary">
                    Llegó
                  </Accion>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      {dia.pagos.length === 0 ? null : (
        <Bloque titulo="Pagos del día">
          <ul className="flex flex-col">
            {dia.pagos.map((g) => (
              <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line-panel py-2.5 last:border-none" key={g.id}>
                <span className="text-[14px] text-ink">
                  {g.concepto} · {g.importe}
                </span>
                <Accion action={setPaymentPaidAction} evento={evento} extra={{ paymentId: g.id, paid: 'true' }} label={`Pagado ${g.concepto}`}>
                  Pagado
                </Accion>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {dia.mesas === null ? null : (
        <Bloque titulo="Quién falta en cada mesa">
          {dia.mesas.length === 0 ? (
            <p className="text-[14px] text-ink-soft">Todas las mesas están completas.</p>
          ) : (
            <ul className="flex flex-col">
              {dia.mesas.map((m) => (
                <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-panel py-2 last:border-none" key={m.id}>
                  <span className="text-[14px] text-ink">{m.label}</span>
                  <span className="flex flex-wrap gap-1">
                    {m.faltan.map((f) => (
                      <Pill key={f} tone="pending">
                        {f}
                      </Pill>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      )}
    </div>
  )
}
