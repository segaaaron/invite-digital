import { notFound } from 'next/navigation'
import { checkin, events } from '@/app/composition/container'
import { DoorMode } from '@/modules/checkin/ui/DoorMode'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

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

  const manifest = await checkin.manifest(event.value.id)
  if (isErr(manifest)) throw new Error(manifest.error.detail)

  return <DoorMode eventId={event.value.id} eventSlug={event.value.slug} manifest={manifest.value} />
}
