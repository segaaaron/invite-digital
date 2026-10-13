'use client'

import { useActionState, useId, useState } from 'react'
import { formatAmount } from '@/shared/money'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
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

/** Las columnas de la tabla de extras (maqueta E49): Extra · Precio · Estado · Editar. */
const COLUMNAS = 'min-[700px]:grid-cols-[minmax(0,1fr)_110px_130px_auto]'

/** La cabecera de la tabla de extras, con las mismas columnas que sus filas. */
export function CabeceraDeExtras() {
  return (
    <div aria-hidden className={`grid gap-x-5 border-b border-line-panel-strong px-4.5 pt-4 pb-2.5 text-[13px] font-medium text-ink-mute max-[699px]:hidden ${COLUMNAS}`}>
      <span>Extra</span>
      <span>Precio</span>
      <span>Estado</span>
      <span />
    </div>
  )
}

/**
 * **Un extra, una fila de la tabla de la maqueta** (E49): nombre y qué hace, precio, si está a la venta y «Editar», que
 * despliega su formulario —nombre, precio, cuánto suma y a la venta— en la misma fila. **Qué hace ya no se cambia** una
 * vez creado: cambiarle el efecto a un extra que se está vendiendo cambiaría lo que el cliente cree que compró.
 */
export function ExtraEditor({ extra, vendidos }: { extra: ExtraEditable; vendidos: number }) {
  const [estado, guardar, guardando] = useActionState(sinCaerse(saveExtraAction), INICIAL)
  const [editando, setEditando] = useState(false)
  const id = useId()
  const e = estado.status === 'error' ? estado.valores : undefined
  const unidad = UNIDAD[extra.effect]
  const abierto = editando || estado.status === 'error'
  const precio = Number(extra.precio.replace(',', '.'))

  return (
    <div className="border-b border-line-panel last:border-none">
      <div className={`grid items-center gap-x-5 gap-y-1.5 px-4.5 py-3.5 ${COLUMNAS}`}>
        <span className="min-w-0">
          <span className="block font-medium">{extra.name}</span>
          <span className="block text-[13px] text-ink-mute">
            {NOMBRE_DE_EFECTO[extra.effect as keyof typeof NOMBRE_DE_EFECTO] ?? extra.effect}
            {vendidos === 0 ? '' : `, vendido ${vendidos} ${vendidos === 1 ? 'vez' : 'veces'}`}
          </span>
        </span>
        <span className="text-[14.5px] [font-variant-numeric:tabular-nums]">{Number.isNaN(precio) ? `Bs ${extra.precio}` : formatAmount(Math.round(precio * 100), 'BOB').replace(/,00$/, '')}</span>
        <span>
          <Pill tone={extra.isActive ? 'ok' : 'neutro'}>{extra.isActive ? 'A la venta' : 'Apagado'}</Pill>
        </span>
        <span className="justify-self-end max-[699px]:justify-self-start">
          <PanelButton aria-expanded={abierto} aria-label={`${abierto ? 'Cerrar' : 'Editar'} ${extra.name}`} onClick={() => setEditando((v) => !v)} size="sm">
            {abierto ? 'Cerrar' : 'Editar'}
          </PanelButton>
        </span>
      </div>

      {abierto ? (
        <form
          action={guardar}
          aria-label={`Extra ${extra.name}`}
          className="grid items-end gap-x-5 gap-y-3 bg-fila px-4.5 py-4 min-[900px]:grid-cols-[minmax(0,1.5fr)_150px_140px_auto]"
          key={e ? JSON.stringify(e) : 'base'}
        >
          <input name="slug" readOnly type="hidden" value={extra.slug} />
          <input name="effect" type="hidden" value={extra.effect} />
          <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-n`}>
            <span className="text-[14px] font-medium">Nombre</span>
            <input className="h-[46px] w-full rounded-[8px] border border-line-panel-strong bg-bg-raised px-3.5 text-[15px] outline-none focus:border-gold" defaultValue={e?.name ?? extra.name} id={`${id}-n`} maxLength={80} name="name" required />
          </label>
          <UnitField decimal defaultValue={e?.price ?? extra.precio} id={`${id}-p`} label="Precio" name="price" prefix="Bs" required />
          {unidad ? (
            <UnitField defaultValue={e?.amount ?? String(extra.amount)} id={`${id}-a`} label="Suma" name="amount" unit={unidad} />
          ) : (
            // Sin cantidad que sumar, se manda 0 para que la acción no lea un valor viejo.
            <span className="max-[899px]:hidden">
              <input name="amount" type="hidden" value="0" />
            </span>
          )}
          <div className="flex items-center justify-end gap-3">
            <SwitchRow defaultChecked={e ? e.isActive === 'on' : extra.isActive} description="" label="A la venta" name="isActive" />
            <SubmitButton pending={guardando} pendingLabel="Guardando…" variant="primary">
              Guardar
            </SubmitButton>
          </div>
          <div className="min-[900px]:col-span-4">
            <ActionFeedback state={estado} />
          </div>
        </form>
      ) : estado.status === 'success' ? (
        <div className="px-4.5 pb-3">
          <ActionFeedback state={estado} />
        </div>
      ) : null}
    </div>
  )
}
