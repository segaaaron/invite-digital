'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { decideOrderAction, type DecideOrderState } from '../actions'

const INICIAL: DecideOrderState = { status: 'idle' }

/**
 * Aprobar o rechazar un pedido.
 *
 * **La decisión viaja en el botón que se pulsa**, no en un campo oculto que un `onClick`
 * actualiza: `setState` no ha corrido todavía cuando el formulario se envía, así que el
 * campo iría con el valor anterior y «Rechazar» aprobaría el pedido. El emisor del envío
 * entra en el `FormData` con su `name` y su `value`, que es exactamente para esto.
 *
 * **Rechazar exige nota, y quien lo comprueba es el servidor.** «Rechazado» a secas deja
 * al cliente sin saber si transfirió de menos, a otra cuenta o subió la foto equivocada,
 * y la única salida que le queda es llamar por teléfono.
 */
export function OrderDecision({ orderId }: { orderId: string }) {
  const [estado, accion, pendiente] = useActionState<DecideOrderState, FormData>(decideOrderAction, INICIAL)
  const id = useId()

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input name="orderId" type="hidden" value={orderId} />

      <label className="flex flex-col gap-2" htmlFor={id}>
        <span className={LABEL_CLASS}>Nota para el cliente · obligatoria si rechazas</span>
        <input
          className={FIELD_CLASS}
          id={id}
          maxLength={500}
          name="note"
          placeholder="La transferencia es de otro importe"
          type="text"
        />
      </label>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <PanelButton disabled={pendiente} name="decision" type="submit" value="approved" variant="primary">
          {pendiente ? 'Guardando…' : 'Aprobar pago'}
        </PanelButton>
        <PanelButton disabled={pendiente} name="decision" type="submit" value="rejected" variant="danger">
          Rechazar
        </PanelButton>
      </div>
    </form>
  )
}
