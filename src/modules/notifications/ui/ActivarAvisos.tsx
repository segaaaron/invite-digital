'use client'

import { useEffect, useState, useTransition } from 'react'
import { activarAparatoAction, desactivarAparatoAction, probarAvisosAction } from '@/app/_acciones/notifications/avisos-actions'
import { BellIcon } from '@/shared/design/ui/icons'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'

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
        if (!r.ok) setNota('No pudimos guardar este aparato. Vuelve a intentarlo.')
      } catch {
        setNota('Este navegador no dejó activar los avisos. Prueba de nuevo o con otro navegador.')
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
      setNota(r.entregados > 0 ? 'Te mandamos un aviso de prueba: debería llegarte en unos segundos.' : 'No pudimos entregarlo. Desactiva y vuelve a activar los avisos en este aparato.')
    })

  if (estado === 'mirando' || estado === 'apagadas') return null

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-white/80 p-4" aria-live="polite">
      <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
        <BellIcon className="size-4" /> Avisos en este aparato
      </p>
      {estado === 'instalar-en-iphone' ? (
        <div className="text-[12.5px] leading-[1.6] text-ink-soft">
          <p>En iPhone y iPad los avisos llegan con el panel instalado (iOS 16.4 o más):</p>
          <ol className="mt-1.5 list-decimal pl-5">
            <li>Abre este panel en Safari y toca Compartir.</li>
            <li>Elige «Añadir a pantalla de inicio».</li>
            <li>Abre Luxury Atelier desde ese icono y activa los avisos aquí.</li>
          </ol>
        </div>
      ) : estado === 'sin-soporte' ? (
        <p className="text-[12.5px] leading-[1.6] text-ink-soft">Este navegador no admite avisos. En Android usa Chrome; en computadora, Chrome, Edge, Firefox o Safari.</p>
      ) : estado === 'bloqueadas' ? (
        <p className="text-[12.5px] leading-[1.6] text-ink-soft">
          Los avisos están bloqueados para este sitio. Actívalos en los ajustes del navegador (el candado junto a la dirección, o Ajustes › Notificaciones en el teléfono) y vuelve aquí.
        </p>
      ) : estado === 'activas' ? (
        <>
          <p className="text-[12.5px] text-ink-soft">Activados: te avisamos de confirmaciones, mensajes y lo que vence, aunque no tengas el panel abierto.</p>
          <div className="flex flex-wrap gap-2">
            <PanelButton disabled={ocupado} onClick={probar}>
              Enviar un aviso de prueba
            </PanelButton>
            <PanelButton disabled={ocupado} onClick={desactivar}>
              Desactivar
            </PanelButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12.5px] text-ink-soft">Recibe en tu celular o computadora cuando alguien confirma, te escribe o vence algo, aunque no tengas el panel abierto.</p>
          <div>
            <PanelButton disabled={ocupado} onClick={activar} variant="primary">
              {ocupado ? 'Activando…' : 'Activar avisos'}
            </PanelButton>
          </div>
        </>
      )}
      {nota === null ? null : <p className="text-[12px] text-ink-mute">{nota}</p>}
    </div>
  )
}
