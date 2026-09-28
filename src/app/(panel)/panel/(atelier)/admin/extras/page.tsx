import { orders, plans } from '@/app/composition/container'
import { isErr } from '@/shared/result'
import { ExtraEditor } from '@/modules/admin/ui/ExtraEditor'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'

export const metadata = { title: 'Extras · Administración' }
export const dynamic = 'force-dynamic'

const aCampo = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`)

/**
 * Los extras sueltos que compra un evento sin cambiar de plan. Nacen apagados con el precio
 * propuesto: ponerlos a la venta es una decisión de aquí. Lo vendido no cambia al editarlos.
 */
export default async function AdminExtrasPage() {
  await requireAdmin()
  const [extras, aprobados] = await Promise.all([plans.listAllExtras(), orders.page({ status: 'approved', tope: 5000, prioridad: ['approved'] })])
  const vendidos = new Map<string, number>()
  if (!isErr(aprobados)) for (const { order: o } of aprobados.value.pedidos) if (o.addonSlug !== null) vendidos.set(o.addonSlug, (vendidos.get(o.addonSlug) ?? 0) + 1)
  return (
    <>
      <PanelHeader kicker="Escaparate" meta={`${extras.filter((x) => x.isActive).length} de ${extras.length} a la venta`} title="Extras" />
      <PanelCard title="Catálogo de extras">
        <p className="mb-5 max-w-[70ch] text-[13px] leading-[1.6] text-ink-mute">
          Lo que un evento compra suelto sin cambiar de plan. Se paga como un pedido y, al aprobarlo, se aplica a ese evento. Cambiar el
          precio no toca lo que ya se vendió, y lo que hace cada extra queda fijo.
        </p>
        <div className="flex flex-col">
          {extras.map((x) => (
            <ExtraEditor extra={{ slug: x.slug, name: x.name, precio: aCampo(x.priceCents), effect: x.effect, amount: x.amount, isActive: x.isActive }} key={x.slug} vendidos={vendidos.get(x.slug) ?? 0} />
          ))}
        </div>
      </PanelCard>
    </>
  )
}
