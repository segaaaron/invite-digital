'use client'

import Link from 'next/link'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { setPaymentPaidAction, toggleTaskAction } from '../actions'
import { Accion, type Evento } from './Accion'

export type SemanaVista = {
  readonly avance: number
  readonly presupuesto: { previsto: string; comprometido: string; pagado: string } | null
  readonly tareas: ReadonlyArray<{ id: string; title: string; vence: string; atrasada: boolean }>
  readonly pagos: ReadonlyArray<{ id: string; concepto: string; importe: string; vence: string; atrasado: boolean }>
}

/**
 * «Esta semana» del resumen: lo que vence o ya venció, cada cosa con su botón de resolver
 * ahí mismo. Lo que no está atrasado ni vence en siete días no sale: el resumen dice qué toca.
 */
export function ThisWeekCard({ evento, semana }: { evento: Evento; semana: SemanaVista }) {
  const base = `/panel/eventos/${evento.eventSlug}/planner`
  const nada = semana.tareas.length === 0 && semana.pagos.length === 0
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 [font-variant-numeric:tabular-nums]">
        <Link className="text-[13px] text-ink-soft hover:text-ink" href={`${base}/tareas`}>
          Plan de tareas: <strong className="font-display text-[22px] font-light text-ink">{semana.avance} %</strong> hecho
        </Link>
        {semana.presupuesto === null ? null : (
          <Link className="text-[13px] text-ink-soft hover:text-ink" href={`${base}/presupuesto`}>
            Presupuesto: {semana.presupuesto.pagado} pagado de {semana.presupuesto.comprometido} · previsto {semana.presupuesto.previsto}
          </Link>
        )}
      </div>

      {nada ? (
        <p className="text-[13px] text-ink-mute">Nada vence esta semana.</p>
      ) : (
        <ul className="flex flex-col">
          {semana.tareas.map((t) => (
            <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-2.5 last:border-none" key={`t-${t.id}`}>
              <span className="min-w-0 text-[13px] text-ink">
                {t.title}
                <span className="block text-[11px] text-ink-mute">Tarea · vence {t.vence}</span>
              </span>
              <span className="flex items-center gap-2">
                <Pill tone={t.atrasada ? 'no' : 'maybe'}>{t.atrasada ? 'Atrasada' : 'Esta semana'}</Pill>
                <Accion action={toggleTaskAction} evento={evento} extra={{ taskId: t.id }} label={`Marcar hecha «${t.title}»`}>
                  Hecha
                </Accion>
              </span>
            </li>
          ))}
          {semana.pagos.map((g) => (
            <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-2.5 last:border-none" key={`g-${g.id}`}>
              <span className="min-w-0 text-[13px] text-ink">
                {g.concepto} · {g.importe}
                <span className="block text-[11px] text-ink-mute">Pago · vence {g.vence}</span>
              </span>
              <span className="flex items-center gap-2">
                <Pill tone={g.atrasado ? 'no' : 'maybe'}>{g.atrasado ? 'Vencido' : 'Esta semana'}</Pill>
                <Accion action={setPaymentPaidAction} evento={evento} extra={{ paymentId: g.id, paid: 'true' }} label={`Marcar pagado ${g.concepto} ${g.importe}`}>
                  Pagado
                </Accion>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
