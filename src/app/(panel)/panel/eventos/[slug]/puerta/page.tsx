import { notFound } from 'next/navigation'
import { checkin, events, plans } from '@/app/composition/container'
import { DoorMode } from '@/modules/checkin/ui/DoorMode'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { isErr } from '@/shared/result'

// El modo puerta se instala en la pantalla de inicio: es como lo va a usar el personal.
export const metadata = {
  title: 'Modo puerta',
  manifest: '/manifest.webmanifest',
}

// El manifiesto cambia con cada llegada y con cada grupo nuevo: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function DoorPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const permitido = await plans.requireFeature(event.value.id, 'checkin')
  if (isErr(permitido)) {
    return <FeatureLocked eventSlug={event.value.slug} reason={permitido.error.detail} title="Modo puerta" />
  }

  const manifest = await checkin.manifest(event.value.id)
  if (isErr(manifest)) throw new Error(manifest.error.detail)

  return <DoorMode eventId={event.value.id} eventSlug={event.value.slug} manifest={manifest.value} />
}
