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

      {/* Al aprobar se crea la boda con el diseño que eligió y el plan que pagó, y estos
          dos campos le dan su acceso. Si el correo ya tiene cuenta, no se le toca la
          contraseña: solo se le añade esta boda. */}
      <div className="grid gap-3 min-[560px]:grid-cols-2">
        <label className="flex flex-col gap-2" htmlFor={`${id}-correo`}>
          <span className={LABEL_CLASS}>Correo del cliente · para crearle su acceso</span>
          <input className={FIELD_CLASS} id={`${id}-correo`} maxLength={160} name="clientEmail" type="email" />
        </label>

        <label className="flex flex-col gap-2" htmlFor={`${id}-clave`}>
          <span className={LABEL_CLASS}>Contraseña inicial · mínimo 12</span>
          <input
            autoComplete="new-password"
            className={FIELD_CLASS}
            id={`${id}-clave`}
            minLength={12}
            name="clientPassword"
            type="text"
          />
        </label>
      </div>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}

      {/* No hay bloque de éxito, y no es un olvido: al aprobar —y al rechazar— el pedido
          cambia de estado, este formulario deja de pintarse y cualquier mensaje se iría
          con él. Lo que salió de la decisión lo enseña la tarjeta, leyéndolo de la base. */}

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
