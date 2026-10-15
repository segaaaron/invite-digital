import { notFound } from 'next/navigation'
import { puedeCrearEventos } from '@/modules/identity'
import { EventForm } from '@/modules/events/ui/EventForm'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { tr } from '@/shared/i18n/idioma-servidor'

export default async function NewEventPage() {
  if (!puedeCrearEventos(await requireSession())) notFound()
  const t = await tr()

  return (
    <>
      <PanelHeader kicker="Atelier" title={t('Nuevo evento', 'New event')} />

      <PanelCard>
        <EventForm />
      </PanelCard>
    </>
  )
}
