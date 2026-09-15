import { notFound } from 'next/navigation'
import { events, orders, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { extraDisponible, NOMBRE_DE_EFECTO } from '@/modules/plans/domain/extras'
import { ExtrasCard } from '@/modules/plans/ui/ExtrasCard'
import { formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Extras' }
export const dynamic = 'force-dynamic'

const ESTADO = {
  pending_payment: { estado: 'Esperando pago', tono: 'pending' },
  proof_submitted: { estado: 'Comprobante en revisión', tono: 'maybe' },
  approved: { estado: 'Activo', tono: 'ok' },
  rejected: { estado: 'Rechazado', tono: 'no' },
} as const

export default async function ExtrasPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  // Sección `equipo`: el anfitrión compra; su equipo no compra por él.
  const event = await events.getFor(actor, slug, { section: 'equipo' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Solo se ofrece lo que este evento puede comprar: ni lo que su plan ya trae, ni el Día D a un
  // plan sin el planner completo. La acción vuelve a comprobarlo. Sin capacidad, no se ofrece nada.
  const capacidad = await plans.allowanceFor(event.value.id)
  const extras = isErr(capacidad)
    ? []
    : (await plans.listActiveExtras())
        .filter((x) => extraDisponible(capacidad.value, x.effect).ok)
        .map((x) => ({ slug: x.slug, name: x.name, precio: formatAmount(x.priceCents, x.currency), que: NOMBRE_DE_EFECTO[x.effect] }))
  // Solo los de este evento: antes se leía la bandeja entera del negocio, con comprobantes, y
  // se filtraba aquí. Si la lectura falla, la lista sale vacía como antes.
  const pedidos = (await orders.extrasDe(event.value.id).catch(() => [])).map((order) => ({
    ref: order.publicRef,
    name: order.addonName ?? order.addonSlug ?? 'Extra',
    ...ESTADO[order.status],
  }))

  return (
    <>
      <PanelHeader kicker="Tu evento" meta={`${extras.length} extra${extras.length === 1 ? '' : 's'} a la venta`} title="Extras" />
      <PanelCard title="Lo que puedes sumar">
        <ExtrasCard eventId={event.value.id} eventSlug={event.value.slug} extras={extras} pedidos={pedidos} />
      </PanelCard>
    </>
  )
}
