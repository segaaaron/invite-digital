'use client'

import { useActionState } from 'react'
import { botonClases, Pill } from '@/shared/design/ui/panel/PanelKit'
import { GiftIcon, UploadIcon } from '@/shared/design/ui/icons'
import { type ExtraActionState, orderExtraAction } from '@/app/_acciones/plans/extra-actions'
import { ActionFeedback, EmptyState, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  const t = useT()
  const [estado, pedir, pidiendo] = useActionState(sinCaerse(orderExtraAction), INICIAL)
  return (
    <form action={pedir} className="flex flex-col items-end gap-1">
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="addonSlug" readOnly type="hidden" value={extra.slug} />
      <SubmitButton aria-label={`${sinPedido ? t('Aplicar', 'Apply') : t('Pedir', 'Order')} ${extra.name}`} size="sm" variant="default" pending={pidiendo} pendingLabel={sinPedido ? t('Aplicando…', 'Applying…') : t('Creando pedido…', 'Creating order…')}>
        {sinPedido ? t('Aplicar', 'Apply') : t('Pedir', 'Order')}
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
  const t = useT()
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
          {t('Este evento no tiene cliente: lo llevas tú y su cobro va por fuera. El extra se aplica al momento, sin pedido ni comprobante, y queda en la auditoría.', 'This event has no client: you run it and bill it outside. The extra applies right away, with no order or receipt, and is logged in the audit.')}
        </p>
      ) : null}
      {tarjetas.length === 0 ? (
        // Con su `EmptyState`, como el resto del panel: una línea gris suelta sobre el papel dejaba la
        // pantalla con el título y nada más, y parecía que no había cargado (30 oct).
        <EmptyState
          compact
          description={t('Cuando el atelier publique alguno, aparecerá aquí para pedirlo.', 'When the atelier publishes one, it will show up here to order.')}
          icon={<GiftIcon />}
          title={t('Ahora mismo no hay extras a la venta', 'There are no extras for sale right now')}
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {tarjetas.map((tj) => (
            <li className="flex flex-col gap-2 rounded-[16px] border border-line-panel bg-tarjeta p-5" key={tj.clave}>
              <span className="font-display text-[22px] leading-tight font-medium">{tj.nombre}</span>
              {tj.que && !repite(tj.nombre, tj.que) ? <span className="text-[14px] text-ink-mute">{tj.que}</span> : null}
              <span className="mt-auto flex items-center justify-between gap-3 pt-3">
                <span className="font-display text-[24px] font-medium [font-variant-numeric:lining-nums]">{tj.precio}</span>
                {tj.pedido ? (
                  <Pill tone={tj.pedido.tono === 'ok' ? 'ok' : 'vip'}>{tj.pedido.tono === 'ok' ? t('Ya lo tienes', 'You have it') : tj.pedido.porPagar ? t('Esperando tu pago', 'Awaiting your payment') : tj.pedido.estado}</Pill>
                ) : tj.extra ? (
                  <Pedir eventId={eventId} eventSlug={eventSlug} extra={tj.extra} sinPedido={sinPedido} />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {porPagar.map((p) => (
        <section aria-label={t(`Pedido ${p.ref}`, `Order ${p.ref}`)} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line-panel bg-tarjeta px-6 py-4" key={p.ref}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-medium">
              {t(`Pedido ${p.ref}, ${p.name}`, `Order ${p.ref}, ${p.name}`)}
            </span>
            <span className="text-[14px] text-ink-mute">{t(`Transfiere ${p.monto} y sube el comprobante. Lo revisamos el mismo día.`, `Transfer ${p.monto} and upload the receipt. We review it the same day.`)}</span>
          </span>
          <a className={botonClases('primary')} href={`?pedido=${p.ref}`}>
            <UploadIcon className="size-4" /> {t('Subir comprobante', 'Upload receipt')}
          </a>
        </section>
      ))}
    </div>
  )
}

/** Si la línea de abajo dice lo mismo que el título («Luxury, tu planner con IA» / «Luxury, el planner con IA»): no se repite. */
function repite(nombre: string, que: string): boolean {
  const palabras = (x: string) => new Set(x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9+]+/).filter((w) => w.length > 2))
  const a = palabras(nombre)
  const b = palabras(que)
  if (b.size === 0) return true
  return [...b].filter((w) => a.has(w)).length / b.size >= 0.6
}
