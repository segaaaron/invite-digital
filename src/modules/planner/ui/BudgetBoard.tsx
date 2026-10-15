'use client'

import { ReceiptIcon } from '@/shared/design/ui/icons'
import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useId } from 'react'
import { FIELD_CLASS, Field, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { addPaymentAction, type PlannerActionState, removeItemAction, removePaymentAction, saveItemAction, setPaymentPaidAction } from '@/app/_acciones/planner/actions'
import type { Pagador } from '../domain/presupuesto'
import { Accion, type Evento, Ocultos } from './Accion'
import { ActionFeedback, SubmitButton, EmptyState } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traducir } from '@/shared/i18n/en-ingles'

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
  const t = useT()
  const id = useId()
  return (
    <>
      {/* «Qué padrino» se enseña por CSS según la opción marcada, sin estado: React vacía el
          formulario al terminar la acción y un `select` controlado se quedaba diciendo otra cosa. */}
      <div className="campos-partida grid gap-3 min-[560px]:grid-cols-2">
        <Field htmlFor={`${id}-c`} label={t('Concepto', 'Description')}>
          <input className={FIELD_CLASS} defaultValue={inicial.concept} id={`${id}-c`} maxLength={160} name="concept" placeholder={t('Salón Los Encinos', 'Los Encinos venue')} required />
        </Field>
        <Field htmlFor={`${id}-k`} label={t('Categoría', 'Category')}>
          <select className={FIELD_CLASS} defaultValue={inicial.category || opciones.categorias[0]?.clave} id={`${id}-k`} name="category">
            {opciones.categorias.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-p`} label={t('Previsto (Bs)', 'Estimated (Bs)')}>
          <input className={FIELD_CLASS} defaultValue={inicial.estimated} id={`${id}-p`} inputMode="decimal" name="estimated" placeholder="12000" />
        </Field>
        <Field htmlFor={`${id}-x`} label={t('Contratado (Bs) · vacío si aún no', 'Hired (Bs) · empty if not yet')}>
          <input className={FIELD_CLASS} defaultValue={inicial.contracted} id={`${id}-x`} inputMode="decimal" name="contracted" />
        </Field>
        <Field htmlFor={`${id}-q`} label={t('Quién paga', 'Who pays')}>
          <select className={FIELD_CLASS} defaultValue={inicial.payer} id={`${id}-q`} name="payer">
            {opciones.pagadores.map((p) => (
              <option key={p.clave} value={p.clave}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Field>
        <div className="hidden [.campos-partida:has(option[value=padrino]:checked)_&]:block">
          <Field htmlFor={`${id}-n`} label={t('Qué padrino', 'Which sponsor')}>
            <input className={FIELD_CLASS} defaultValue={inicial.padrinoLabel} id={`${id}-n`} maxLength={120} name="padrinoLabel" placeholder={t('Tío Jorge', 'Uncle Jorge')} />
          </Field>
        </div>
      </div>
      <Field htmlFor={`${id}-o`} label={t('Notas', 'Notes')}>
        <textarea className={FIELD_CLASS} defaultValue={inicial.notes} id={`${id}-o`} maxLength={2000} name="notes" rows={2} />
      </Field>
    </>
  )
}

/**
 * Alta o edición de una partida. El nombre del padrino solo aparece si paga un padrino. Con
 * error, los campos se vuelven a montar con lo que se envió: React vacía el formulario.
 */
export function ItemForm({
  evento,
  opciones,
  partida,
  categoria,
  cerrarEn,
}: {
  evento: Evento
  opciones: Opciones
  partida?: PartidaVista
  categoria?: string | undefined
  /** En el diálogo «Anotar un gasto»: guardado, se cierra y se ve el gasto en la lista. */
  cerrarEn?: string
}) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(saveItemAction), INICIAL)
  const router = useRouter()
  useEffect(() => {
    if (estado.status === 'success' && cerrarEn !== undefined) router.replace(cerrarEn)
  }, [estado, cerrarEn, router])
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
        category: partida?.category ?? categoria ?? '',
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
      <ActionFeedback errorsOnly state={estado} />
      {estado.status === 'success' ? <PanelAlert tone="ok">{t('Partida guardada.', 'Line item saved.')}</PanelAlert> : null}
      <div>
        <SubmitButton variant={partida ? 'default' : 'primary'} pending={enviando} pendingLabel={t('Guardando…', 'Saving…')}>{partida ? t('Guardar partida', 'Save line item') : t('Sumar partida', 'Add line item')}</SubmitButton>
      </div>
    </form>
  )
}

function NuevoPago({ evento, itemId, concepto }: { evento: Evento; itemId: string; concepto: string }) {
  const t = useT()
  const [estado, enviar, enviando] = useActionState(sinCaerse(addPaymentAction), INICIAL)
  const id = useId()
  const enviados = estado.status === 'error' ? estado.valores : undefined
  return (
    <form action={enviar} className="flex flex-wrap items-end gap-3" key={enviados ? JSON.stringify(enviados) : 'base'}>
      <Ocultos {...evento} extra={{ itemId }} />
      <Field htmlFor={`${id}-a`} label={t('Importe (Bs)', 'Amount (Bs)')}>
        <input className={FIELD_CLASS} defaultValue={enviados?.amount ?? ''} id={`${id}-a`} inputMode="decimal" name="amount" required />
      </Field>
      <Field htmlFor={`${id}-d`} label={t('Vence', 'Due')}>
        <CampoFecha defaultValue={enviados?.dueDate ?? ''} id={`${id}-d`} name="dueDate" />
      </Field>
      <Field htmlFor={`${id}-e`} label={t('Es', 'It is')}>
        <select className={FIELD_CLASS} defaultValue={enviados?.label ?? ''} id={`${id}-e`} name="label">
          <option value="">{t('Pago', 'Payment')}</option>
          <option value="anticipo">{t('Anticipo', 'Deposit')}</option>
          <option value="cuota">{t('Cuota', 'Installment')}</option>
          <option value="saldo">{t('Saldo', 'Balance')}</option>
        </select>
      </Field>
      <SubmitButton aria-label={t(`Sumar pago a ${concepto}`, `Add payment to ${concepto}`)} variant="default" pending={enviando} pendingLabel={t('Sumando…', 'Adding…')}>{t('Sumar pago', 'Add payment')}</SubmitButton>
      <ActionFeedback errorsOnly state={estado} />
    </form>
  )
}

/** Las partidas, cada una con sus cuentas, sus pagos y su edición plegada. */
export function BudgetBoard({ evento, opciones, partidas, editable = true }: { evento: Evento; opciones: Opciones; partidas: readonly PartidaVista[]; /** El co-anfitrión lo ve sin tocarlo. */ editable?: boolean }) {
  const t = useT()
  if (partidas.length === 0) {
    return (
      <EmptyState
        compact
        description={t('Anota cada gasto con lo que cuesta y lo que ya pagaste. Empieza por el salón: suele ser el más grande.', 'Add each expense with what it costs and what you’ve already paid. Start with the venue: it’s usually the biggest.')}
        icon={<ReceiptIcon />}
        title={t('Aún no anotaste gastos', 'You haven’t added expenses yet')}
      />
    )
  }
  return (
    <ul className="flex flex-col border-t border-line-panel">
      {partidas.map((p) => (
        <li aria-label={p.concept} className="flex flex-col gap-2.5 border-b border-line-panel py-4" key={p.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-[15px] font-medium text-ink">{p.concept}</span>
              <span className="text-[13px] text-ink-mute">
                {p.categoria} · {t('Paga', 'Paid by')}: {p.quienPaga}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[14px] [font-variant-numeric:tabular-nums] min-[560px]:grid-cols-4">
              {[
                [t('Previsto', 'Estimated'), p.previsto],
                [t('Contratado', 'Hired'), p.contratado ?? '—'],
                [t('Pagado', 'Paid'), p.pagado],
                [t('Falta', 'Left'), p.falta],
              ].map(([k, v]) => (
                <div className="flex flex-col" key={k}>
                  <dt className="text-[12.5px] text-ink-mute">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {p.pagos.length === 0 ? null : (
            <ul className="flex flex-col rounded-[12px] bg-fila px-3.5 py-1">
              {p.pagos.map((g) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-1.5 text-[14px]" key={g.id}>
                  <span className="text-ink [font-variant-numeric:tabular-nums]">
                    {g.etiqueta ? `${traducir(g.etiqueta, t)} · ` : ''}
                    {g.importe}
                    <span className="text-ink-mute">{g.vence ? t(` · vence ${g.vence}`, ` · due ${g.vence}`) : t(' · sin fecha', ' · no date')}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill tone={g.pagado ? 'ok' : g.atrasado ? 'no' : 'pending'}>{g.pagado ? t('Pagado', 'Paid') : g.atrasado ? t('Vencido', 'Overdue') : t('Por pagar', 'To pay')}</Pill>
                    {editable ? (
                      <>
                    <Accion action={setPaymentPaidAction} evento={evento} extra={{ paymentId: g.id, paid: String(!g.pagado) }} label={g.pagado ? t(`Desmarcar pago de ${g.importe}`, `Unmark payment of ${g.importe}`) : t(`Marcar pagado ${g.importe}`, `Mark ${g.importe} paid`)}>
                      {g.pagado ? t('Desmarcar', 'Unmark') : t('Pagado', 'Paid')}
                    </Accion>
                    <Accion action={removePaymentAction} evento={evento} extra={{ paymentId: g.id }} label={t(`Quitar pago de ${g.importe}`, `Remove payment of ${g.importe}`)} variant="danger">
                      {t('Quitar', 'Remove')}
                    </Accion>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {editable ? (
          <details>
            <summary className="inline-flex min-h-8 max-[767px]:min-h-11 cursor-pointer list-none items-center text-[13px] text-ink-mute hover:text-ink [&::-webkit-details-marker]:hidden">{t('Pagos, editar o quitar', 'Payments, edit or remove')}</summary>
            <div className="mt-3 flex flex-col gap-4">
              <NuevoPago concepto={p.concept} evento={evento} itemId={p.id} />
              <ItemForm evento={evento} opciones={opciones} partida={p} />
              <div>
                <Accion action={removeItemAction} evento={evento} extra={{ itemId: p.id }} label={t(`Quitar la partida ${p.concept}`, `Remove line item ${p.concept}`)} variant="danger">
                  {t('Quitar partida', 'Remove line item')}
                </Accion>
              </div>
            </div>
          </details>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** Descarga el CSV que ya compuso la página. Se arma en el navegador: no hay nada que pedir. */
export function BudgetCsvButton({ csv, nombre }: { csv: string; nombre: string }) {
  const t = useT()
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
      {t('Exportar CSV', 'Export CSV')}
    </PanelButton>
  )
}
