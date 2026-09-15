import { notFound } from 'next/navigation'
import { events, orders, plans } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { NOMBRE_DE_EFECTO } from '@/modules/plans/domain/extras'
import { ExtrasCard } from '@/modules/plans/ui/ExtrasCard'
import { formatAmount } from '@/modules/registry'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
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

  const extras = (await plans.listActiveExtras()).map((x) => ({ slug: x.slug, name: x.name, precio: formatAmount(x.priceCents, x.currency), que: NOMBRE_DE_EFECTO[x.effect] }))
  const todos = await orders.list()
  const pedidos = isErr(todos)
    ? []
    : todos.value
        .filter(({ order }) => order.eventId === event.value.id && order.addonSlug !== null)
        .map(({ order }) => ({ ref: order.publicRef, name: order.addonName ?? order.addonSlug ?? 'Extra', ...ESTADO[order.status] }))

  return (
    <>
      <PanelHeader kicker="Tu evento" meta={`${extras.length} extra${extras.length === 1 ? '' : 's'} a la venta`} title="Extras" />
      <PanelCard title="Lo que puedes sumar">
        <ExtrasCard eventId={event.value.id} eventSlug={event.value.slug} extras={extras} pedidos={pedidos} />
      </PanelCard>
    </>
  )
}
