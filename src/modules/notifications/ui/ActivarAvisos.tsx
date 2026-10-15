'use client'

import { useEffect, useState, useTransition } from 'react'
import { activarAparatoAction, desactivarAparatoAction, probarAvisosAction } from '@/app/_acciones/notifications/avisos-actions'
import { BellIcon } from '@/shared/design/ui/icons'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { useT } from '@/shared/i18n/idioma-navegador'

type Estado = 'mirando' | 'apagadas' | 'sin-soporte' | 'instalar-en-iphone' | 'bloqueadas' | 'inactivas' | 'activas'

/** La clave pública VAPID (base64url) como la pide `pushManager.subscribe`. */
function claveComoBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4)
  const crudo = atob((base64url + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length))
  for (let i = 0; i < crudo.length; i += 1) bytes[i] = crudo.charCodeAt(i)
  return bytes
}

const esIphone = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const instalado = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * **Activar los avisos en este aparato.** Las notificaciones push web llegan a Android y a las
 * computadoras desde el navegador; en **iPhone y iPad solo con el panel instalado** en la pantalla de
 * inicio (iOS 16.4 o más): en una pestaña de Safari la API ni existe. El permiso se pide con este botón,
 * nunca al entrar: un permiso pedido de golpe se rechaza y no se puede volver a pedir.
 */
export function ActivarAvisos({ clavePublica }: { clavePublica: string | null }) {
  const t = useT()
  const [estado, setEstado] = useState<Estado>('mirando')
  const [nota, setNota] = useState<string | null>(null)
  const [ocupado, empezar] = useTransition()

  useEffect(() => {
    void (async () => {
      if (clavePublica === null) return setEstado('apagadas')
      if (esIphone() && !instalado()) return setEstado('instalar-en-iphone')
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setEstado('sin-soporte')
      if (Notification.permission === 'denied') return setEstado('bloqueadas')
      const registro = await navigator.serviceWorker.getRegistration()
      const sub = registro ? await registro.pushManager.getSubscription() : null
      if (sub !== null && Notification.permission === 'granted') {
        // Se vuelve a guardar en cada visita: si el servidor la olvidó (410) o cambió la cuenta, se cura sola.
        await activarAparatoAction(sub.toJSON())
        return setEstado('activas')
      }
      setEstado('inactivas')
    })()
  }, [clavePublica])

  const activar = () =>
    empezar(async () => {
      setNota(null)
      if (clavePublica === null) return
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setEstado(permiso === 'denied' ? 'bloqueadas' : 'inactivas')
        return
      }
      try {
        const registro = await navigator.serviceWorker.ready
        const sub = (await registro.pushManager.getSubscription()) ?? (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveComoBytes(clavePublica) }))
        const r = await activarAparatoAction(sub.toJSON())
        setEstado(r.ok ? 'activas' : 'inactivas')
        if (!r.ok) setNota(t('No pudimos guardar este aparato. Vuelve a intentarlo.', 'We could not save this device. Please try again.'))
      } catch {
        setNota(t('Este navegador no dejó activar los avisos. Prueba de nuevo o con otro navegador.', 'This browser did not allow notifications. Try again or use another browser.'))
      }
    })

  const desactivar = () =>
    empezar(async () => {
      const registro = await navigator.serviceWorker.getRegistration()
      const sub = registro ? await registro.pushManager.getSubscription() : null
      if (sub !== null) {
        await desactivarAparatoAction(sub.endpoint)
        await sub.unsubscribe()
      }
      setEstado('inactivas')
      setNota(null)
    })

  const probar = () =>
    empezar(async () => {
      const r = await probarAvisosAction()
      setNota(r.entregados > 0 ? t('Te mandamos un aviso de prueba: debería llegarte en unos segundos.', 'We sent you a test notification: it should arrive in a few seconds.') : t('No pudimos entregarlo. Desactiva y vuelve a activar los avisos en este aparato.', 'We could not deliver it. Turn notifications off and on again on this device.'))
    })

  if (estado === 'mirando' || estado === 'apagadas') return null

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-white/80 p-4" aria-live="polite">
      <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
        <BellIcon className="size-4" /> {t('Avisos en este aparato', 'Notifications on this device')}
      </p>
      {estado === 'instalar-en-iphone' ? (
        <div className="text-[12.5px] leading-[1.6] text-ink-soft">
          <p>{t('En iPhone y iPad los avisos llegan con el panel instalado (iOS 16.4 o más):', 'On iPhone and iPad, notifications arrive with the panel installed (iOS 16.4 or later):')}</p>
          <ol className="mt-1.5 list-decimal pl-5">
            <li>{t('Abre este panel en Safari y toca Compartir.', 'Open this panel in Safari and tap Share.')}</li>
            <li>{t('Elige «Añadir a pantalla de inicio».', 'Choose “Add to Home Screen”.')}</li>
            <li>{t('Abre Luxury Atelier desde ese icono y activa los avisos aquí.', 'Open Luxury Atelier from that icon and turn on notifications here.')}</li>
          </ol>
        </div>
      ) : estado === 'sin-soporte' ? (
        <p className="text-[12.5px] leading-[1.6] text-ink-soft">{t('Este navegador no admite avisos. En Android usa Chrome; en computadora, Chrome, Edge, Firefox o Safari.', 'This browser does not support notifications. On Android use Chrome; on a computer, Chrome, Edge, Firefox or Safari.')}</p>
      ) : estado === 'bloqueadas' ? (
        <p className="text-[12.5px] leading-[1.6] text-ink-soft">
          {t('Los avisos están bloqueados para este sitio. Actívalos en los ajustes del navegador (el candado junto a la dirección, o Ajustes › Notificaciones en el teléfono) y vuelve aquí.', 'Notifications are blocked for this site. Turn them on in your browser settings (the padlock next to the address, or Settings › Notifications on your phone) and come back.')}
        </p>
      ) : estado === 'activas' ? (
        <>
          <p className="text-[12.5px] text-ink-soft">{t('Activados: te avisamos de confirmaciones, mensajes y lo que vence, aunque no tengas el panel abierto.', 'On: we notify you of RSVPs, messages and deadlines, even with the panel closed.')}</p>
          <div className="flex flex-wrap gap-2">
            <PanelButton disabled={ocupado} onClick={probar}>
              {t('Enviar un aviso de prueba', 'Send a test notification')}
            </PanelButton>
            <PanelButton disabled={ocupado} onClick={desactivar}>
              {t('Desactivar', 'Turn off')}
            </PanelButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12.5px] text-ink-soft">{t('Recibe en tu celular o computadora cuando alguien confirma, te escribe o vence algo, aunque no tengas el panel abierto.', 'Get notified on your phone or computer when someone RSVPs, writes to you or something is due, even with the panel closed.')}</p>
          <div>
            <PanelButton disabled={ocupado} onClick={activar} variant="primary">
              {ocupado ? t('Activando…', 'Turning on…') : t('Activar avisos', 'Turn on notifications')}
            </PanelButton>
          </div>
        </>
      )}
      {nota === null ? null : <p className="text-[12px] text-ink-mute">{nota}</p>}
    </div>
  )
}
