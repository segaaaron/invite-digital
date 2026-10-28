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
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Mensajes', 'Messages') }
}

// Los invitados escriben mientras el atelier mira la bandeja: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function MensajesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ filtro?: string }> }) {
  const t = await tr()
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
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason={traducir(conLibro.error.detail, t)} title={t('Mensajes', 'Messages')} />
  }
  const sinAgradecer = libro.value.filter((m) => m.reply === null).length
  const soloSinAgradecer = filtro === 'sin-agradecer'
  const base = `/dashboard/events/${event.value.slug}/messages`

  return (
    <>
      <PanelHeader
        actions={
          total === 0 ? undefined : (
            // El informe del evento trae el libro entero, listo para guardar como PDF.
            <span>
              <PanelButton href={`/dashboard/events/${event.value.slug}/report#libro`}>{t('Descargar el libro', 'Download the book')}</PanelButton>
            </span>
          )
        }
        meta={total === 0 ? t('Lo que tus invitados te escriben al confirmar.', 'What your guests write to you when they RSVP.') : t(`${total} ${total === 1 ? 'firma' : 'firmas'}. Lo que tus invitados te escriben al confirmar.`, `${total} ${total === 1 ? 'entry' : 'entries'}. What your guests write to you when they RSVP.`)}
        title={t('Libro de firmas', 'Guestbook')}
      />
      <EnVivo modo="aviso" tipos={['rsvp']} url={`/dashboard/events/${event.value.slug}/live`} />

      {total === 0 || sinAgradecer === 0 ? null : (
        <nav aria-label={t('Filtrar firmas', 'Filter entries')} className="mb-6 flex gap-2.5">
          <FilterChipLink active={!soloSinAgradecer} href={base}>
            {t('Todas', 'All')} · {total}
          </FilterChipLink>
          <FilterChipLink active={soloSinAgradecer} href={`${base}?filtro=sin-agradecer`}>
            {t('Sin agradecer', 'Not thanked')} · {sinAgradecer}
          </FilterChipLink>
        </nav>
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
