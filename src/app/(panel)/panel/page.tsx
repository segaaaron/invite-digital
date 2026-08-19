import Link from 'next/link'
import { events } from '@/app/composition/container'
import { EventList } from '@/modules/events/ui/EventList'
import { signOutAction } from '@/modules/identity/actions'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

export default async function PanelHomePage() {
  await requireSession()
  const listed = await events.list()

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8 p-10">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">Eventos</h1>
        <div className="flex items-center gap-6">
          <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep" href="/panel/eventos/nuevo">
            Nuevo evento
          </Link>
          <form action={signOutAction}>
            <button className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      {isErr(listed) ? (
        <p className="text-[14px] text-gold-deep" role="alert">
          No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
        </p>
      ) : (
        <EventList events={listed.value} />
      )}
    </div>
  )
}
