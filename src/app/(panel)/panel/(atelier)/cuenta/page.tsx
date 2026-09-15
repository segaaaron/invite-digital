import { ChangePasswordForm } from '@/modules/identity/ui/ChangePasswordForm'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'

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
  // Sin excepciones que pedir: el guard sabe qué ruta se está sirviendo y no redirige
  // cuando ya se está aquí. Pedir la salida página por página fue justo lo que rompió
  // esto — el layout de `(atelier)` se evalúa antes y no la pedía, así que redirigía a
  // esta misma dirección en bucle.
  const actor = await requireSession()

  return (
    <>
      <PanelHeader kicker="Cuenta" meta={actor.email} title="Mi cuenta" />

      {actor.mustChangePassword ? (
        <PanelCard>
          <p className="text-[13px] leading-[1.7] text-ink-soft">
            <strong className="font-normal text-ink">Elige tu contraseña antes de seguir.</strong> La que estás usando
            te la dio otra persona y viajó por correo, así que no puede ser la definitiva. En cuanto la cambies, el
            resto del panel se abre.
          </p>
        </PanelCard>
      ) : null}

      <PanelCard title="Contraseña">
        <ChangePasswordForm />
      </PanelCard>
    </>
  )
}
