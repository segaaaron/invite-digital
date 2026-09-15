'use client'

import Link from 'next/link'
import { useActionState, useId } from 'react'
import { placeOrderAction, type PlaceOrderState } from '@/app/_acciones/orders/actions'

const INICIAL: PlaceOrderState = { status: 'idle' }

const CAMPO =
  'w-full rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'
const ROTULO = 'font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase'

/**
 * El alta de pedido de la web pública. Es dorado y no tinta: esto lo ve un cliente, no el
 * atelier, y la piel del panel se queda en el panel.
 */
export function OrderForm({
  planSlug,
  planName,
  priceLabel,
  templateSlug = null,
  templateName = null,
}: {
  planSlug: string
  planName: string
  priceLabel: string
  /** El diseño que eligió en el escaparate, ya validado contra el registro de temas. */
  templateSlug?: string | null
  templateName?: string | null
}) {
  const [estado, accion, pendiente] = useActionState<PlaceOrderState, FormData>(placeOrderAction, INICIAL)
  const id = useId()

  if (estado.status === 'success') {
    return (
      <div className="flex flex-col gap-4 rounded-[18px] border border-gold/50 bg-gold/10 p-6" role="status">
        <p className="font-display text-[24px] font-light text-ink">Pedido registrado</p>
        <p className="text-[14px] text-ink-soft">
          Tu referencia es <strong className="font-mono tracking-[0.2em]">{estado.publicRef}</strong>. Guárdala: con
          ella subes el comprobante y sigues el estado de tu pedido.
        </p>
        <Link
          className="w-fit rounded-[var(--radius-pill)] border border-gold bg-gold/20 px-5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase"
          href={`/es/pedido/ref/${estado.publicRef}`}
        >
          Ir a pagar
        </Link>
      </div>
    )
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input name="planSlug" type="hidden" value={planSlug} />
      {/* El diseño viaja con el pedido. Sin esto, quien aprueba no sabe cuál de los
          dieciséis miró el cliente, y el modelo se pasaba de boca a boca. */}
      {templateSlug === null ? null : <input name="templateSlug" type="hidden" value={templateSlug} />}

      <p className="text-[14px] text-ink-soft">
        Plan <strong className="font-normal text-ink">{planName}</strong> · {priceLabel}
      </p>

      {templateName === null ? null : (
        <p className="text-[14px] text-ink-soft">
          Diseño <strong className="font-normal text-ink">{templateName}</strong>
        </p>
      )}

      {estado.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {estado.message}
        </p>
      ) : null}

      <label className="flex flex-col gap-2" htmlFor={`${id}-nombre`}>
        <span className={ROTULO}>Tu nombre</span>
        <input className={CAMPO} id={`${id}-nombre`} maxLength={160} name="customerName" required type="text" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-contacto`}>
        <span className={ROTULO}>WhatsApp o correo</span>
        <input className={CAMPO} id={`${id}-contacto`} maxLength={160} name="contact" required type="text" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-fecha`}>
        <span className={ROTULO}>Fecha del evento (si ya la tienes)</span>
        <input className={CAMPO} id={`${id}-fecha`} name="eventDate" type="date" />
      </label>

      <label className="flex flex-col gap-2" htmlFor={`${id}-notas`}>
        <span className={ROTULO}>Cuéntanos lo que tienes en mente</span>
        <textarea className={`${CAMPO} min-h-[110px]`} id={`${id}-notas`} maxLength={1000} name="notes" />
      </label>

      <button
        className="w-fit cursor-pointer rounded-[var(--radius-pill)] border border-gold bg-gold/20 px-6 py-3 font-mono text-[10px] tracking-[0.25em] text-ink uppercase disabled:opacity-50"
        disabled={pendiente}
        type="submit" aria-busy={(pendiente) || undefined}>
        {pendiente ? 'Registrando…' : 'Registrar pedido'}
      </button>
    </form>
  )
}
