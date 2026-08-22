import { notFound } from 'next/navigation'
import { checkin, events, guests, plans, rsvp } from '@/app/composition/container'
import { ArrivalStrip } from '@/modules/checkin/ui/ArrivalStrip'
import { ClientSharePanel } from '@/modules/events/ui/ClientSharePanel'
import { EventForm } from '@/modules/events/ui/EventForm'
import { GuestGroupForm } from '@/modules/guests/ui/GuestGroupForm'
import { GuestGroupTable, type GuestGroupRowView } from '@/modules/guests/ui/GuestGroupTable'
import { requireSession } from '@/modules/identity/session-cookie'
import { AllowanceNotice } from '@/modules/plans/ui/AllowanceNotice'
import { canAddGroup } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { DonutChart, PanelCard, StatCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const groups = await guests.list(event.value.id)
  // La última respuesta de cada grupo, una consulta por grupo. Con listas de invitados
  // de decenas de filas no compensa una consulta agregada; si un evento crece a
  // centenares, `tallyRowsFor` ya trae la forma que haría falta.
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : await Promise.all(
        groups.value.map(async (group) => ({
          ...group,
          confirmed: (await rsvp.latestFor(group.id))?.attending ?? null,
        })),
      )

  // Cuánto margen queda antes del límite del plan. Se resuelve aquí, en la página, y se
  // le pasa al aviso: `guests` no sabe nada de planes.
  const capacidad = await plans.allowanceFor(event.value.id)
  const limite = isErr(capacidad) ? null : capacidad.value.maxGuestGroups
  const grupos = isErr(groups) ? 0 : groups.value.length

  const tally = await rsvp.tally(event.value.id)
  const share = await events.liveShare(event.value.id)

  // Cuánta gente ha llegado. Solo se lee si el plan trae la puerta: sin ella no hay
  // llegadas que contar, y una tira de ceros haría creer que la recepción ya empezó.
  // La comprobación vive aquí, en la página: `checkin` no sabe nada de planes.
  const conPuerta = await plans.requireFeature(event.value.id, 'checkin')
  const puerta = isErr(conPuerta) ? null : await checkin.state(event.value.id)
  const llegadas = puerta === null || isErr(puerta) ? null : puerta.value.tally

  // Los cupos ya salen en las tarjetas de arriba: repetirlos aquí era ruido.
  const t = isErr(tally) ? null : tally.value
  const respondieron = filas.filter((f) => f.confirmed !== null).length
  const pendientes = filas.length - respondieron
  const noAsisten = filas.filter((f) => f.confirmed === 0).length

  return (
    <>
      <PanelHeader
        kicker="Resumen"
        meta={new Date(`${event.value.eventDate}T00:00:00`).toLocaleDateString('es-BO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        title={event.value.title}
      />
      <div className="mb-5.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Grupos invitados" value={filas.length} icon="✉" />
        <StatCard
          label="Cupos confirmados"
          value={t ? t.seatsConfirmed : 0}
          suffix={`/ ${t ? t.seatsInvited : 0}`}
          icon="✓"
          progress={t && t.seatsInvited > 0 ? t.seatsConfirmed / t.seatsInvited : 0}
        />
        <StatCard label="Grupos pendientes" value={t ? t.groupsPending : pendientes} icon="◔" />
        <StatCard label="Personas dentro" value={llegadas ? llegadas.headsInside : '—'} icon="⛩" />
      </div>

      <div className="mb-5.5 grid gap-4.5 lg:grid-cols-[1.6fr_1fr]">
        <PanelCard title="Estado de los RSVP">
          <DonutChart
            big={filas.length === 0 ? '—' : `${Math.round((respondieron / filas.length) * 100)}%`}
            caption="RESPONDIERON"
            slices={[
              { label: 'Asistirán', value: respondieron - noAsisten, color: 'var(--color-sage)' },
              { label: 'No podrán', value: noAsisten, color: 'var(--color-danger)' },
              { label: 'Sin responder', value: pendientes, color: 'var(--color-gold-light)' },
            ]}
          />
        </PanelCard>
        <PanelCard title="Llegada">
          <ArrivalStrip tally={llegadas} />
        </PanelCard>
      </div>

      <div className="flex flex-col gap-4.5">
        <PanelCard id="invitados" title="Invitados">
          <div className="flex flex-col gap-4">
            <AllowanceNotice currentGroups={grupos} eventSlug={event.value.slug} maxGuestGroups={limite} />
            <GuestGroupForm atLimit={!canAddGroup(limite, grupos)} eventId={event.value.id} eventSlug={event.value.slug} />
            {isErr(groups) ? (
              <p className="text-[13px] text-gold-deep" role="alert">
                No pudimos leer los invitados. La base no responde; vuelve a intentarlo en un momento.
              </p>
            ) : (
              <GuestGroupTable eventSlug={event.value.slug} groups={filas} />
            )}
          </div>
        </PanelCard>

        <PanelCard id="enlace-cliente" title="Enlace para el cliente">
          <ClientSharePanel
            eventId={event.value.id}
            eventSlug={event.value.slug}
            live={
              isErr(share) || share.value === null
                ? null
                : { id: share.value.id, expiresAt: share.value.expiresAt.toISOString().slice(0, 10) }
            }
          />
        </PanelCard>

        <PanelCard id="datos-evento" title="Datos del evento">
          <EventForm event={event.value} />
        </PanelCard>
      </div>
    </>
  )
}
