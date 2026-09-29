'use client'

import { useActionState, useId } from 'react'
import { NOMBRE_DE_EFECTO } from '@/modules/plans'
import { SwitchRow, UnitField } from '@/shared/design/ui/panel/ajustes'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { saveExtraAction } from '@/app/_acciones/admin/planes-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: AdminActionState = { status: 'idle' }

export type ExtraEditable = { readonly slug: string; readonly name: string; readonly precio: string; readonly effect: string; readonly amount: number; readonly isActive: boolean }

/** Los efectos que suman una cantidad, con su unidad. Los demás encienden algo y no la usan. */
const UNIDAD: Partial<Record<string, string>> = { mas_grupos: 'invitaciones', mas_dias: 'días', mas_porteros: 'personas', sumar_planner: 'planners' }

/**
 * **Un extra, una fila**: qué hace, el precio, si está a la venta y cuántas veces se vendió, con su
 * botón. Eran formularios enteros de cuatro campos —ocho bloques iguales seguidos—. **Qué hace ya
 * no se cambia** una vez creado: cambiarle el efecto a un extra que se está vendiendo cambiaría lo
 * que el cliente cree que compró.
 */
export function ExtraEditor({ extra, vendidos }: { extra: ExtraEditable; vendidos: number }) {
  const [estado, guardar, guardando] = useActionState(sinCaerse(saveExtraAction), INICIAL)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const unidad = UNIDAD[extra.effect]

  return (
    <form
      action={guardar}
      aria-label={`Extra ${extra.name}`}
      className="grid items-center gap-x-5 gap-y-3 border-b border-line-panel py-4 last:border-none min-[900px]:grid-cols-[minmax(0,1.5fr)_150px_140px_120px_auto]"
      key={e ? JSON.stringify(e) : 'base'}
    >
      <input name="slug" readOnly type="hidden" value={extra.slug} />
      <input name="effect" type="hidden" value={extra.effect} />

      <div className="flex min-w-0 flex-col gap-1.5">
        <label className="sr-only" htmlFor={`${id}-n`}>
          Nombre
        </label>
        <input className="w-full min-w-0 border-b border-transparent bg-transparent font-display text-[19px] leading-tight text-ink outline-none hover:border-line-panel-strong focus:border-ink" defaultValue={e?.name ?? extra.name} id={`${id}-n`} maxLength={80} name="name" required />
        <span className="text-[12px] text-ink-mute">{NOMBRE_DE_EFECTO[extra.effect as keyof typeof NOMBRE_DE_EFECTO] ?? extra.effect}</span>
      </div>

      <UnitField decimal defaultValue={e?.price ?? extra.precio} id={`${id}-p`} label="Precio" name="price" prefix="Bs" required />

      {unidad ? (
        <UnitField defaultValue={e?.amount ?? String(extra.amount)} id={`${id}-a`} label="Suma" name="amount" unit={unidad} />
      ) : (
        // Sin cantidad que sumar, se manda 0 para que la acción no lea un valor viejo.
        <span className="max-[899px]:hidden">
          <input name="amount" type="hidden" value="0" />
        </span>
      )}

      <div className="flex flex-col gap-1">
        <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">Vendido</span>
        <span className="font-display text-[18px] text-ink [font-variant-numeric:lining-nums]">{vendidos === 0 ? '—' : `${vendidos} ${vendidos === 1 ? 'vez' : 'veces'}`}</span>
      </div>

      <div className="flex items-center justify-end gap-3">
        <SwitchRow defaultChecked={e ? e.isActive === 'on' : extra.isActive} description="" label="A la venta" name="isActive" />
        <SubmitButton pending={guardando} pendingLabel="Guardando…" variant="default">
          Guardar
        </SubmitButton>
      </div>
      <div className="min-[900px]:col-span-5">
        <ActionFeedback state={estado} />
      </div>
    </form>
  )
}
