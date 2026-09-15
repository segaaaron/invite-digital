import { EventForm } from '@/modules/events/ui/EventForm'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'

export default async function NewEventPage() {
  await requireSession()

  return (
    <>
      <PanelHeader kicker="Atelier" title="Nuevo evento" />

      <PanelCard>
        <EventForm />
      </PanelCard>
    </>
  )
}
