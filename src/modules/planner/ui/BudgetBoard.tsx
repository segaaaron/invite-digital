'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { addPaymentAction, type PlannerActionState, removeItemAction, removePaymentAction, saveItemAction, setPaymentPaidAction } from '../actions'
import type { Pagador } from '../domain/presupuesto'
import { Accion, type Evento, Ocultos } from './Accion'

const INICIAL: PlannerActionState = { status: 'idle' }

export type PartidaVista = {
  readonly id: string
  readonly category: string
  readonly categoria: string
  readonly concept: string
  readonly payer: Pagador
  readonly quienPaga: string
  readonly padrinoLabel: string | null
  readonly notes: string | null
  /** Importes ya formateados y, para editar, en su forma de campo (`1234.50`). */
  readonly previsto: string
  readonly contratado: string | null
  readonly pagado: string
  readonly falta: string
  readonly campoPrevisto: string
  readonly campoContratado: string
  readonly pagos: ReadonlyArray<{ id: string; importe: string; etiqueta: string | null; vence: string | null; pagado: boolean; atrasado: boolean }>
}

type Opciones = {
  categorias: ReadonlyArray<{ clave: string; nombre: string }>
  pagadores: ReadonlyArray<{ clave: Pagador; nombre: string }>
}

type ValoresPartida = { concept: string; category: string; estimated: string; contracted: string; payer: Pagador; padrinoLabel: string; notes: string }

