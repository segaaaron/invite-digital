import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { checkin, events, plans } from '@/app/composition/container'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { DoorMode } from '@/modules/checkin/ui/DoorMode'
import { requireSession } from '@/app/_acciones/sesion'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

// El modo puerta se instala en la pantalla de inicio: es como lo va a usar el personal.
export async function generateMetadata() {
  const t = await tr()
  return { title: t('Modo puerta', 'Door mode'), manifest: '/manifest.webmanifest' }
}

// El manifiesto cambia con cada llegada y con cada grupo nuevo: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function DoorPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params

    // Modo puerta: la misma sección que el check-in, y por eso el personal entra.
  const event = await events.getFor(actor, slug, { section: 'checkin' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const permitido = await plans.requireFeature(event.value.id, 'checkin')
  if (isErr(permitido)) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason={traducir(permitido.error.detail, t)} title={t('Modo puerta', 'Door mode')} />
  }

  const manifest = await checkin.manifest(event.value.id)
  if (isErr(manifest)) throw new Error(manifest.error.detail)

  return (
    <>
      {/* Lo que registran las otras puertas entra solo, en vivo. Y `invitado`: si el anfitrión revoca o
          devuelve una invitación, la lista de esta puerta se pone al día sin que nadie recargue. */}
      <EnVivo modo="auto" oculto tipos={['ingreso', 'invitado']} url={`/dashboard/events/${event.value.slug}/live`} />
      <DoorMode eventId={event.value.id} eventSlug={event.value.slug} manifest={manifest.value} />
    </>
  )
}
