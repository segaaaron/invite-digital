'use client'

import { useActionState } from 'react'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { type ExtraActionState, orderExtraAction } from '@/app/_acciones/plans/extra-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: ExtraActionState = { status: 'idle' }

export type ExtraVista = { readonly slug: string; readonly name: string; readonly precio: string; readonly que: string }
export type PedidoDeExtraVista = { readonly ref: string; readonly name: string; readonly estado: string; readonly tono: 'ok' | 'no' | 'pending' | 'maybe' }

function Pedir({ eventId, eventSlug, extra, sinPedido }: { eventId: string; eventSlug: string; extra: ExtraVista; sinPedido: boolean }) {
  const [estado, pedir, pidiendo] = useActionState(sinCaerse(orderExtraAction), INICIAL)
  return (
    <form action={pedir} className="flex flex-col items-end gap-1">
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="addonSlug" readOnly type="hidden" value={extra.slug} />
      <SubmitButton aria-label={`${sinPedido ? 'Aplicar' : 'Pedir'} ${extra.name}`} variant="primary" pending={pidiendo} pendingLabel={sinPedido ? 'Aplicando…' : 'Creando pedido…'}>
        {sinPedido ? 'Aplicar' : 'Pedir'}
      </SubmitButton>
      <ActionFeedback state={estado} />
    </form>
  )
}

/**
 * Los extras a la venta, con su precio, y los que ya pidió este evento. Con `sinPedido` —el admin en
 * un evento sin cliente— se aplican al momento, sin pedido ni comprobante.
 */
export function ExtrasCard({
  eventId,
  eventSlug,
  extras,
  pedidos,
  sinPedido = false,
}: {
  eventId: string
  eventSlug: string
  extras: readonly ExtraVista[]
  pedidos: readonly PedidoDeExtraVista[]
  sinPedido?: boolean
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-[62ch] text-[13px] leading-[1.7] text-ink-soft">
        {sinPedido
          ? 'Este evento no tiene cliente: lo llevas tú y su cobro va por fuera. El extra se aplica al momento, sin pedido ni comprobante, y queda en la auditoría.'
          : 'Suma solo lo que te falta, sin cambiar de plan. Al pedirlo te damos una referencia para pagar por transferencia; cuando revisamos el comprobante, el extra se activa solo en tu evento.'}
      </p>
      {extras.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Ahora mismo no hay extras a la venta.</p>
      ) : (
        <ul className="flex flex-col">
          {extras.map((x) => (
            <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-3 last:border-none" key={x.slug}>
              <span className="flex min-w-0 flex-col">
                <span className="text-[14px] text-ink">{x.name}</span>
                <span className="text-[11px] text-ink-mute">
                  {x.que} · {x.precio}
                </span>
              </span>
              <Pedir eventId={eventId} eventSlug={eventSlug} extra={x} sinPedido={sinPedido} />
            </li>
          ))}
        </ul>
      )}
      {pedidos.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink-mute uppercase">Tus pedidos de extras</h3>
          <ul className="flex flex-col">
            {pedidos.map((p) => (
              <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-2.5 last:border-none" key={p.ref}>
                <a className="text-[13px] text-ink underline underline-offset-2" href={`/es/pedido/ref/${p.ref}`}>
                  {p.name} · {p.ref}
                </a>
                <Pill tone={p.tono}>{p.estado}</Pill>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
