import { ChangePasswordForm } from '@/modules/identity/ui/ChangePasswordForm'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'

export const metadata = { title: 'Mi cuenta' }

export const dynamic = 'force-dynamic'

/**
 * La cuenta de quien ha entrado, sea atelier, cliente o personal de puerta.
 *
 * Hoy solo tiene la contraseña, y es la pieza que faltaba: las cuentas las da de alta otro
 * —el admin, o el atelier al dar acceso a su cliente— y esa clave inicial viaja por
 * WhatsApp. Sin esta pantalla, la contraseña que escribió otra persona valía para siempre.
 */
export default async function CuentaPage() {
  const actor = await requireSession()

  return (
    <>
      <PanelHeader kicker="Cuenta" meta={actor.email} title="Mi cuenta" />

      <PanelCard title="Contraseña">
        <ChangePasswordForm />
      </PanelCard>
    </>
  )
}
