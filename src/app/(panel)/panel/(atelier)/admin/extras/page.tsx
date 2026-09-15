import { plans } from '@/app/composition/container'
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
  const extras = await plans.listAllExtras()
  return (
    <>
      <PanelHeader kicker="Administración" meta={`${extras.filter((x) => x.isActive).length} de ${extras.length} a la venta`} title="Extras" />
      <PanelCard title="Catálogo de extras">
        {extras.map((x) => (
          <ExtraEditor extra={{ slug: x.slug, name: x.name, precio: aCampo(x.priceCents), effect: x.effect, amount: x.amount, isActive: x.isActive }} key={x.slug} />
        ))}
      </PanelCard>
    </>
  )
}
