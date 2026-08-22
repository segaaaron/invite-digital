import { EventForm } from '@/modules/events/ui/EventForm'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'

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
