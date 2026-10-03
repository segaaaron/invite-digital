import { notFound } from 'next/navigation'
import { events, guestbook, plans } from '@/app/composition/container'
import { FeatureLocked } from '@/modules/plans'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { LibroDeFirmas } from '@/modules/guestbook/ui/LibroDeFirmas'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { isErr } from '@/shared/result'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'

export const metadata = { title: 'Mensajes' }

// Los invitados escriben mientras el atelier mira la bandeja: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function MensajesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ filtro?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { filtro } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const libro = await guestbook.list(event.value.id)
  if (isErr(libro)) throw new Error(libro.error.detail)

  const total = libro.value.length
  // Sin libro de firmas en el plan, la pantalla lo dice; quien ya tiene mensajes los sigue viendo.
  const conLibro = await plans.requireFeature(event.value.id, 'guestbook')
  if (isErr(conLibro) && total === 0) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason={conLibro.error.detail} title="Mensajes" />
  }
  const sinAgradecer = libro.value.filter((m) => m.reply === null).length
  const soloSinAgradecer = filtro === 'sin-agradecer'
  const base = `/panel/eventos/${event.value.slug}/mensajes`

  return (
    <>
      <PanelHeader
        actions={
          total === 0 ? undefined : (
            // El informe del evento trae el libro entero, listo para guardar como PDF.
            <PanelButton href={`/panel/eventos/${event.value.slug}/informe#libro`}>Descargar el libro</PanelButton>
          )
        }
        kicker="Libro de firmas"
        meta={total === 0 ? 'Las palabras que te dejan tus invitados al confirmar' : `${total} ${total === 1 ? 'firma' : 'firmas'} · ${sinAgradecer === 0 ? 'todas agradecidas' : `${sinAgradecer} sin agradecer`}`}
        title="Mensajes"
      />
      <EnVivo modo="aviso" tipos={['rsvp']} url={`/panel/eventos/${event.value.slug}/en-vivo`} />

      {total === 0 ? null : (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[60ch] text-[13.5px] leading-relaxed text-ink-soft">
            Lo que tus invitados te escriben al confirmar. Si les agradeces, lo ven al volver a abrir su invitación.
          </p>
          <nav aria-label="Filtrar firmas" className="flex gap-2">
            <FilterChipLink active={!soloSinAgradecer} href={base}>
              Todas · {total}
            </FilterChipLink>
            <FilterChipLink active={soloSinAgradecer} href={`${base}?filtro=sin-agradecer`}>
              Sin agradecer · {sinAgradecer}
            </FilterChipLink>
          </nav>
        </div>
      )}

      <LibroDeFirmas
        eventId={event.value.id}
        eventSlug={event.value.slug}
        messages={soloSinAgradecer ? libro.value.filter((m) => m.reply === null) : libro.value}
        vacioFiltrado={soloSinAgradecer && total > 0}
      />
    </>
  )
}
