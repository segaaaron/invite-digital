import { cookies } from 'next/headers'
import { asistente, avisos, identity } from '@/app/composition/container'
import { LuxuryConSiri } from '@/modules/asistente/ui/LuxuryConSiri'
import { primerEventoConLuxury } from '../../_carcasa/asistente'
import { env } from '@/shared/config/env'
import { TIPOS_DE_AVISO_EXPLICADOS } from '@/modules/notifications'
import { ActivarAvisos } from '@/modules/notifications/ui/ActivarAvisos'
import { PreferenciasDeAvisos } from '@/modules/notifications/ui/PreferenciasDeAvisos'
import { SesionesAbiertas } from '@/modules/identity/ui/SeguridadDeCuenta'
import { fechaHora } from '@/shared/format/fecha'
import { tipoDeDispositivo } from '@/modules/identity/domain/dispositivo'
import { isErr } from '@/shared/result'
import { requireSession, SESSION_COOKIE } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { SettingsSection } from '@/shared/design/ui/panel/ajustes'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { signOutAction } from '@/app/_acciones/identity/actions'

const ROL = { admin: 'Administrador', atelier: 'Atelier', cliente: 'Cliente', puerta: 'Personal de puerta' } as const

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
  const actual = await identity.authenticateSession((await cookies()).get(SESSION_COOKIE)?.value ?? null)
  const estaId = isErr(actual) ? null : actual.value.sessionId
  const sesiones = (await identity.sessionsOf(actor.userId)).map((s) => ({
    id: s.id,
    dispositivo: s.device ?? 'sin identificar (se abrió antes de guardarlo)',
    tipo: tipoDeDispositivo(s.device),
    ultimoUso: fechaHora(s.lastSeenAt ?? s.createdAt),
    esta: s.id === estaId,
  }))

  // «Luxury con Siri», solo si alguno de sus eventos tiene a Luxury (la ruta de Siri lo vuelve a comprobar).
  const conLuxury = (actor.role === 'cliente' || actor.role === 'atelier') && (await primerEventoConLuxury(actor)) !== null

  return (
    <div className="flex max-w-[980px] flex-col gap-4.5">
      <PanelHeader kicker="Cuenta" meta="Tus datos de acceso al panel" title="Mi cuenta" />

      <PanelCard>
        <SettingsSection
          description={
            actor.role === 'admin'
              ? 'Con este correo entras al panel y te llegan los avisos. Para cambiarlo, crea la cuenta nueva en Ajustes › Equipo y borra esta.'
              : 'Con este correo entras al panel y te llegan los avisos. Si hay que cambiarlo, escríbele al atelier.'
          }
          title="Perfil"
        >
          <dl className="grid gap-4 min-[560px]:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-[12px] text-ink-mute">Correo</dt>
              <dd className="text-[14px] text-ink">{actor.email}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[12px] text-ink-mute">Rol</dt>
              <dd className="text-[14px] text-ink">{ROL[actor.role]}</dd>
            </div>
          </dl>
        </SettingsSection>


        {actor.role === 'puerta' ? null : (
          <div className="scroll-mt-24" id="avisos">
            <SettingsSection
              description="Te avisamos en la campana y, si los activas, en tu celular o computadora: aunque no tengas el panel abierto. En iPhone, con el panel instalado en la pantalla de inicio."
              title="Avisos"
            >
              <ActivarAvisos clavePublica={avisos.clavePublica} />
              <PreferenciasDeAvisos
                silenciados={await avisos.silenciados(actor.userId)}
                tipos={TIPOS_DE_AVISO_EXPLICADOS.filter((t) => t.soloAdmin === (actor.role === 'admin'))}
              />
            </SettingsSection>
          </div>
        )}

        {conLuxury ? (
          <div className="scroll-mt-24" id="siri">
            <SettingsSection description="Háblale a Luxury sin abrir el panel: «Oye Siri, Luxury», y te responde en voz alta. En iPhone, con la app Atajos." title="Luxury con Siri">
              <LuxuryConSiri atajo={(await asistente.config()).atajoDeSiri} url={`${env.SITE_URL.replace(/\/$/, '')}/panel/luxury/siri`} />
            </SettingsSection>
          </div>
        ) : null}

        <SettingsSection description="Dónde está abierta tu cuenta. Si alguien más entra con tu contraseña, ciérrale la sesión con el código de tu correo." title="Sesiones abiertas">
          <SesionesAbiertas sesiones={sesiones} />
        </SettingsSection>

        <SettingsSection description="Sal del panel en este dispositivo." title="Sesión">
          <div>
            <ConfirmAction
              action={signOutAction}
              confirmLabel="Cerrar sesión"
              description="Saldrás del panel en este dispositivo. Para volver tendrás que entrar con tu correo y tu contraseña."
              title="Cerrar sesión"
              trigger="Cerrar sesión"
              triggerClassName={botonClases('default')}
            />
          </div>
        </SettingsSection>
      </PanelCard>
    </div>
  )
}
