import { notFound } from 'next/navigation'
import { puedeCrearEventos } from '@/modules/identity'
import { EventForm } from '@/modules/events/ui/EventForm'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'

export default async function NewEventPage() {
  if (!puedeCrearEventos(await requireSession())) notFound()

  return (
    <>
      <PanelHeader kicker="Atelier" title="Nuevo evento" />

      <PanelCard>
        <EventForm />
      </PanelCard>
    </>
  )
}
