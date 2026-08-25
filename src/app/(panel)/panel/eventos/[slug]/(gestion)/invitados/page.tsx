import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, guests, plans, rsvp, venue } from '@/app/composition/container'
import { ExportCsvButton } from '@/modules/guests/ui/ExportCsvButton'
import { PeopleTable, type PersonRowView } from '@/modules/guests/ui/PeopleTable'
import { DeliveryPanel } from '@/modules/guests/ui/DeliveryPanel'
import { ImportPanel } from '@/modules/guests/ui/ImportPanel'
import { GuestDialog } from '@/modules/guests/ui/GuestDialog'
import { canAddGroup } from '@/modules/plans'
import { AllowanceNotice } from '@/modules/plans/ui/AllowanceNotice'
import { GuestGroupTable, type GuestGroupRowView } from '@/modules/guests/ui/GuestGroupTable'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, PanelCardLink } from '@/modules/shell/ui/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Invitados' }

// Los invitados responden mientras el atelier mira la lista: esta página no se cachea.
export const dynamic = 'force-dynamic'

/**
 * La vista de gestión de invitados, propia, como en la maqueta.
 *
 * Las altas y el reparto **no** viven abiertos en la página: la maqueta pone un botón en
 * la cabecera y la lista debajo, y con cuatro formularios desplegados la lista quedaba a
 * dos pantallas de scroll. Se abren por la barra de direcciones (`?panel=alta`,
 * `?panel=envio`), así que el estado es enlazable y sobrevive al guardado, que es lo que
 * un modal con estado en el cliente no da.
 */
export default async function InvitadosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ panel?: string }>
}) {
  await requireSession()
  const { slug } = await params
  const { panel } = await searchParams

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const groups = await guests.list(event.value.id)
  // Una sola consulta para las respuestas de todos los grupos. Antes eran dos por grupo y
  // en serie: doscientos grupos, cuatrocientos viajes a la base para pintar una tabla.
  const ultimas = await rsvp.latestByEvent(event.value.id)
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : groups.value.map((group) => ({ ...group, confirmed: ultimas.get(group.id)?.attending ?? null }))

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
  const respuestaDeGrupo = new Map([...ultimas].map(([id, r]) => [id, r.respondedAt]))
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
        // «Enviado» y «Confirmado» son del **grupo**: el enlace y la respuesta lo son.
        // La maqueta los enseña en la fila de cada persona, y de ahí salen.
        sentAt: filas.find((f) => f.id === persona.guestGroupId)?.invitationSentAt ?? null,
        respondedAt: respuestaDeGrupo.get(persona.guestGroupId) ?? null,
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

  const base = `/panel/eventos/${event.value.slug}/invitados`
  const abierto = panel === 'alta' || panel === 'envio' ? panel : null

  return (
    <>
      <PanelHeader
        actions={
          <>
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
            <PanelButton href={abierto === 'envio' ? base : `${base}?panel=envio`}>✉ Enviar invitaciones</PanelButton>
            <PanelButton href={`${base}?panel=alta`} variant="primary">
              + Añadir invitado
            </PanelButton>
          </>
        }
        kicker="Gestión"
        meta={`${filasPersona.length} invitados en total · ${filas.length} grupos · ${cupos} cupos`}
        title="Invitados"
      />

      {/* «+ Añadir invitado» abre el diálogo de la maqueta, con sus nueve campos. */}
      {abierto === 'alta' ? (
        <GuestDialog
          atLimit={!canAddGroup(limite, filas.length)}
          closeHref={base}
          eventId={event.value.id}
          eventSlug={event.value.slug}
          groups={filas.map((fila) => ({
            id: fila.id,
            label: fila.label,
            free: Math.max(0, fila.seats - (cargadasPorGrupo.get(fila.id) ?? 0)),
          }))}
          notice={
            <AllowanceNotice currentGroups={filas.length} eventSlug={event.value.slug} maxGuestGroups={limite} />
          }
        />
      ) : null}

      <div className="flex flex-col gap-4.5">
        {abierto === 'envio' ? (
          <PanelCard
            action={
              <Link href={base}>
                <PanelCardLink>Cerrar ✕</PanelCardLink>
              </Link>
            }
            title="Enviar invitaciones"
          >
            <DeliveryPanel
              eventLocale={event.value.locale}
              eventSlug={event.value.slug}
              rows={filas.map((fila) => ({
                id: fila.id,
                label: fila.label,
                phone: fila.phone ?? null,
                sent: fila.invitationSentAt !== null && fila.invitationSentAt !== undefined,
                revoked: fila.revokedAt !== null,
              }))}
              template={event.value.messageTemplate ?? null}
            />
          </PanelCard>
        ) : null}

        {/* La lista de personas es el centro de la vista en la maqueta: buscador, chips,
            tabla y paginación dentro de una sola tarjeta. */}
        <PanelCard title="Invitados">
          {isErr(personas) ? (
            // Pintar «todavía no hay personas» cuando la lectura falló no es un error
            // invisible: es un error que **miente**. El atelier daría por vacía una
            // lista que existe.
            <p className="text-[13px] text-danger" role="alert">
              No pudimos leer las personas. La base no responde; vuelve a intentarlo en un momento.
            </p>
          ) : filasPersona.length === 0 ? (
            <p className="text-[13px] text-ink-mute">
              Todavía no hay personas cargadas. Un grupo sin personas se sigue viendo abajo como una sola fila.
            </p>
          ) : (
            <PeopleTable eventSlug={event.value.slug} rows={filasPersona} />
          )}
        </PanelCard>

        <PanelCard title="Importar desde CSV">
          <ImportPanel eventId={event.value.id} eventSlug={event.value.slug} />
        </PanelCard>

        {/* Los grupos con sus cupos y su enlace no están en la maqueta —que modela
            personas sueltas— y se quedan: el enlace de invitación es del grupo. */}
        <PanelCard title="Grupos y cupos">
          {isErr(groups) ? (
            <p className="text-[13px] text-danger" role="alert">
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
