import { cookies } from 'next/headers'
import { asistente, avisos, identity } from '@/app/composition/container'
import { LuxuryConSiri } from '@/modules/asistente/ui/LuxuryConSiri'
import { primerEventoConLuxury } from '../../_carcasa/asistente'
import { env } from '@/shared/config/env'
import { TIPOS_DE_AVISO_EXPLICADOS } from '@/modules/notifications'
import { traducir } from '@/shared/i18n/en-ingles'
import { ActivarAvisos } from '@/modules/notifications/ui/ActivarAvisos'
import { PreferenciasDeAvisos } from '@/modules/notifications/ui/PreferenciasDeAvisos'
import { SesionesAbiertas } from '@/modules/identity/ui/SeguridadDeCuenta'
import { fechaHora } from '@/shared/format/fecha'
import { tipoDeDispositivo } from '@/modules/identity/domain/dispositivo'
import { isErr } from '@/shared/result'
import { requireSession, SESSION_COOKIE } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { MisDatos } from '@/modules/identity/ui/MisDatos'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import type { T } from '@/shared/i18n/t'

const ROL = (t: T) => ({ admin: t('administrador', 'administrator'), atelier: 'atelier', cliente: t('cliente', 'client'), puerta: t('personal de puerta', 'door staff') }) as const

export async function generateMetadata() {
  return { title: (await tr())('Mi cuenta', 'My account') }
}

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
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const actual = await identity.authenticateSession((await cookies()).get(SESSION_COOKIE)?.value ?? null)
  const estaId = isErr(actual) ? null : actual.value.sessionId
  const sesiones = (await identity.sessionsOf(actor.userId)).map((s) => ({
    id: s.id,
    dispositivo: s.device ?? t('sin identificar (se abrió antes de guardarlo)', 'unidentified (opened before we stored it)'),
    tipo: tipoDeDispositivo(s.device),
    ultimoUso: fechaHora(s.lastSeenAt ?? s.createdAt, locale),
    esta: s.id === estaId,
  }))

  // «Luxury con Siri», solo si alguno de sus eventos tiene a Luxury (la ruta de Siri lo vuelve a comprobar).
  const conLuxury = (actor.role === 'cliente' || actor.role === 'atelier') && (await primerEventoConLuxury(actor)) !== null

  const datos = await identity.misDatos(actor.userId)
  // El paso dos del cambio de correo sobrevive a recargar porque sale de la base, no de React.
  const correoPendiente = await identity.correoPendiente(actor.userId)
  const TARJETA = 'flex flex-col gap-4 rounded-[16px] border border-line-panel bg-tarjeta p-6'

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader meta={t('Tus datos, tus avisos y dónde tienes la sesión abierta.', 'Your details, your notifications and where you are signed in.')} title={t('Mi cuenta', 'My account')} />

      <div className="grid items-start gap-5 min-[900px]:grid-cols-2">
        <section aria-labelledby="tus-datos" className={TARJETA}>
          <h2 className="font-display text-[24px] font-medium" id="tus-datos">
            {t('Tus datos', 'Your details')}
          </h2>
          <MisDatos
            ayudaCorreo={t('Con él entras al panel y te llegan los códigos.', 'You sign in with it and your codes arrive there.')}
            correo={actor.email}
            correoPendiente={correoPendiente}
            nombre={datos.nombre}
            telefono={datos.telefono}
          />
          <p className="text-[13px] text-ink-mute">{t('Entras como', 'Signed in as')} {ROL(t)[actor.role]}.</p>
        </section>

        <section aria-labelledby="donde" className={TARJETA}>
          <h2 className="font-display text-[24px] font-medium" id="donde">
            {t('Dónde está abierta', 'Where you are signed in')}
          </h2>
          <SesionesAbiertas sesiones={sesiones} />
        </section>
      </div>


      {actor.role === 'puerta' ? null : (
        <section aria-labelledby="avisos-t" className={`${TARJETA} scroll-mt-24`} id="avisos">
          <h2 className="font-display text-[24px] font-medium" id="avisos-t">
            {t('Avisos', 'Notifications')}
          </h2>
          <p className="max-w-[68ch] text-[14px] text-ink-mute">
            {t('Te avisamos en la campana y, si los activas, en tu celular o computadora aunque no tengas el panel abierto. En iPhone, con el panel instalado en la pantalla de inicio.', 'We notify you in the bell and, if you turn them on, on your phone or computer even when the panel is closed. On iPhone, with the panel added to the home screen.')}
          </p>
          <ActivarAvisos clavePublica={avisos.clavePublica} />
          <PreferenciasDeAvisos silenciados={await avisos.silenciados(actor.userId)} tipos={TIPOS_DE_AVISO_EXPLICADOS.filter((x) => x.soloAdmin === (actor.role === 'admin')).map((x) => ({ ...x, titulo: traducir(x.titulo, t), ayuda: traducir(x.ayuda, t) }))} />
        </section>
      )}

      {conLuxury ? (
        <section aria-labelledby="siri-t" className={`${TARJETA} scroll-mt-24`} id="siri">
          <h2 className="font-display text-[24px] font-medium" id="siri-t">
            {t('Luxury con Siri', 'Luxury with Siri')}
          </h2>
          <p className="max-w-[68ch] text-[14px] text-ink-mute">{t('Háblale a Luxury sin abrir el panel: «Oye Siri, Luxury», y te responde en voz alta. En iPhone, con la app Atajos.', 'Talk to Luxury without opening the panel: “Hey Siri, Luxury”, and it answers out loud. On iPhone, with the Shortcuts app.')}</p>
          <LuxuryConSiri atajo={(await asistente.config()).atajoDeSiri} url={`${env.SITE_URL.replace(/\/$/, '')}/dashboard/luxury/siri`} />
        </section>
      ) : null}
    </div>
  )
}
