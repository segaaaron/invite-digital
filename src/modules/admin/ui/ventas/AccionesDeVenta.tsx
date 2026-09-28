'use client'

import { useActionState, useId, useState, useTransition, type ReactNode } from 'react'
import { perderVentaAction, registrarSaldoAction, type VentaActionState } from '@/app/_acciones/admin/ventas-actions'
import { MOTIVOS_DE_PERDIDA } from '@/modules/leads'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS, LABEL_CLASS, botonClases } from '@/shared/design/ui/panel/PanelKit'
import { CheckIcon, PlusIcon } from '@/shared/design/ui/icons'

/**
 * **Abre y anota a la vez**: el WhatsApp, el correo o el enlace se abre en el mismo clic —Safari
 * bloquea la ventana si se abre después de un `await`— y la acción deja constancia detrás
 * («contactada», «recordado»). Un solo botón donde había dos: «Escribir por WhatsApp» y luego
 * acordarse de pulsar «Contactada».
 */
export function AbrirYAnotar({
  href,
  children,
  accion,
  campos,
  variante = 'primary',
  externo = true,
}: {
  href: string
  children: ReactNode
  accion: (formData: FormData) => Promise<void>
  campos: Readonly<Record<string, string>>
  variante?: 'primary' | 'default'
  /** `mailto:` no abre pestaña: se navega en la misma. */
  externo?: boolean
}) {
  const [pendiente, empezar] = useTransition()
  return (
    <button
      aria-busy={pendiente}
      className={botonClases(variante)}
      disabled={pendiente}
      onClick={() => {
        if (externo) window.open(href, '_blank', 'noopener,noreferrer')
        else window.location.href = href
        const datos = new FormData()
        for (const [k, v] of Object.entries(campos)) datos.set(k, v)
        empezar(() => accion(datos))
      }}
      type="button"
    >
      {children}
      {externo ? <span className="sr-only"> (se abre en una pestaña nueva)</span> : null}
    </button>
  )
}

const INICIAL: VentaActionState = { status: 'idle' }

/**
 * **Una sola salida para una venta que no sigue**: el motivo de la lista y la nota. Con pedido
 * sin cobrar, se cancela; sin él, la consulta pasa a perdida. Plegada: es la última opción.
 */
export function PerderVenta({ consultaId, orderId }: { consultaId: string | null; orderId: string | null }) {
  const [estado, accion] = useActionState(perderVentaAction, INICIAL)
  const [motivo, setMotivo] = useState('')
  const id = useId()
  return (
    <details className="group rounded-[16px] border border-line-panel bg-white/60 open:bg-white" open={estado.status === 'error'}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] text-ink-soft [&::-webkit-details-marker]:hidden">
        <span>{orderId === null ? 'Marcar como perdida' : 'Cancelar el pedido y perder la venta'}</span>
        <PlusIcon className="size-3.5 text-ink-mute transition-transform group-open:rotate-45" />
      </summary>
      <form action={accion} className="flex flex-col gap-3 border-t border-line-panel px-4 pt-3 pb-4">
        {consultaId === null ? null : <input name="consultaId" type="hidden" value={consultaId} />}
        {orderId === null ? null : <input name="orderId" type="hidden" value={orderId} />}
        <fieldset className="flex flex-col gap-2">
          <legend className={`${LABEL_CLASS} mb-2`}>¿Por qué no sigue?</legend>
          <div className="grid gap-2 min-[480px]:grid-cols-2">
            {MOTIVOS_DE_PERDIDA.map((m) => (
              <label
                className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-line-panel px-3 py-2.5 text-[13px] text-ink transition-colors has-[:checked]:border-ink has-[:checked]:bg-bg-sunken/70"
                key={m.clave}
              >
                <input className="accent-ink" name="motivo" onChange={() => setMotivo(m.clave)} required type="radio" value={m.clave} />
                {m.etiqueta}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2" htmlFor={id}>
          <span className={LABEL_CLASS}>Nota {motivo === 'otro' ? '· obligatoria' : '· opcional'}</span>
          <input className={FIELD_CLASS} id={id} maxLength={500} name="nota" placeholder="Qué pasó, para retomarla si vuelve" required={motivo === 'otro'} type="text" />
        </label>
        <ActionFeedback errorsOnly state={estado} />
        <div>
          <SubmitButton pendingLabel="Guardando…" variant="danger">
            {orderId === null ? 'Marcar como perdida' : 'Cancelar y perder'}
          </SubmitButton>
        </div>
      </form>
    </details>
  )
}

/** El saldo de un pedido con anticipo, recibido. */
export function RegistrarSaldo({ orderId, nombre, publicRef, saldo }: { orderId: string; nombre: string; publicRef: string; saldo: string }) {
  const [estado, accion] = useActionState(registrarSaldoAction, INICIAL)
  return (
    <form action={accion} className="flex flex-col gap-2">
      <input name="orderId" type="hidden" value={orderId} />
      <input name="nombre" type="hidden" value={nombre} />
      <input name="ref" type="hidden" value={publicRef} />
      <SubmitButton pendingLabel="Registrando…">Registrar el saldo · {saldo}</SubmitButton>
      <ActionFeedback state={estado} />
    </form>
  )
}

/** Copiar al portapapeles con su confirmación, sin `alert`. */
export function Copiar({ texto, children }: { texto: string; children: ReactNode }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <button
      className="flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-bg-sunken"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto)
          setCopiado(true)
        } catch {
          setCopiado(false)
        }
      }}
      type="button"
    >
      {copiado ? (
        <>
          <CheckIcon className="size-4 text-sage" /> Copiado
        </>
      ) : (
        children
      )}
    </button>
  )
}
