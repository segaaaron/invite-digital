'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { decideOrderAction, type DecideOrderState } from '@/app/_acciones/orders/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

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
export function OrderDecision({
  orderId,
  esExtra = false,
  importe = null,
  correo = null,
}: {
  orderId: string
  /** Un extra no crea boda: no pide acceso. */
  esExtra?: boolean
  /** Lo que tiene que decir la transferencia, para compararlo antes de aprobar. */
  importe?: string | null
  /** El correo del cliente si ya se sabe (del pedido o de su consulta). Sin él, se pide aquí. */
  correo?: string | null
}) {
  const [estado, accion, pendiente] = useActionState<DecideOrderState, FormData>(decideOrderAction, INICIAL)
  const id = useId()

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input name="orderId" type="hidden" value={orderId} />

      {importe === null ? null : (
        <p className="rounded-[12px] border border-gold/40 bg-gold/8 px-4 py-3 text-[13px] text-ink">
          Comprueba que la transferencia sea de <b className="font-medium">{importe}</b> antes de aprobar.
        </p>
      )}

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

      {/* Al aprobar nace el evento con el diseño que eligió y el plan que pagó, y su acceso: la
          contraseña **se genera sola** y le llega por correo. Nadie la inventa ni la escribe. Si
          el correo no se sabe todavía, se pide aquí; si ya tiene cuenta, solo se le suma el evento. */}
      {esExtra ? null : correo !== null ? (
        <input name="clientEmail" type="hidden" value={correo} />
      ) : (
        <label className="flex flex-col gap-2" htmlFor={`${id}-correo`}>
          <span className={LABEL_CLASS}>Correo del cliente · le llega ahí su acceso</span>
          <input className={FIELD_CLASS} id={`${id}-correo`} maxLength={160} name="clientEmail" placeholder="novios@correo.com" type="email" />
        </label>
      )}

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}

      {/* No hay bloque de éxito, y no es un olvido: al aprobar —y al rechazar— el pedido
          cambia de estado, este formulario deja de pintarse y cualquier mensaje se iría
          con él. Lo que salió de la decisión lo enseña la tarjeta, leyéndolo de la base. */}

      <div className="flex flex-wrap gap-2.5">
        <SubmitButton name="decision" value="approved" variant="primary" pending={pendiente} pendingLabel={'Guardando…'}>{'Aprobar pago'}</SubmitButton>
        <PanelButton disabled={pendiente} name="decision" type="submit" value="rejected" variant="danger">
          Rechazar
        </PanelButton>
      </div>
    </form>
  )
}
