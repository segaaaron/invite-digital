import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { HelpCenter } from '@/shared/help/HelpCenter'
import { SupportForm } from '@/shared/help/SupportForm'

export const metadata = { title: 'Ayuda' }

export default async function HelpPage() {
  await requireSession()

  return (
    <>
      <PanelHeader kicker="Soporte" title="Centro de ayuda" />

      <div className="grid gap-4.5 lg:grid-cols-[1.4fr_1fr]">
        <PanelCard>
          <HelpCenter />
        </PanelCard>

        <PanelCard title="Contactar soporte">
          <SupportForm />
        </PanelCard>
      </div>
    </>
  )
}
