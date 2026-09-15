import { notFound } from 'next/navigation'
import { events, planner, plans } from '@/app/composition/container'
import { fiestaDeTema } from '@/modules/events'
import { requireSession } from '@/app/_acciones/sesion'
import { buildWhatsAppLink } from '@/modules/leads'
import { categoriasDe, cuentasDePartida } from '@/modules/planner'
import { NewVendorForm, VendorsBoard } from '@/modules/planner/ui/VendorsBoard'
import { FeatureLocked } from '@/modules/plans'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Proveedores' }
export const dynamic = 'force-dynamic'

const campo = (cents: number) => `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

export default async function ProveedoresPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ panel?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) {
    return <FeatureLocked eventSlug={event.value.slug} reason="Los proveedores, el cronograma y el cortejo vienen con Firma 3D y Alta Costura." title="Proveedores" />
  }

  const fiesta = fiestaDeTema(event.value.themeKey)
  const partidas = await planner.listBudget(event.value.id)
  const bs = (c: number) => formatAmount(c, DEFAULT_CURRENCY)
  const proveedores = (await planner.dia.listVendors(event.value.id)).map((p) => {
    const partida = p.budgetItemId === null ? null : (partidas.find((x) => x.id === p.budgetItemId) ?? null)
    const c = partida === null ? null : cuentasDePartida(partida)
    const precio = partida === null ? null : (partida.contractedCents ?? partida.estimatedCents)
    return {
      ...p,
      whatsappHref: p.whatsapp ? buildWhatsAppLink(p.whatsapp, `Hola${p.contactName ? ` ${p.contactName}` : ''}, te escribo por ${event.value.title}.`) : null,
      dinero: c === null || precio === null ? null : { precio: bs(precio), pagado: bs(c.pagado), falta: bs(c.falta), campoPrecio: campo(precio) },
    }
  })
  const enlacesIncluidos = !isErr(await plans.requireFeature(event.value.id, 'plannerTotal'))
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }
  const base = `/panel/eventos/${event.value.slug}/planner`

  return (
    <>
      <PanelHeader
        actions={
          <>
            <PanelButton href={`${base}/presupuesto`}>Pagos en el presupuesto</PanelButton>
            <PanelButton href={`${base}/proveedores?panel=proveedor`} variant="primary">
              Sumar proveedor
            </PanelButton>
          </>
        }
        kicker="Planner"
        meta={`${proveedores.length} proveedor${proveedores.length === 1 ? '' : 'es'} · ${proveedores.filter((p) => p.status === 'confirmado').length} confirmados`}
        title="Proveedores"
      />
      <div className="flex flex-col gap-4.5">
        {panel === 'proveedor' ? (
          <PanelCard title="Proveedor nuevo">
            <NewVendorForm categorias={categoriasDe(fiesta)} evento={evento} />
          </PanelCard>
        ) : null}
        <VendorsBoard categorias={categoriasDe(fiesta)} enlacesIncluidos={enlacesIncluidos} evento={evento} proveedores={proveedores} />
      </div>
    </>
  )
}
