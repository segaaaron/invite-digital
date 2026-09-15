'use client'

import { useActionState, useId } from 'react'
import { EFECTOS_DE_EXTRA, NOMBRE_DE_EFECTO } from '@/modules/plans'
import { FIELD_CLASS, Field, PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { type AdminActionState, saveExtraAction } from '../actions'

const INICIAL: AdminActionState = { status: 'idle' }

export type ExtraEditable = { readonly slug: string; readonly name: string; readonly precio: string; readonly effect: string; readonly amount: number; readonly isActive: boolean }

/** Un extra del catálogo: se edita en su tarjeta y se pone a la venta con un tilde. */
export function ExtraEditor({ extra }: { extra: ExtraEditable }) {
  const [estado, guardar, guardando] = useActionState(saveExtraAction, INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  return (
    <form action={guardar} aria-label={`Extra ${extra.name}`} className="flex flex-col gap-3 border-b border-line-panel py-4 last:border-none" key={e ? JSON.stringify(e) : 'base'}>
      <input name="slug" readOnly type="hidden" value={extra.slug} />
      <div className="grid gap-3 min-[560px]:grid-cols-4">
        <Field htmlFor={`${id}-n`} label="Nombre">
          <input className={FIELD_CLASS} defaultValue={e?.name ?? extra.name} id={`${id}-n`} maxLength={80} name="name" required />
        </Field>
        <Field htmlFor={`${id}-p`} label="Precio (Bs)">
          <input className={FIELD_CLASS} defaultValue={e?.price ?? extra.precio} id={`${id}-p`} inputMode="decimal" name="price" required />
        </Field>
        <Field htmlFor={`${id}-e`} label="Qué hace">
          <select className={FIELD_CLASS} defaultValue={e?.effect ?? extra.effect} id={`${id}-e`} name="effect">
            {EFECTOS_DE_EXTRA.map((x) => (
              <option key={x} value={x}>
                {NOMBRE_DE_EFECTO[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`${id}-a`} label="Cantidad">
          <input className={FIELD_CLASS} defaultValue={e?.amount ?? String(extra.amount)} id={`${id}-a`} inputMode="numeric" name="amount" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink">
        <input defaultChecked={e ? e.isActive === 'on' : extra.isActive} name="isActive" type="checkbox" />A la venta
      </label>
      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
      {estado.status === 'success' ? <PanelAlert tone="ok">{estado.message}</PanelAlert> : null}
      <div>
        <PanelButton disabled={guardando} type="submit">
          {guardando ? 'Guardando…' : 'Guardar extra'}
        </PanelButton>
      </div>
    </form>
  )
}
