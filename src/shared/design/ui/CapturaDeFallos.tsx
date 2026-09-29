'use client'

import { useEffect } from 'react'

/**
 * Manda al registro de fallos los errores de JavaScript de esta página (`error` y promesas sin atender).
 * Uno por mensaje y página: un error que se repite en bucle no se manda cien veces. `sendBeacon` para
 * que salga aunque la página se esté cerrando.
 */
export function CapturaDeFallos() {
  useEffect(() => {
    const enviados = new Set<string>()
    const mandar = (mensaje: string, pila: string | undefined) => {
      if (mensaje === '' || enviados.has(mensaje) || enviados.size >= 5) return
      enviados.add(mensaje)
      const cuerpo = JSON.stringify({ mensaje, pila, ruta: location.pathname })
      if (!navigator.sendBeacon?.('/api/fallos', new Blob([cuerpo], { type: 'application/json' }))) {
        void fetch('/api/fallos', { method: 'POST', body: cuerpo, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined)
      }
    }
    const alError = (e: ErrorEvent) => mandar(e.message, e.error instanceof Error ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`)
    const alRechazo = (e: PromiseRejectionEvent) => {
      const razon: unknown = e.reason
      mandar(razon instanceof Error ? razon.message : String(razon), razon instanceof Error ? razon.stack : undefined)
    }
    window.addEventListener('error', alError)
    window.addEventListener('unhandledrejection', alRechazo)
    return () => {
      window.removeEventListener('error', alError)
      window.removeEventListener('unhandledrejection', alRechazo)
    }
  }, [])
  return null
}
