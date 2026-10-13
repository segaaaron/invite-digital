'use client'

import { useActionState } from 'react'
import { botonClases, Pill } from '@/shared/design/ui/panel/PanelKit'
import { UploadIcon } from '@/shared/design/ui/icons'
import { type ExtraActionState, orderExtraAction } from '@/app/_acciones/plans/extra-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: ExtraActionState = { status: 'idle' }

export type ExtraVista = { readonly slug: string; readonly name: string; readonly precio: string; readonly que: string }
export type PedidoDeExtraVista = {
  readonly ref: string
  readonly name: string
  readonly estado: string
  readonly tono: 'ok' | 'no' | 'pending' | 'maybe'
  /** «Bs 80»: lo que hay que transferir. */
  readonly monto: string
  readonly porPagar: boolean
}

function Pedir({ eventId, eventSlug, extra, sinPedido }: { eventId: string; eventSlug: string; extra: ExtraVista; sinPedido: boolean }) {
  const [estado, pedir, pidiendo] = useActionState(sinCaerse(orderExtraAction), INICIAL)
  return (
    <form action={pedir} className="flex flex-col items-end gap-1">
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="addonSlug" readOnly type="hidden" value={extra.slug} />
      <SubmitButton aria-label={`${sinPedido ? 'Aplicar' : 'Pedir'} ${extra.name}`} size="sm" variant="default" pending={pidiendo} pendingLabel={sinPedido ? 'Aplicando…' : 'Creando pedido…'}>
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
  // Lo pedido que sigue vivo pinta su estado en su tarjeta; lo activo ya no se vende y se ve como «Ya lo tienes».
  const vivos = pedidos.filter((p) => p.tono !== 'no')
  const tarjetas = [
    ...extras.map((x) => ({ clave: x.slug, nombre: x.name, que: x.que, precio: x.precio, extra: x as ExtraVista | null, pedido: vivos.find((p) => p.name === x.name) ?? null })),
    ...vivos.filter((p) => !extras.some((x) => x.name === p.name)).map((p) => ({ clave: p.ref, nombre: p.name, que: '', precio: p.monto, extra: null, pedido: p as PedidoDeExtraVista | null })),
  ]
  const porPagar = pedidos.filter((p) => p.porPagar)
  return (
    <div className="flex flex-col gap-6">
      {sinPedido ? (
        <p className="max-w-[62ch] text-[14px] leading-[1.7] text-ink-soft">
          Este evento no tiene cliente: lo llevas tú y su cobro va por fuera. El extra se aplica al momento, sin pedido ni comprobante, y queda en la auditoría.
        </p>
      ) : null}
      {tarjetas.length === 0 ? (
        <p className="text-[14px] text-ink-mute">Ahora mismo no hay extras a la venta.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {tarjetas.map((t) => (
            <li className="flex flex-col gap-2 rounded-[16px] border border-line-panel bg-tarjeta p-5" key={t.clave}>
              <span className="font-display text-[22px] leading-tight font-medium">{t.nombre}</span>
              {t.que ? <span className="text-[14px] text-ink-mute">{t.que}</span> : null}
              <span className="mt-auto flex items-center justify-between gap-3 pt-3">
                <span className="font-display text-[24px] font-medium [font-variant-numeric:lining-nums]">{t.precio}</span>
                {t.pedido ? (
                  <Pill tone={t.pedido.tono === 'ok' ? 'ok' : 'vip'}>{t.pedido.tono === 'ok' ? 'Ya lo tienes' : t.pedido.porPagar ? 'Esperando tu pago' : t.pedido.estado}</Pill>
                ) : t.extra ? (
                  <Pedir eventId={eventId} eventSlug={eventSlug} extra={t.extra} sinPedido={sinPedido} />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {porPagar.map((p) => (
        <section aria-label={`Pedido ${p.ref}`} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line-panel bg-tarjeta px-6 py-4" key={p.ref}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-medium">
              Pedido {p.ref}, {p.name}
            </span>
            <span className="text-[14px] text-ink-mute">Transfiere {p.monto} y sube el comprobante. Lo revisamos el mismo día.</span>
          </span>
          <a className={botonClases('primary')} href={`?pedido=${p.ref}`}>
            <UploadIcon className="size-4" /> Subir comprobante
          </a>
        </section>
      ))}
    </div>
  )
}
