import { notFound } from 'next/navigation'
import { admin, asistente, diseno, events, orders, plans } from '@/app/composition/container'
import { isPayable } from '@/modules/admin/domain/payment-settings'
import { ProofUpload } from '@/modules/orders/ui/ProofUpload'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { tieneLuxury } from '@/modules/asistente'
import { requireSession } from '@/app/_acciones/sesion'
import { extraDisponible, NOMBRE_DE_EFECTO } from '@/modules/plans/domain/extras'
import { ExtrasCard } from '@/modules/plans/ui/ExtrasCard'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'
import type { T } from '@/shared/i18n/t'
import { traducir } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Extras', 'Extras') }
}
export const dynamic = 'force-dynamic'

const estadoDe = (t: T) =>
  ({
    pending_payment: { estado: t('Esperando pago', 'Awaiting payment'), tono: 'pending' },
    proof_submitted: { estado: t('Comprobante en revisión', 'Receipt under review'), tono: 'maybe' },
    approved: { estado: t('Activo', 'Active'), tono: 'ok' },
    rejected: { estado: t('Rechazado', 'Rejected'), tono: 'no' },
    cancelled: { estado: t('Cancelado', 'Cancelled'), tono: 'no' },
  }) as const

export default async function ExtrasPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ pedido?: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const { pedido: refAbierta } = await searchParams
  // Sección `equipo`: el anfitrión compra; su equipo no compra por él.
  const event = await events.getFor(actor, slug, { section: 'equipo' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Solo se ofrece lo que este evento puede comprar: ni lo que su plan ya trae, ni el Día D a un
  // plan sin el planner completo. La acción vuelve a comprobarlo. Sin capacidad, no se ofrece nada.
  const [capacidad, configDeLuxury, encargo] = await Promise.all([plans.allowanceFor(event.value.id), asistente.config(), diseno.leer(event.value.id)])
  // Luxury cuenta como incluido si su plan lo trae (Admin › Asistente), y no se ofrece sin modelo configurado.
  const conLuxury = isErr(capacidad) ? null : { ...capacidad.value, asistente: tieneLuxury(capacidad.value, configDeLuxury) }
  const extras =
    conLuxury === null
      ? []
      : (await plans.listActiveExtras())
          .filter((x) => (x.effect !== 'asistente' || asistente.disponible) && extraDisponible(conLuxury, x.effect, { encargo: encargo !== null }).ok)
        .map((x) => ({ slug: x.slug, name: x.name, precio: formatAmount(x.priceCents, x.currency).replace(/,00$/, ''), que: traducir(NOMBRE_DE_EFECTO[x.effect], t) }))
  // Solo los de este evento: antes se leía la bandeja entera del negocio, con comprobantes, y
  // se filtraba aquí. Si la lectura falla, la lista sale vacía como antes.
  const pedidos = (await orders.extrasDe(event.value.id).catch(() => [])).map((order) => ({
    ref: order.publicRef,
    name: order.addonName ?? order.addonSlug ?? 'Extra',
    ...estadoDe(t)[order.status],
    monto: order.amountCents === null ? '' : formatAmount(order.amountCents, order.currency ?? DEFAULT_CURRENCY).replace(/,00$/, ''),
    porPagar: order.status === 'pending_payment',
    que: (order.addonSlug === null ? undefined : extras.find((x) => x.slug === order.addonSlug)?.que) ?? '',
  }))
  // «Pedir el extra» (E71): el pedido recién hecho, con la transferencia y la subida del comprobante.
  const abierto = refAbierta === undefined ? undefined : pedidos.find((p) => p.ref === refAbierta && p.porPagar)
  const cobro = abierto === undefined ? null : await admin.payment()
  const pago = cobro === null || isErr(cobro) || !isPayable(cobro.value) ? null : cobro.value
  const base = `/panel/eventos/${event.value.slug}/extras`

  return (
    <>
      <PanelHeader meta={t('Suma lo que te falte. Se activa cuando confirmamos tu pago.', 'Add whatever you’re missing. It activates once we confirm your payment.')} title={t('Extras', 'Extras')} />
      <ExtrasCard eventId={event.value.id} eventSlug={event.value.slug} extras={extras} pedidos={pedidos} sinPedido={actor.soporte?.eventoSinCliente === event.value.id} />
      {abierto === undefined ? null : (
        <PanelDialog closeHref={base} descripcion={t('Transfiere y sube el comprobante. Lo activamos el mismo día.', 'Transfer and upload the receipt. We activate it the same day.')} title={t(`Pedir ${abierto.name}`, `Request ${abierto.name}`)} width={560}>
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4 rounded-[14px] border border-line-panel bg-bg-raised p-4.5">
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-medium">{abierto.name}</span>
                {abierto.que === '' ? null : <span className="text-[13.5px] text-ink-mute">{abierto.que}</span>}
              </span>
              <span className="font-display text-[30px] leading-none font-medium [font-variant-numeric:lining-nums]">{abierto.monto}</span>
            </div>
            {pago === null ? (
              <p className="text-[14.5px] text-ink-mute">{t('Los datos de la transferencia aún no están cargados. Escríbenos por WhatsApp y te los pasamos.', 'The transfer details aren’t loaded yet. Message us on WhatsApp and we’ll send them.')}</p>
            ) : (
              <div className="flex items-center gap-5">
                {pago.hasQrImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={t('QR de cobro', 'Payment QR')} className="size-30 shrink-0 rounded-[14px] border border-line-panel bg-bg-raised object-contain p-2" src="/qr-de-cobro" />
                ) : null}
                <dl className="m-0 flex flex-col gap-1 text-[15px]">
                  <dd className="m-0">{pago.bank}</dd>
                  <dd className="m-0">{pago.accountHolder}</dd>
                  <dd className="m-0">{t('Cuenta', 'Account')} {pago.accountNumber}</dd>
                  <dd className="m-0 text-ink-mute">{t('Glosa', 'Reference')}: {abierto.ref}</dd>
                </dl>
              </div>
            )}
            <ProofUpload panel={{ despuesHref: base }} publicRef={abierto.ref} textos={getDictionary(t('es', 'en') === 'es' ? 'es' : 'en').orders.form} />
          </div>
        </PanelDialog>
      )}
    </>
  )
}
