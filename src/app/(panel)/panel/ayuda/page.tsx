import Link from 'next/link'
import { requireSession } from '@/modules/identity/session-cookie'
import { HelpCenter } from '@/shared/help/HelpCenter'

export const metadata = { title: 'Ayuda' }

export default async function HelpPage() {
  await requireSession()

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8 p-10">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">Ayuda</h1>
        <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href="/panel">
          Volver
        </Link>
      </header>

      <HelpCenter />
    </div>
  )
}
