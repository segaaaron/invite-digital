import { site } from '@/app/composition/container'
import { formatoWhatsapp } from '@/modules/admin/domain/site-settings'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { HelpCenter } from '@/shared/help/HelpCenter'
import { SupportForm } from '@/shared/help/SupportForm'

export const metadata = { title: 'Ayuda' }

export default async function HelpPage() {
  await requireSession()
  const ajustes = await site.settings()
  const contacto = { numero: ajustes.whatsapp, visible: formatoWhatsapp(ajustes.whatsapp), saludo: ajustes.mensajes.soporte.es }

  return (
    <>
      <PanelHeader kicker="Soporte" title="Centro de ayuda" />

      <div className="grid gap-4.5 min-[900px]:grid-cols-[1.4fr_1fr]">
        <PanelCard>
          <HelpCenter contacto={contacto} />
        </PanelCard>

        <PanelCard title="Contactar soporte">
          <SupportForm contacto={contacto} />
        </PanelCard>
      </div>
    </>
  )
}
