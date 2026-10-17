import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { events, planner, plans } from '@/app/composition/container'
import { fiestaDeTema } from '@/modules/events'
import { requireSession } from '@/app/_acciones/sesion'
import { buildWhatsAppLink } from '@/modules/leads'
import { categoriasDe, cuentasDePartida } from '@/modules/planner'
import { EditarProveedor, NewVendorForm, VendorsBoard } from '@/modules/planner/ui/VendorsBoard'
import { FeatureLocked } from '@/modules/plans'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { AccionDeLaIsla } from '@/shared/design/ui/panel/AccionDeLaIsla'
import { PlusIcon } from '@/shared/design/ui/icons'
import Link from 'next/link'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Proveedores', 'Vendors') }
}
export const dynamic = 'force-dynamic'

const campo = (cents: number) => `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

export default async function ProveedoresPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ panel?: string; proveedor?: string; filtro?: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const { panel, proveedor: editando, filtro } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason="Los proveedores, el cronograma y el cortejo vienen con Gala e Imperial." title={t('Proveedores', 'Vendors')} />
  }

  const fiesta = fiestaDeTema(event.value.themeKey)
  const partidas = await planner.listBudget(event.value.id)
  const bs = (c: number) => formatAmount(c, DEFAULT_CURRENCY).replace(/,00$/, '')
  const proveedores = (await planner.dia.listVendors(event.value.id)).map((p) => {
    const partida = p.budgetItemId === null ? null : (partidas.find((x) => x.id === p.budgetItemId) ?? null)
    const c = partida === null ? null : cuentasDePartida(partida)
    const precio = partida === null ? null : (partida.contractedCents ?? partida.estimatedCents)
    return {
      ...p,
      whatsappHref: p.whatsapp ? buildWhatsAppLink(p.whatsapp, t(`Hola${p.contactName ? ` ${p.contactName}` : ''}, te escribo por ${event.value.title}.`, `Hi${p.contactName ? ` ${p.contactName}` : ''}, I’m writing about ${event.value.title}.`)) : null,
      dinero: c === null || precio === null ? null : { precio: bs(precio), pagado: bs(c.pagado), falta: bs(c.falta), campoPrecio: campo(precio) },
    }
  })
  const enlacesIncluidos = !isErr(await plans.requireFeature(event.value.id, 'plannerTotal'))
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }
  const base = `/panel/eventos/${event.value.slug}/planner`

  const lista = `${base}/proveedores`
  const contratados = proveedores.filter((p) => p.status !== 'cotizando')
  const cotizando = proveedores.filter((p) => p.status === 'cotizando')
  const visibles = filtro === 'contratados' ? contratados : filtro === 'cotizando' ? cotizando : proveedores
  const chips = [
    { clave: undefined, texto: t('Todos', 'All'), cuenta: proveedores.length },
    { clave: 'contratados', texto: t('Contratados', 'Hired'), cuenta: contratados.length },
    { clave: 'cotizando', texto: t('Cotizando', 'Quoting'), cuenta: cotizando.length },
  ]
  const conFiltro = (extra: string) => `${lista}?${filtro ? `filtro=${filtro}&` : ''}${extra}`
  const enEdicion = editando === undefined ? undefined : proveedores.find((p) => p.id === editando)
  const cerrar = filtro ? `${lista}?filtro=${filtro}` : lista
  const dia = new Intl.DateTimeFormat(t('es-BO', 'en-US'), { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${event.value.eventDate}T00:00:00Z`))

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={conFiltro('panel=proveedor')} variant="primary">
            <PlusIcon className="size-4" /> {t('Añadir proveedor', 'Add vendor')}
          </PanelButton>
        }
        meta={t(`Quién trae qué el ${dia}. El dinero de cada uno va a su partida del presupuesto.`, `Who brings what on ${dia}. Each one’s money goes to its budget line.`)}
        title={t('Proveedores', 'Vendors')}
      />
      <AccionDeLaIsla>
        <Link aria-label={t('Añadir proveedor', 'Add vendor')} className="flex min-h-11 items-center gap-1 rounded-full border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink no-underline" href={conFiltro('panel=proveedor')}>
          <PlusIcon className="size-4.5" />
          {t('Añadir', 'Add')}
        </Link>
      </AccionDeLaIsla>

      {panel === 'proveedor' ? (
        <PanelDialog closeHref={cerrar} kicker={t('Proveedores', 'Vendors')} lado="derecha" title={t('Añadir proveedor', 'Add vendor')} width={520}>
          <NewVendorForm categorias={categoriasDe(fiesta)} evento={evento} />
        </PanelDialog>
      ) : null}
      {enEdicion === undefined ? null : (
        <PanelDialog closeHref={cerrar} kicker={t('Proveedores', 'Vendors')} lado="derecha" title={enEdicion.company ?? enEdicion.service} width={520}>
          <EditarProveedor categorias={categoriasDe(fiesta)} evento={evento} proveedor={enEdicion} />
        </PanelDialog>
      )}

      {proveedores.length === 0 ? null : (
        <nav aria-label={t('Filtrar proveedores', 'Filter vendors')} className="mb-6 flex flex-wrap gap-2.5">
          {chips.map((c) => (
            <FilterChipLink active={c.clave === filtro || (c.clave === undefined && filtro !== 'contratados' && filtro !== 'cotizando')} href={c.clave ? `${lista}?filtro=${c.clave}` : lista} key={c.texto}>
              {c.texto}
              <span aria-hidden className="ml-1">
                {c.cuenta}
              </span>
            </FilterChipLink>
          ))}
        </nav>
      )}
      <VendorsBoard editarHref={conFiltro("proveedor=")} enlacesIncluidos={enlacesIncluidos} evento={evento} nuevoHref={conFiltro('panel=proveedor')} proveedores={visibles} />
    </>
  )
}
