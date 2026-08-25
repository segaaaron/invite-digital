import Link from 'next/link'
import { notFound } from 'next/navigation'
import { checkin, events, plans } from '@/app/composition/container'
import { ManualCheckin } from '@/modules/checkin/ui/ManualCheckin'
import { DoorModeCard } from '@/modules/checkin/ui/DoorModeCard'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { DonutChart, PanelCard, PanelCardLink } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Check-in' }

// Las llegadas entran mientras el atelier mira esta pantalla: no se cachea.
export const dynamic = 'force-dynamic'

/**
 * La sección de check-in del panel, portada de `Dashboard.html`.
 *
 * **Aquí no hay cámara.** El escáner vive solo en el modo puerta, a pantalla completa,
 * que es como se usa de verdad: un celular o una tablet en la mano de quien recibe. Un
 * vídeo encendido dentro del panel de escritorio no sirve a nadie y falla en cuanto la
 * máquina no tiene cámara, que es lo que pasaba al entrar aquí desde la barra.
 */
export default async function CheckinPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const permitido = await plans.requireFeature(event.value.id, 'checkin')
  if (isErr(permitido)) {
    return <FeatureLocked eventSlug={event.value.slug} reason={permitido.error.detail} title="Check-in" />
  }

  const estado = await checkin.state(event.value.id)
  if (isErr(estado)) throw new Error(estado.error.detail)

  const { tally, groups, arrivals } = estado.value
  const porcentaje =
    tally.expectedGroups === 0 ? 0 : Math.round((tally.arrivedGroups / tally.expectedGroups) * 100)
  const etiquetaDe = new Map(groups.map((g) => [g.id, g.label]))
  const ultimas = [...arrivals].sort((a, b) => b.arrivedAt.getTime() - a.arrivedAt.getTime()).slice(0, 12)

  return (
    <>
      <PanelHeader
        kicker="Día del evento"
        meta={`${tally.arrivedGroups} de ${tally.expectedGroups} grupos · ${tally.headsInside} personas dentro`}
        title="Check-in de invitados"
      />

      <DoorModeCard href={`/panel/eventos/${event.value.slug}/puerta`} />

      <div className="mb-5.5 grid items-start gap-4.5 lg:grid-cols-[1.3fr_1fr]">
        <PanelCard title="Buscar a mano">
          <div className="flex flex-col gap-4">
            <p className="text-[12px] leading-[1.7] text-ink-soft">
              Para quien llegue sin el pase, con el celular sin batería o con la pantalla rota. Busca por nombre o
              grupo y registra el ingreso directo, sin escanear nada.
            </p>
            <ManualCheckin
              arrivedIds={arrivals.map((a) => a.guestGroupId)}
              eventId={event.value.id}
              eventSlug={event.value.slug}
              groups={groups.map((g) => ({
                id: g.id,
                label: g.label,
                seats: g.seats,
                attending: g.attending,
                revoked: g.revoked,
              }))}
            />
            {/* La nota del lector de códigos que la maqueta pone bajo el buscador: en la
                recepción es habitual tener uno por USB, y nadie lo probaría si no se dice. */}
            <p className="text-[11px] leading-[1.6] text-ink-mute">
              Un lector de códigos por USB o Bluetooth también escribe aquí: termina con Enter y registra el ingreso
              directo.
            </p>
          </div>
        </PanelCard>

        <PanelCard title="Progreso de llegada">
          <DonutChart
            big={`${porcentaje}%`}
            caption="LLEGARON"
            slices={[
              { label: 'Dentro', value: tally.arrivedGroups, color: 'var(--color-sage)' },
              {
                label: 'Sin llegar',
                // Nunca negativo: pueden llegar grupos que no estaban entre los esperados.
                value: Math.max(0, tally.expectedGroups - tally.arrivedGroups),
                color: 'var(--color-gold-light)',
              },
            ]}
          />
        </PanelCard>
      </div>

      <PanelCard
        action={
          <Link href={`/panel/eventos/${event.value.slug}/invitados`}>
            <PanelCardLink>Ver todos los invitados →</PanelCardLink>
          </Link>
        }
        title="Últimas llegadas"
      >
        {ultimas.length === 0 ? (
          <p className="text-[13px] text-ink-mute">Todavía no ha llegado nadie. La puerta está lista.</p>
        ) : (
          <ul className="flex flex-col">
            {ultimas.map((a) => (
              <li
                key={a.guestGroupId}
                className="flex flex-wrap items-center gap-3 border-b border-line-panel py-2.5 last:border-none"
              >
                <span className="flex-1 text-[14px] text-ink">{etiquetaDe.get(a.guestGroupId) ?? 'Grupo retirado'}</span>
                <span className="font-mono text-[11px] text-ink-soft">
                  {a.arrivedCount} dentro
                </span>
                <span className="font-mono text-[10px] text-ink-mute">
                  {a.arrivedAt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}
