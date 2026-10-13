'use client'

import { useActionState, useId, useRef, useState } from 'react'
import { CloseIcon } from '@/shared/design/ui/icons'
import { botonClases, FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { decideOrderAction, type DecideOrderState } from '@/app/_acciones/orders/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: DecideOrderState = { status: 'idle' }
const MOTIVOS = ['El monto no coincide', 'No se ve el comprobante', 'Es de otro pedido'] as const
const MAX_NOTA = 440

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
  nombre = null,
}: {
  orderId: string
  /** Un extra no crea boda: no pide acceso. */
  esExtra?: boolean
  /** Lo que tiene que decir la transferencia, para compararlo antes de aprobar. */
  importe?: string | null
  /** El correo del cliente si ya se sabe (del pedido o de su consulta). Sin él, se pide aquí. */
  correo?: string | null
  /** Quién verá el motivo del rechazo (E33). */
  nombre?: string | null
}) {
  const [estado, accion, pendiente] = useActionState<DecideOrderState, FormData>(sinCaerse(decideOrderAction), INICIAL)
  const id = useId()
  const rechazo = useRef<HTMLDialogElement>(null)
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0])
  const [nota, setNota] = useState('')
  const cerrar = () => rechazo.current?.close()
  const pila = nombre?.split(' ')[0] ?? null

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input name="orderId" type="hidden" value={orderId} />

      {importe === null ? null : (
        <p className="rounded-[12px] border border-gold/40 bg-gold/8 px-4 py-3 text-[13px] text-ink">
          Comprueba que la transferencia sea de <b className="font-medium">{importe}</b> antes de aprobar.
        </p>
      )}

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

      <div className="flex flex-wrap justify-end gap-2.5">
        {/* Rechazar abre su diálogo (E33): motivo de lista y una nota que el cliente lee. */}
        <button aria-haspopup="dialog" className={botonClases('danger')} disabled={pendiente} onClick={() => rechazo.current?.showModal()} type="button">
          Rechazar
        </button>
        <SubmitButton name="decision" value="approved" variant="primary" pending={pendiente} pendingLabel={'Guardando…'}>{'Aprobar pago'}</SubmitButton>
      </div>

      <dialog
        aria-labelledby={`${id}-rechazo`}
        className="m-auto max-h-[92dvh] w-[min(560px,94vw)] max-w-none overflow-y-auto rounded-[20px] border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:mx-0 max-[767px]:mt-auto max-[767px]:mb-0 max-[767px]:w-full max-[767px]:rounded-b-none max-[767px]:px-5 max-[767px]:pt-3 max-[767px]:pb-[max(20px,env(safe-area-inset-bottom))]"
        ref={rechazo}
      >
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-panel-strong min-[768px]:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[30px] leading-tight font-medium max-[767px]:text-[26px]" id={`${id}-rechazo`}>
              Rechazar el comprobante
            </h2>
            <p className="text-[15px] text-ink-mute">{nombre ?? 'El cliente'} verá tu motivo y podrá subir otro. El pedido no se pierde.</p>
          </div>
          <button aria-label="Cerrar" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised text-ink transition-colors hover:border-gold" onClick={cerrar} type="button">
            <CloseIcon className="size-4" />
          </button>
        </div>
        <fieldset className="mt-5 flex flex-col gap-2.5">
          <legend className={`${LABEL_CLASS} mb-2.5`}>Motivo</legend>
          {MOTIVOS.map((m) => (
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 text-[15px] has-[:checked]:border-shell-deep" key={m}>
              <input checked={motivo === m} className="size-4 accent-shell-deep" name={`${id}-motivo`} onChange={() => setMotivo(m)} type="radio" />
              {m}
            </label>
          ))}
        </fieldset>
        <label className="mt-5 flex flex-col gap-2" htmlFor={id}>
          <span className={LABEL_CLASS}>Nota para {pila ?? 'el cliente'}</span>
          <textarea className={`${FIELD_CLASS} min-h-24`} id={id} maxLength={MAX_NOTA} onChange={(e) => setNota(e.target.value)} placeholder="Recibimos otro monto: sube el comprobante de lo que falta." value={nota} />
          <span className="flex justify-between text-[13px] text-ink-mute">
            <span>Obligatoria</span>
            <span>
              {nota.length}/{MAX_NOTA}
            </span>
          </span>
        </label>
        {/* La nota que llega al servidor: el motivo y lo escrito. */}
        <input name="note" type="hidden" value={nota.trim() === '' ? '' : `${motivo}. ${nota.trim()}`} />
        <div className="mt-5 flex flex-wrap justify-end gap-2.5 max-[767px]:flex-col-reverse max-[767px]:items-stretch">
          <button className={botonClases('default')} onClick={cerrar} type="button">
            Cancelar
          </button>
          <button className={botonClases('peligro')} disabled={pendiente || nota.trim() === ''} name="decision" onClick={() => setTimeout(cerrar)} type="submit" value="rejected">
            Rechazar y avisarle
          </button>
        </div>
      </dialog>
    </form>
  )
}