function CamposDePartida({ opciones, inicial }: { opciones: Opciones; inicial: ValoresPartida }) {
  const id = useId()
  return (
    <>
      {/* «Qué padrino» se enseña por CSS según la opción marcada, sin estado: React vacía el
          formulario al terminar la acción y un `select` controlado se quedaba diciendo otra cosa. */}
      <div className="campos-partida grid gap-3 min-[560px]:grid-cols-2">
        <Field htmlFor={`${id}-c`} label="Concepto">
          <input className={FIELD_CLASS} defaultValue={inicial.concept} id={`${id}-c`} maxLength={160} name="concept" placeholder="Salón Los Encinos" required />
        </Field>
        <Field htmlFor={`${id}-k`} label="Categoría">
          <select className={FIELD_CLASS} defaultValue={inicial.category || opciones.categorias[0]?.clave} id={`${id}-k`} name="category">
            {opciones.categorias.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-p`} label="Previsto (Bs)">
          <input className={FIELD_CLASS} defaultValue={inicial.estimated} id={`${id}-p`} inputMode="decimal" name="estimated" placeholder="12000" />
        </Field>
        <Field htmlFor={`${id}-x`} label="Contratado (Bs) · vacío si aún no">
          <input className={FIELD_CLASS} defaultValue={inicial.contracted} id={`${id}-x`} inputMode="decimal" name="contracted" />
        </Field>
        <Field htmlFor={`${id}-q`} label="Quién paga">
          <select className={FIELD_CLASS} defaultValue={inicial.payer} id={`${id}-q`} name="payer">
            {opciones.pagadores.map((p) => (
              <option key={p.clave} value={p.clave}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Field>
        <div className="hidden [.campos-partida:has(option[value=padrino]:checked)_&]:block">
          <Field htmlFor={`${id}-n`} label="Qué padrino">
            <input className={FIELD_CLASS} defaultValue={inicial.padrinoLabel} id={`${id}-n`} maxLength={120} name="padrinoLabel" placeholder="Tío Jorge" />
          </Field>
        </div>
      </div>
      <Field htmlFor={`${id}-o`} label="Notas">
        <textarea className={FIELD_CLASS} defaultValue={inicial.notes} id={`${id}-o`} maxLength={2000} name="notes" rows={2} />
      </Field>
    </>
  )
}

/**
 * Alta o edición de una partida. El nombre del padrino solo aparece si paga un padrino. Con
 * error, los campos se vuelven a montar con lo que se envió: React vacía el formulario.
 */
export function ItemForm({ evento, opciones, partida }: { evento: Evento; opciones: Opciones; partida?: PartidaVista }) {
  const [estado, enviar, enviando] = useActionState(saveItemAction, INICIAL)
  const enviados = estado.status === 'error' ? estado.valores : undefined
  const inicial: ValoresPartida = enviados
    ? {
        concept: enviados.concept ?? '',
        category: enviados.category ?? '',
        estimated: enviados.estimated ?? '',
        contracted: enviados.contracted ?? '',
        payer: (enviados.payer as Pagador | undefined) ?? 'anfitriones',
        padrinoLabel: enviados.padrinoLabel ?? '',
        notes: enviados.notes ?? '',
      }
    : {
        concept: partida?.concept ?? '',
        category: partida?.category ?? '',
        estimated: partida?.campoPrevisto ?? '',
        contracted: partida?.campoContratado ?? '',
        payer: partida?.payer ?? 'anfitriones',
        padrinoLabel: partida?.padrinoLabel ?? '',
        notes: partida?.notes ?? '',
      }
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <Ocultos {...evento} extra={{ itemId: partida?.id ?? '' }} />
      <CamposDePartida inicial={inicial} key={enviados ? JSON.stringify(enviados) : 'base'} opciones={opciones} />
      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
      {estado.status === 'success' ? <PanelAlert tone="ok">Partida guardada.</PanelAlert> : null}
      <div>
        <PanelButton disabled={enviando} type="submit" variant={partida ? 'default' : 'primary'}>
          {enviando ? 'Guardando…' : partida ? 'Guardar partida' : 'Sumar partida'}
        </PanelButton>
      </div>
    </form>
  )
}

function NuevoPago({ evento, itemId, concepto }: { evento: Evento; itemId: string; concepto: string }) {
  const [estado, enviar, enviando] = useActionState(addPaymentAction, INICIAL)
  const id = useId()
  const enviados = estado.status === 'error' ? estado.valores : undefined
  return (
    <form action={enviar} className="flex flex-wrap items-end gap-3" key={enviados ? JSON.stringify(enviados) : 'base'}>
      <Ocultos {...evento} extra={{ itemId }} />
      <Field htmlFor={`${id}-a`} label="Importe (Bs)">
        <input className={FIELD_CLASS} defaultValue={enviados?.amount ?? ''} id={`${id}-a`} inputMode="decimal" name="amount" required />
      </Field>
      <Field htmlFor={`${id}-d`} label="Vence">
        <input className={FIELD_CLASS} defaultValue={enviados?.dueDate ?? ''} id={`${id}-d`} name="dueDate" type="date" />
      </Field>
      <Field htmlFor={`${id}-e`} label="Es">
        <select className={FIELD_CLASS} defaultValue={enviados?.label ?? ''} id={`${id}-e`} name="label">
          <option value="">Pago</option>
          <option value="anticipo">Anticipo</option>
          <option value="cuota">Cuota</option>
          <option value="saldo">Saldo</option>
        </select>
      </Field>
      <PanelButton aria-label={`Sumar pago a ${concepto}`} disabled={enviando} type="submit">
        {enviando ? 'Sumando…' : 'Sumar pago'}
      </PanelButton>
      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
    </form>
  )
}

/** Las partidas, cada una con sus cuentas, sus pagos y su edición plegada. */
export function BudgetBoard({ evento, opciones, partidas }: { evento: Evento; opciones: Opciones; partidas: readonly PartidaVista[] }) {
  if (partidas.length === 0) {
    return <p className="rounded-[14px] border border-dashed border-line-panel-strong px-4 py-6 text-center text-[13px] text-ink-mute">Todavía no hay partidas. Empieza por el salón: suele ser la más grande.</p>
  }
  return (
    <ul className="flex flex-col gap-3">
      {partidas.map((p) => (
        <li aria-label={p.concept} className="flex flex-col gap-3 rounded-[18px] border border-line-panel bg-white px-5 py-4 shadow-card" key={p.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">{p.categoria}</span>
              <span className="font-display text-[20px] font-light text-ink">{p.concept}</span>
              <span className="text-[11px] text-ink-mute">Paga: {p.quienPaga}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-[12px] [font-variant-numeric:tabular-nums] min-[560px]:grid-cols-4">
              {[
                ['Previsto', p.previsto],
                ['Contratado', p.contratado ?? '—'],
                ['Pagado', p.pagado],
                ['Falta', p.falta],
              ].map(([k, v]) => (
                <div className="flex flex-col" key={k}>
                  <dt className="font-mono text-[9px] tracking-[0.2em] text-ink-mute uppercase">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {p.pagos.length === 0 ? null : (
            <ul className="flex flex-col border-t border-line-panel pt-2">
              {p.pagos.map((g) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-1.5 text-[13px]" key={g.id}>
                  <span className="text-ink [font-variant-numeric:tabular-nums]">
                    {g.etiqueta ? `${g.etiqueta} · ` : ''}
                    {g.importe}
                    <span className="text-ink-mute">{g.vence ? ` · vence ${g.vence}` : ' · sin fecha'}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill tone={g.pagado ? 'ok' : g.atrasado ? 'no' : 'pending'}>{g.pagado ? 'Pagado' : g.atrasado ? 'Vencido' : 'Por pagar'}</Pill>
                    <Accion action={setPaymentPaidAction} evento={evento} extra={{ paymentId: g.id, paid: String(!g.pagado) }} label={g.pagado ? `Desmarcar pago de ${g.importe}` : `Marcar pagado ${g.importe}`}>
                      {g.pagado ? 'Desmarcar' : 'Pagado'}
                    </Accion>
                    <Accion action={removePaymentAction} evento={evento} extra={{ paymentId: g.id }} label={`Quitar pago de ${g.importe}`} variant="danger">
                      Quitar
                    </Accion>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <details>
            <summary className="cursor-pointer text-[11px] text-ink-soft underline underline-offset-2">Pagos, editar o quitar</summary>
            <div className="mt-3 flex flex-col gap-4">
              <NuevoPago concepto={p.concept} evento={evento} itemId={p.id} />
              <ItemForm evento={evento} opciones={opciones} partida={p} />
              <div>
                <Accion action={removeItemAction} evento={evento} extra={{ itemId: p.id }} label={`Quitar la partida ${p.concept}`} variant="danger">
                  Quitar partida
                </Accion>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}

/** Descarga el CSV que ya compuso la página. Se arma en el navegador: no hay nada que pedir. */
export function BudgetCsvButton({ csv, nombre }: { csv: string; nombre: string }) {
  return (
    <PanelButton
      onClick={() => {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const a = document.createElement('a')
        a.href = url
        a.download = nombre
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      Exportar CSV
    </PanelButton>
  )
}
