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
import { MisDatos } from '@/modules/identity/ui/MisDatos'

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

  const datos = await identity.misDatos(actor.userId)
  const TARJETA = 'flex flex-col gap-4 rounded-[16px] border border-line-panel bg-tarjeta p-6'

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader meta="Tus datos, tus avisos y dónde tienes la sesión abierta." title="Mi cuenta" />

      <div className="grid items-start gap-5 min-[900px]:grid-cols-2">
        <section aria-labelledby="tus-datos" className={TARJETA}>
          <h2 className="font-display text-[24px] font-medium" id="tus-datos">
            Tus datos
          </h2>
          <MisDatos
            ayudaCorreo={actor.role === 'admin' ? 'Para cambiarlo, crea la cuenta nueva en Ajustes › Equipo y borra esta.' : 'Para cambiarlo, escríbele al atelier.'}
            correo={actor.email}
            nombre={datos.nombre}
            telefono={datos.telefono}
          />
          <p className="text-[13px] text-ink-mute">Entras como {ROL[actor.role].toLowerCase()}.</p>
        </section>

        <section aria-labelledby="donde" className={TARJETA}>
          <h2 className="font-display text-[24px] font-medium" id="donde">
            Dónde está abierta
          </h2>
          <SesionesAbiertas sesiones={sesiones} />
        </section>
      </div>

      {actor.role === 'puerta' ? null : (
        <section aria-labelledby="avisos-t" className={`${TARJETA} scroll-mt-24`} id="avisos">
          <h2 className="font-display text-[24px] font-medium" id="avisos-t">
            Avisos
          </h2>
          <p className="max-w-[68ch] text-[14px] text-ink-mute">
            Te avisamos en la campana y, si los activas, en tu celular o computadora aunque no tengas el panel abierto. En iPhone, con el panel instalado en la pantalla de inicio.
          </p>
          <ActivarAvisos clavePublica={avisos.clavePublica} />
          <PreferenciasDeAvisos silenciados={await avisos.silenciados(actor.userId)} tipos={TIPOS_DE_AVISO_EXPLICADOS.filter((t) => t.soloAdmin === (actor.role === 'admin'))} />
        </section>
      )}

      {conLuxury ? (
        <section aria-labelledby="siri-t" className={`${TARJETA} scroll-mt-24`} id="siri">
          <h2 className="font-display text-[24px] font-medium" id="siri-t">
            Luxury con Siri
          </h2>
          <p className="max-w-[68ch] text-[14px] text-ink-mute">Háblale a Luxury sin abrir el panel: «Oye Siri, Luxury», y te responde en voz alta. En iPhone, con la app Atajos.</p>
          <LuxuryConSiri atajo={(await asistente.config()).atajoDeSiri} url={`${env.SITE_URL.replace(/\/$/, '')}/panel/luxury/siri`} />
        </section>
      ) : null}
    </div>
  )
}
