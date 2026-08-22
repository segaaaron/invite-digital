import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { HelpCenter } from '@/shared/help/HelpCenter'

export const metadata = { title: 'Ayuda' }

export default async function HelpPage() {
  await requireSession()

  return (
    <>
      <PanelHeader kicker="Atelier" title="Ayuda" />

      <PanelCard>
        <HelpCenter />
      </PanelCard>
    </>
  )
}
