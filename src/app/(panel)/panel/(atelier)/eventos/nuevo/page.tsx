import { notFound, redirect } from 'next/navigation'
import { isAdmin, puedeCrearEventos } from '@/modules/identity'
import { EventForm } from '@/modules/events/ui/EventForm'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { tr } from '@/shared/i18n/idioma-servidor'

export default async function NewEventPage() {
  const actor = await requireSession()
  if (!puedeCrearEventos(actor)) notFound()
  // El admin crea desde «Crear › Evento para un cliente»: un solo camino, con el cliente y el plan (16 oct).
  if (isAdmin(actor)) redirect('/dashboard/admin/events?crear=evento')
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
