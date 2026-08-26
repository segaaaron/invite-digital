import { notFound } from 'next/navigation'
import { events, qr } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { qrUrl } from '@/modules/qr/domain/qr-code'
import { QrManager } from '@/modules/qr/ui/QrManager'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Códigos QR' }
export const dynamic = 'force-dynamic'

/**
 * Los códigos QR del evento.
 *
 * Todos apuntan a `/r/<id>` y redirigen, así que el destino se puede cambiar después de
 * imprimir y los escaneos se cuentan solos. Un QR con la dirección final dentro no admite
 * ninguna de las dos cosas.
 */
export default async function QrPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const event = await events.getFor(actor, slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const codes = await qr.list(event.value.id)

  return (
    <>
      <PanelHeader
        kicker="Difusión"
        meta="Apuntan aquí y redirigen: el destino se cambia sin reimprimir"
        title="Códigos QR"
      />

      <PanelCard>
        {isErr(codes) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los códigos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <QrManager
            codes={codes.value.map((code) => ({
              id: code.id,
              label: code.label,
              kind: code.kind,
              target: code.target,
              active: code.active,
              scanCount: code.scanCount,
              url: qrUrl(code.id, env.SITE_URL),
            }))}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            eventTitle={event.value.title}
          />
        )}
      </PanelCard>
    </>
  )
}
