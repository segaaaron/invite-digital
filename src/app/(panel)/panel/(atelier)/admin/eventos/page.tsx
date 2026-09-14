import { admin } from '@/app/composition/container'
import { NuevaBodaForm } from '@/modules/admin'
import { EventAdminRow } from '@/modules/admin/ui/EventAdminRow'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Eventos · Administración' }
export const dynamic = 'force-dynamic'

export default async function AdminEventosPage() {
  await requireAdmin()

  const [eventos, usuarios, planes] = await Promise.all([admin.events(), admin.users(), admin.planSlugs()])

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href="/panel/eventos/nuevo" variant="primary">
            + Nuevo evento
          </PanelButton>
        }
        kicker="Administración"
        meta="Todos los eventos del sistema, de cualquier atelier"
        title="Eventos"
      />

      {/* Crear va **antes** de la lista: es lo que se viene a hacer aquí cuando llega un
          cliente nuevo, y tenerlo debajo de todas las bodas del sistema obligaba a
          desplazarse hasta el final para empezar. */}
      <PanelCard className="mb-4.5" title="Nueva boda para un cliente">
        <NuevaBodaForm
          // El clásico no se ofrece: no se publica en el catálogo, es el respaldo de una
          // clave desconocida. Nadie lo elige mirando la web.
          modelos={themeDefinitions()
            .filter((tema) => tema.key !== 'clasico')
            .map((tema) => ({ key: tema.key, label: tema.label }))}
          planes={planes}
        />
      </PanelCard>

      <PanelCard>
        {isErr(eventos) || isErr(usuarios) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : eventos.value.length === 0 ? (
          <p className="text-[13px] text-ink-mute">Todavía no hay ningún evento en el sistema.</p>
        ) : (
          <ul className="flex flex-col">
            {eventos.value.map((evento) => (
              <EventAdminRow
                key={evento.id}
                event={{
                  id: evento.id,
                  slug: evento.slug,
                  title: evento.title,
                  eventDate: evento.eventDate,
                  ownerEmail: evento.ownerEmail,
                  ownerId: evento.ownerId,
                  planSlug: evento.planSlug,
                  grupos: evento.grupos,
                }}
                owners={usuarios.value.map((u) => ({ id: u.id, email: u.email }))}
                plans={planes}
              />
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}
