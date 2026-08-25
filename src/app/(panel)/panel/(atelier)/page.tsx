import { events } from '@/app/composition/container'
import { EventList } from '@/modules/events/ui/EventList'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export default async function PanelHomePage() {
  await requireSession()
  const listed = await events.list()

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href="/panel/eventos/nuevo" variant="primary">
            + Nuevo evento
          </PanelButton>
        }
        kicker="Atelier"
        title="Eventos"
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
