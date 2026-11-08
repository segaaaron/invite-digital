import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { topeDeAlbum } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { CameraIcon, DownloadIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { fecha } from '@/shared/format/fecha'
import { tr } from '@/shared/i18n/idioma-servidor'
import { isErr } from '@/shared/result'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Álbum compartido', 'Shared album') }
}

// Los invitados suben mientras la pareja mira: esta página no se cachea.
export const dynamic = 'force-dynamic'

/**
 * **El álbum compartido** (documento del 6 nov): las fotos que suben los invitados con el QR, cuántas caben, y
 * la descarga de todas en un ZIP antes de que se borren con la invitación.
 *
 * Sin álbum en el plan, la pantalla explica qué es y lleva a Extras (Atelier y Gala lo suman por Bs 150): una
 * función que se vende tiene que poder alcanzarse desde el panel.
 */
export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  const e = event.value
  const base = `/dashboard/events/${e.slug}`

  const capacidad = await plans.allowanceFor(e.id)
  if (isErr(capacidad)) throw new Error(capacidad.error.detail)
  const tope = topeDeAlbum(capacidad.value)

  if (tope === 0) {
    return (
      <>
        <PanelHeader title={t('Álbum compartido', 'Shared album')} />
        <EmptyState
          action={<PanelButton href={`${base}/extras`}>{t('Ver Extras', 'See Extras')}</PanelButton>}
          description={t(
            'Tus invitados suben sus fotos de la fiesta escaneando un QR, sin descargar aplicaciones. Tu plan no lo incluye, pero puedes sumarlo desde Extras.',
            'Your guests upload their party photos by scanning a QR code, no app needed. Your plan doesn’t include it, but you can add it from Extras.',
          )}
          icon={<CameraIcon />}
          title={t('El álbum no está en tu plan', 'The album isn’t in your plan')}
        />
      </>
    )
  }

  const fotos = (await events.media.list(e.id))
    .filter((fila) => fila.uploadedByGroupId !== null && fila.contentType.startsWith('image/'))
    .sort((a, b) => a.id.localeCompare(b.id))
  const lleno = fotos.length >= tope
  // Las fotos viven lo mismo que la invitación: hasta la fecha del evento más los días en línea del plan.
  const hasta = new Date(`${e.eventDate}T12:00:00Z`)
  hasta.setUTCDate(hasta.getUTCDate() + e.retentionDays)

  return (
    <>
      <PanelHeader
        actions={
          fotos.length === 0 ? undefined : (
            <PanelButton href={`${base}/album/download`}>
              <DownloadIcon /> {t('Descargar todas (ZIP)', 'Download all (ZIP)')}
            </PanelButton>
          )
        }
        meta={t(
          `${fotos.length} de ${tope} fotos. Cada invitado puede subir hasta 20.`,
          `${fotos.length} of ${tope} photos. Each guest can upload up to 20.`,
        )}
        title={t('Álbum compartido', 'Shared album')}
      />

      <PanelCard>
        <p className="m-0 text-[14.5px] leading-[1.7] text-ink-soft">
          {t(
            `El álbum queda en línea lo mismo que tu invitación: hasta el ${fecha(hasta, 'es')}. Después las fotos se borran, así que descarga el ZIP antes de esa fecha.`,
            `The album stays online as long as your invitation: until ${fecha(hasta, 'en')}. After that the photos are deleted, so download the ZIP before then.`,
          )}
        </p>
        {lleno ? (
          <p className="mt-3 text-[14.5px] leading-[1.7] text-ink" role="status">
            {t('El álbum está lleno: tus invitados ya no pueden subir más. Puedes sumar 500 fotos más desde ', 'The album is full: your guests can’t upload any more. You can add 500 more photos from ')}
            <Link className="text-gold-deep underline underline-offset-4" href={`${base}/extras`}>
              {t('Extras', 'Extras')}
            </Link>
            .
          </p>
        ) : null}
      </PanelCard>

      {fotos.length === 0 ? (
        <EmptyState
          description={t('Cuando tus invitados suban fotos desde su invitación, aparecen aquí.', 'When your guests upload photos from their invitation, they show up here.')}
          icon={<CameraIcon />}
          title={t('Todavía no hay fotos', 'No photos yet')}
        />
      ) : (
        <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 min-[640px]:grid-cols-5 min-[1024px]:grid-cols-7">
          {fotos.map((foto) => (
            <li className="aspect-square overflow-hidden rounded-[12px] bg-bg-sunken" key={foto.id}>
              {/* `/media/[id]` ya sirve la versión reducida: pasarla por el optimizador sería recortarla dos veces. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="size-full object-cover" decoding="async" loading="lazy" src={`/media/${foto.id}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
