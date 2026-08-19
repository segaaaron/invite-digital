import Link from 'next/link'
import { EventForm } from '@/modules/events/ui/EventForm'
import { requireSession } from '@/modules/identity/session-cookie'

export default async function NewEventPage() {
  await requireSession()

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8 p-10">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">Nuevo evento</h1>
        <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href="/panel">
          Volver
        </Link>
      </header>
      <EventForm />
    </div>
  )
}
