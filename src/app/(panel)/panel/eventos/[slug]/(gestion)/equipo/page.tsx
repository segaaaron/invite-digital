import { notFound } from 'next/navigation'
import { events, plans } from '@/app/composition/container'
import { TeamCard } from '@/modules/events/ui/TeamCard'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Equipo' }
export const dynamic = 'force-dynamic'

export default async function EquipoPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  // Sección `equipo`: el anfitrión, el dueño y el admin. Co-anfitriones y planners, 404.
  const event = await events.getFor(actor, slug, { section: 'equipo' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const capacidad = await plans.allowanceFor(event.value.id)
  if (isErr(capacidad)) throw new Error(capacidad.error.detail)
  const equipo = await events.team.list(event.value.id)
  const papel = { cliente: 'anfitrion', coanfitrion: 'coanfitrion', planner: 'planner' } as const

  return (
    <>
      <PanelHeader
        actions={<PanelButton href={`/panel/eventos/${event.value.slug}/porteros`}>Porteros</PanelButton>}
        kicker="Tu evento"
        meta={`${equipo.length} persona${equipo.length === 1 ? '' : 's'} en el equipo`}
        title="Equipo"
      />
      <PanelCard title="Quién organiza contigo">
        <TeamCard
          eventId={event.value.id}
          eventSlug={event.value.slug}
          miembros={equipo.flatMap((m) => (m.membership === 'puerta' ? [] : [{ userId: m.userId, email: m.email, papel: papel[m.membership] }]))}
          topes={{ coanfitriones: capacidad.value.maxCohosts, planners: capacidad.value.maxHiredPlanners }}
        />
      </PanelCard>
    </>
  )
}
