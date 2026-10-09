import { redirect } from 'next/navigation'
import { events } from '@/app/composition/container'
import { isAdmin, puedeCrearEventos } from '@/modules/identity'
import { EventList } from '@/modules/events/ui/EventList'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export default async function PanelHomePage() {
  const actor = await requireSession()
  // La bandeja enlaza al resumen de cada boda, que el admin no abre: su lista es la cartera.
  if (isAdmin(actor)) redirect('/panel/admin/eventos')
  const listed = await events.listFor(actor)

  return (
    <>
      {/* El alta es del atelier: a un cliente o a la puerta un evento suyo no se les abriría. */}
      <PanelHeader
        actions={
          puedeCrearEventos(actor) ? (
            <PanelButton href="/panel/eventos/nuevo" variant="primary">
              + Nuevo evento
            </PanelButton>
          ) : undefined
        }
        kicker={actor.role === 'atelier' ? 'Atelier' : 'Panel'}
        title={actor.role === 'atelier' ? 'Eventos' : 'Mis eventos'}
      />

      <PanelCard>
        {isErr(listed) ? (
          <p className="text-[14px] text-danger" role="alert">
            No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <EventList events={listed.value} />
        )}
      </PanelCard>
    </>
  )
}
