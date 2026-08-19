import { signOutAction } from '@/modules/identity/actions'
import { requireSession } from '@/modules/identity/session-cookie'

export default async function PanelHomePage() {
  await requireSession()

  return (
    <div className="p-10">
      <h1 className="font-display text-[26px] font-light text-ink">Eventos</h1>
      <form action={signOutAction}>
        <button className="mt-6 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" type="submit">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
