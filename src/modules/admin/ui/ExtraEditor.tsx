'use client'

import { useActionState, useId, useState } from 'react'
import { EFECTOS_DE_EXTRA, NOMBRE_DE_EFECTO } from '@/modules/plans'
import { FIELD_CLASS, Field, Pill } from '@/shared/design/ui/panel/PanelKit'
import { SwitchRow, UnitField } from '@/shared/design/ui/panel/ajustes'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { saveExtraAction } from '@/app/_acciones/admin/planes-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: AdminActionState = { status: 'idle' }

export type ExtraEditable = { readonly slug: string; readonly name: string; readonly precio: string; readonly effect: string; readonly amount: number; readonly isActive: boolean }

/** Los efectos que suman una cantidad, con su unidad. Los demás encienden algo y no la usan. */
const UNIDAD: Partial<Record<string, string>> = { mas_grupos: 'grupos', mas_dias: 'días', mas_porteros: 'porteros', sumar_planner: 'planners' }

/**
 * Un extra del catálogo: su resumen de un vistazo —qué hace, cuánto cuesta, si se vende— y los
 * datos en una fila que se despliega. Antes eran cuatro campos iguales por extra y ocho bloques
 * idénticos seguidos, sin distinguir cuál estaba a la venta.
 */
export function ExtraEditor({ extra }: { extra: ExtraEditable }) {
  const [estado, guardar, guardando] = useActionState(saveExtraAction, INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const [efecto, setEfecto] = useState(e?.effect ?? extra.effect)
  const unidad = UNIDAD[efecto]

  return (
    <form
      action={guardar}
      aria-label={`Extra ${extra.name}`}
      className="flex flex-col gap-4 rounded-[16px] border border-line-panel bg-white p-5"
      key={e ? JSON.stringify(e) : 'base'}
    >
      <input name="slug" readOnly type="hidden" value={extra.slug} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-display text-[22px] leading-tight text-ink">{extra.name}</p>
          <p className="text-[12.5px] text-ink-mute">
            {NOMBRE_DE_EFECTO[extra.effect as keyof typeof NOMBRE_DE_EFECTO] ?? extra.effect}
            {UNIDAD[extra.effect] && extra.amount > 0 ? ` · +${extra.amount} ${UNIDAD[extra.effect]}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-[22px] text-ink [font-variant-numeric:lining-nums]">Bs {extra.precio}</span>
          <Pill tone={extra.isActive ? 'ok' : 'no'}>{extra.isActive ? 'A la venta' : 'Apagado'}</Pill>
        </div>
      </div>

      <div className="grid gap-4 min-[700px]:grid-cols-[1.4fr_1fr_1.4fr_1fr]">
        <Field htmlFor={`${id}-n`} label="Nombre">
          <input className={FIELD_CLASS} defaultValue={e?.name ?? extra.name} id={`${id}-n`} maxLength={80} name="name" required />
        </Field>
        <UnitField decimal defaultValue={e?.price ?? extra.precio} id={`${id}-p`} label="Precio" name="price" prefix="Bs" required />
        <Field htmlFor={`${id}-e`} label="Qué hace">
          <select className={FIELD_CLASS} id={`${id}-e`} name="effect" onChange={(ev) => setEfecto(ev.target.value)} value={efecto}>
            {EFECTOS_DE_EXTRA.map((x) => (
              <option key={x} value={x}>
                {NOMBRE_DE_EFECTO[x]}
              </option>
            ))}
          </select>
        </Field>
        {unidad ? (
          <UnitField defaultValue={e?.amount ?? String(extra.amount)} id={`${id}-a`} label="Cuánto suma" name="amount" unit={unidad} />
        ) : (
          // Sin cantidad que sumar, se manda 0 para que la acción no lea un valor viejo.
          <input name="amount" type="hidden" value="0" />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-panel pt-3">
        <div className="min-w-[260px] flex-1">
          <SwitchRow defaultChecked={e ? e.isActive === 'on' : extra.isActive} description="El anfitrión lo ve en su evento y la web lo lista con su precio." label="A la venta" name="isActive" />
        </div>
        <SubmitButton pending={guardando} pendingLabel="Guardando…" variant="default">
          Guardar extra
        </SubmitButton>
      </div>
      <ActionFeedback state={estado} />
    </form>
  )
}
