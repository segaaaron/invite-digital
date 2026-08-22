import Link from 'next/link'
import { events } from '@/app/composition/container'
import { EventList } from '@/modules/events/ui/EventList'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export default async function PanelHomePage() {
  await requireSession()
  const listed = await events.list()

  return (
    <>
      <PanelHeader
        actions={
          <Link
            className="rounded-full border border-line px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase"
            href="/panel/eventos/nuevo"
          >
            Nuevo evento
          </Link>
        }
        kicker="Atelier"
        title="Eventos"
      />

      <PanelCard>
        {isErr(listed) ? (
          <p className="text-[14px] text-gold-deep" role="alert">
            No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <EventList events={listed.value} />
        )}
      </PanelCard>
    </>
  )
}
