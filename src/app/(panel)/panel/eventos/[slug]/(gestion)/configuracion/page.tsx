import { notFound } from 'next/navigation'
import { events } from '@/app/composition/container'
import { ClientSharePanel } from '@/modules/events/ui/ClientSharePanel'
import { DangerZone } from '@/modules/events/ui/DangerZone'
import { EventForm } from '@/modules/events/ui/EventForm'
import { PrivacyForm } from '@/modules/events/ui/PrivacyForm'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Configuración' }

export const dynamic = 'force-dynamic'

/**
 * La configuración del evento, vista propia como en la maqueta: los detalles a la
 * izquierda y la vista previa del enlace a la derecha.
 *
 * Estaba metida dentro del resumen y se alcanzaba por un ancla. La maqueta la trata como
 * una pantalla, y quien viene a cambiar la fecha no debería pasar por los contadores.
 */
export default async function ConfiguracionPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const share = await events.liveShare(event.value.id)
  const conContrasena = (await events.passwordHashOf(event.value.id)) !== null

  return (
    <>
      <PanelHeader kicker="Cuenta" meta={event.value.title} title="Configuración del evento" />

      <div className="grid gap-4.5 lg:grid-cols-[1.25fr_1fr]">
        <PanelCard title="Detalles del evento">
          <div className="flex flex-col gap-6">
            <EventForm event={event.value} />
            <PrivacyForm eventId={event.value.id} eventSlug={event.value.slug} hasPassword={conContrasena} />
            <DangerZone eventId={event.value.id} eventSlug={event.value.slug} />
          </div>
        </PanelCard>

        <PanelCard title="Vista previa del enlace">
          <div className="flex flex-col gap-4">
            <p className="text-[12px] leading-[1.7] text-ink-soft">
              Así verán tus invitados la información básica del evento. El enlace de solo lectura es el que se comparte
              con el cliente; el de cada invitado se reparte desde la sección Invitados.
            </p>

            {/* La ficha de la maqueta: lo que el invitado ve antes de abrir nada. */}
            <div className="rounded-[14px] border border-line-panel bg-bg-raised p-5">
              <p className="font-display text-[22px] italic text-ink">{event.value.title}</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">
                {new Date(`${event.value.eventDate}T00:00:00`).toLocaleDateString('es-BO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-1.5 font-mono text-[11px] break-all text-ink-mute">{`/i/${event.value.slug}`}</p>
              <p className="mt-3">
                {conContrasena ? <Pill tone="pending">Protegida</Pill> : <Pill tone="ok">Pública</Pill>}
              </p>
            </div>
            <ClientSharePanel
              eventId={event.value.id}
              eventSlug={event.value.slug}
              live={
                isErr(share) || share.value === null
                  ? null
                  : { id: share.value.id, expiresAt: share.value.expiresAt.toISOString().slice(0, 10) }
              }
            />
          </div>
        </PanelCard>
      </div>
    </>
  )
}
