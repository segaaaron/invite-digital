import { notFound } from 'next/navigation'
import { events, guests, plans, rsvp } from '@/app/composition/container'
import { ExportCsvButton } from '@/modules/guests/ui/ExportCsvButton'
import { GuestGroupForm } from '@/modules/guests/ui/GuestGroupForm'
import { GuestGroupTable, type GuestGroupRowView } from '@/modules/guests/ui/GuestGroupTable'
import { requireSession } from '@/modules/identity/session-cookie'
import { canAddGroup } from '@/modules/plans'
import { AllowanceNotice } from '@/modules/plans/ui/AllowanceNotice'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Invitados' }

// Los invitados responden mientras el atelier mira la lista: esta página no se cachea.
export const dynamic = 'force-dynamic'

/** La vista de gestión de invitados, propia, como en la maqueta. */
export default async function InvitadosPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const groups = await guests.list(event.value.id)
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : await Promise.all(
        groups.value.map(async (group) => ({
          ...group,
          confirmed: (await rsvp.latestFor(group.id))?.attending ?? null,
        })),
      )

  const capacidad = await plans.allowanceFor(event.value.id)
  const limite = isErr(capacidad) ? null : capacidad.value.maxGuestGroups
  const cupos = filas.reduce((sum, f) => sum + f.seats, 0)

  return (
    <>
      <PanelHeader
        actions={<ExportCsvButton eventSlug={event.value.slug} rows={filas} />}
        kicker="Gestión"
        meta={`${filas.length} grupos · ${cupos} cupos repartidos`}
        title="Invitados"
      />

      <div className="flex flex-col gap-4.5">
        <PanelCard title="Añadir un grupo">
          <div className="flex flex-col gap-4">
            <AllowanceNotice currentGroups={filas.length} eventSlug={event.value.slug} maxGuestGroups={limite} />
            <GuestGroupForm
              atLimit={!canAddGroup(limite, filas.length)}
              eventId={event.value.id}
              eventSlug={event.value.slug}
            />
          </div>
        </PanelCard>

        <PanelCard title="Lista de invitados">
          {isErr(groups) ? (
            <p className="text-[13px] text-gold-deep" role="alert">
              No pudimos leer los invitados. La base no responde; vuelve a intentarlo en un momento.
            </p>
          ) : (
            <GuestGroupTable eventSlug={event.value.slug} groups={filas} />
          )}
        </PanelCard>
      </div>
    </>
  )
}
