import { orders, plans } from '@/app/composition/container'
import { isErr } from '@/shared/result'
import { CabeceraDeExtras, ExtraEditor } from '@/modules/admin/ui/ExtraEditor'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PestanasDeAdmin } from '@/modules/admin'

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
      <PanelHeader title="Catálogo" meta="Lo que el cliente compra después, desde su panel. Apagado no aparece en ningún sitio." pestanas={<PestanasDeAdmin />} />
      {/* La tabla de la maqueta (E49): cada extra en su fila, y «Editar» la despliega. */}
      <div className="overflow-hidden rounded-[16px] border border-line-panel bg-bg-raised">
        <CabeceraDeExtras />
        {extras.map((x) => (
          <ExtraEditor extra={{ slug: x.slug, name: x.name, precio: aCampo(x.priceCents), effect: x.effect, amount: x.amount, isActive: x.isActive }} key={x.slug} vendidos={vendidos.get(x.slug) ?? 0} />
        ))}
      </div>
      <p className="mt-4 text-[14px] text-ink-mute">Lo vendido queda congelado: editar un extra no cambia lo que un evento ya compró.</p>
    </>
  )
}
