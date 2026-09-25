'use client'

import Link from 'next/link'
import { useActionState, useId } from 'react'
import { type PlannerActionState, saveBudgetPlanAction } from '@/app/_acciones/planner/actions'
import { FIELD_CLASS, Field, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import type { EstadoDeCategoria } from '../domain/presupuesto'
import { type Evento, Ocultos } from './Accion'

const INICIAL: PlannerActionState = { status: 'idle' }

export type CategoriaVista = {
  readonly clave: string
  readonly nombre: string
  /** Importes ya formateados. */
  readonly asignado: string
  readonly comprometido: string
  readonly pagado: string
  /** Para la barra: lo comprometido sobre lo asignado, de 0 a más de 1. */
  readonly avance: number
  readonly estado: EstadoDeCategoria
  readonly partidas: number
  /** Lo asignado en su forma de campo (`1234.50`), para ajustar el reparto. */
  readonly campoAsignado: string
}

export type PlanVista = {
  readonly total: string
  readonly comprometido: string
  readonly pagado: string
  /** «Bs 1.200,00» que quedan, o «Bs 300,00 de más». */
  readonly queda: string
  readonly pasado: boolean
  readonly avance: number
  readonly campoTotal: string
}

const ESTADO: Record<EstadoDeCategoria, { texto: string; tono: 'ok' | 'maybe' | 'no' | 'pending' }> = {
  libre: { texto: 'Sin gastos', tono: 'pending' },
  en_marcha: { texto: 'En marcha', tono: 'ok' },
  cerca: { texto: 'Casi al límite', tono: 'maybe' },
  pasado: { texto: 'Te pasaste', tono: 'no' },
}

/** El primer paso: cuánto se quiere gastar. Con eso se reparte solo por categorías. */
export function BudgetStart({ evento }: { evento: Evento }) {
  const [estado, enviar, enviando] = useActionState(saveBudgetPlanAction, INICIAL)
  const id = useId()
  return (
    <form action={enviar} className="flex flex-col items-start gap-4">
      <Ocultos {...evento} />
      <p className="max-w-[60ch] text-[14px] leading-[1.7] text-ink-soft">
        Escribe cuánto quieres gastar en total y lo repartimos por categorías —salón, comida, fotografía, vestido…— con la guía que se usa
        para estas fiestas. Después lo ajustas a tu manera y ves en cada una cuánto llevas.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field htmlFor={`${id}-t`} label="Presupuesto total (Bs)">
          <input className={`${FIELD_CLASS} w-[220px] text-[18px]`} id={`${id}-t`} inputMode="decimal" name="total" placeholder="60000" required />
        </Field>
        <SubmitButton pending={enviando} pendingLabel="Repartiendo…" variant="primary">
          Repartir mi presupuesto
        </SubmitButton>
      </div>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}

/** El presupuesto de un vistazo: cuánto hay, cuánto va comprometido y qué categoría se pasa. */
export function BudgetOverview({ evento, plan, categorias, editable }: { evento: Evento; plan: PlanVista; categorias: readonly CategoriaVista[]; editable: boolean }) {
  const [estado, enviar, enviando] = useActionState(saveBudgetPlanAction, INICIAL)
  const id = useId()
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 min-[700px]:grid-cols-4 [font-variant-numeric:tabular-nums]">
        {[
          ['Presupuesto', plan.total],
          ['Comprometido', plan.comprometido],
          ['Pagado', plan.pagado],
          [plan.pasado ? 'Te pasaste' : 'Te queda', plan.queda],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-ink-mute uppercase">{k}</p>
            <p className={`font-display text-[26px] font-light [font-variant-numeric:lining-nums] ${k === 'Te pasaste' ? 'text-danger-deep' : 'text-ink'}`}>{v}</p>
          </div>
        ))}
      </div>
      <div aria-hidden className="h-2 overflow-hidden rounded-full bg-bg-top">
        <div className={`h-full rounded-full ${plan.pasado ? 'bg-danger' : 'bg-sage'}`} style={{ width: `${Math.min(100, plan.avance * 100)}%` }} />
      </div>

      <ul className="flex flex-col divide-y divide-line-panel">
        {categorias.map((c) => (
          <li className="flex flex-col gap-2 py-3" key={c.clave}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[14px] text-ink">{c.nombre}</span>
              <span className="flex items-center gap-2 text-[12.5px] text-ink-soft [font-variant-numeric:tabular-nums]">
                {`${c.comprometido} de ${c.asignado}`}
                <Pill tone={ESTADO[c.estado].tono}>{ESTADO[c.estado].texto}</Pill>
              </span>
            </div>
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-bg-top">
              <div
                className={`h-full rounded-full ${c.estado === 'pasado' ? 'bg-danger' : c.estado === 'cerca' ? 'bg-gold' : 'bg-sage'}`}
                style={{ width: `${Math.min(100, c.avance * 100)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 text-[12px] text-ink-mute">
              <span>{c.partidas === 0 ? 'Todavía nada anotado' : `${c.partidas} gasto${c.partidas === 1 ? '' : 's'} · pagado ${c.pagado}`}</span>
              {editable ? (
                <Link className="text-ink underline underline-offset-2" href={`?panel=partida&categoria=${c.clave}`}>
                  Anotar un gasto
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {editable ? (
        <details className="rounded-[14px] border border-line-panel bg-bg-top/50 p-4">
          <summary className="cursor-pointer text-[13px] text-ink">Ajustar el reparto</summary>
          <form action={enviar} className="mt-4 flex flex-col gap-3">
            <Ocultos {...evento} extra={{ modo: 'reparto' }} />
            <div className="grid gap-3 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
              {categorias.map((c) => (
                <Field htmlFor={`${id}-${c.clave}`} key={c.clave} label={`${c.nombre} (Bs)`}>
                  <input className={FIELD_CLASS} defaultValue={c.campoAsignado} id={`${id}-${c.clave}`} inputMode="decimal" name={`asig_${c.clave}`} />
                </Field>
              ))}
            </div>
            <p className="text-[12px] text-ink-mute">El presupuesto total pasa a ser la suma de lo que asignes.</p>
            <ActionFeedback errorsOnly state={estado} />
            <div>
              <SubmitButton pending={enviando} pendingLabel="Guardando…" variant="primary">
                Guardar reparto
              </SubmitButton>
            </div>
          </form>
        </details>
      ) : null}
    </div>
  )
}
