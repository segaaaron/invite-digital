import { notFound } from 'next/navigation'
import { events, guests, plans, rsvp, venue } from '@/app/composition/container'
import { ExportCsvButton } from '@/modules/guests/ui/ExportCsvButton'
import { PeopleTable, type PersonRowView } from '@/modules/guests/ui/PeopleTable'
import { PersonForm } from '@/modules/guests/ui/PersonForm'
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

  // Las personas cargadas dentro de cada grupo, que es lo que la maqueta lista.
  const personas = await guests.listPeople(event.value.id)
  const salon = await venue.seating(event.value.id).catch(() => null)

  const mesaDeGrupo = new Map<string, string>()
  if (salon !== null && !isErr(salon)) {
    for (const mesa of salon.value.tables) {
      for (const grupo of mesa.groups) mesaDeGrupo.set(grupo.id, mesa.label)
    }
  }

  const etiquetaDeGrupo = new Map(filas.map((f) => [f.id, f.label]))
  const filasPersona: PersonRowView[] = isErr(personas)
    ? []
    : personas.value.map((persona) => ({
        id: persona.id,
        fullName: persona.fullName,
        groupLabel: etiquetaDeGrupo.get(persona.guestGroupId) ?? '—',
        isCompanion: persona.isCompanion,
        dietaryNote: persona.dietaryNote,
        vip: persona.vip,
        attending: persona.attending,
        tableLabel: mesaDeGrupo.get(persona.guestGroupId) ?? null,
      }))

  const cargadasPorGrupo = new Map<string, number>()
  if (!isErr(personas)) {
    for (const persona of personas.value) {
      cargadasPorGrupo.set(persona.guestGroupId, (cargadasPorGrupo.get(persona.guestGroupId) ?? 0) + 1)
    }
  }

  const capacidad = await plans.allowanceFor(event.value.id)
  const limite = isErr(capacidad) ? null : capacidad.value.maxGuestGroups
  const cupos = filas.reduce((sum, f) => sum + f.seats, 0)

  return (
    <>
      <PanelHeader
        actions={
          <ExportCsvButton
            eventSlug={event.value.slug}
            people={filasPersona.map((p) => ({
              fullName: p.fullName,
              groupLabel: p.groupLabel,
              attending: p.attending,
              isCompanion: p.isCompanion,
              dietaryNote: p.dietaryNote,
              vip: p.vip,
              tableLabel: p.tableLabel,
            }))}
            rows={filas}
          />
        }
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

        <PanelCard title="Personas del evento">
          <div className="flex flex-col gap-5">
            <PersonForm
              eventSlug={event.value.slug}
              groups={filas.map((fila) => ({
                id: fila.id,
                label: fila.label,
                free: Math.max(0, fila.seats - (cargadasPorGrupo.get(fila.id) ?? 0)),
              }))}
            />
            {filasPersona.length === 0 ? (
              <p className="text-[13px] text-ink-mute">
                Todavía no hay personas cargadas. Un grupo sin personas se sigue viendo abajo como una sola fila.
              </p>
            ) : (
              <PeopleTable eventSlug={event.value.slug} rows={filasPersona} />
            )}
          </div>
        </PanelCard>

        <PanelCard title="Grupos y cupos">
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
