'use client'

import { useEffect } from 'react'
import { recordInvitationViewAction } from '../actions'

/**
 * Cuenta una visita, una sola vez por pestaña.
 *
 * No pinta nada y no estorba: la página del invitado es lo que la persona vino a ver. El
 * guardo va en `sessionStorage` porque el conteo que interesa es «alguien abrió esto»,
 * no «alguien pulsó atrás y adelante».
 *
 * **La fuente la lee el navegador, no el servidor.** El `Referer` que ve una Server
 * Action es la propia página de la invitación, así que deducirla allí haría que todas
 * las visitas salieran como «otras» y el panel de fuentes quedara inservible sin dar un
 * solo error. Aquí se leen el `utm_source` de la URL y el `document.referrer` de verdad,
 * y un referente del propio sitio se manda como nulo: navegar dentro de la casa no es
 * una fuente de tráfico.
 */
export function ViewBeacon({ token, kind }: { token: string; kind: 'guest' | 'client' }) {
  useEffect(() => {
    const clave = `visita:${kind}:${token}`
    try {
      if (sessionStorage.getItem(clave) !== null) return
      sessionStorage.setItem(clave, '1')
    } catch {
      // Navegación privada con el almacenamiento cerrado: se registra igual, y como
      // mucho se cuenta de más. Perder la visita entera sería peor.
    }
    let utmSource: string | null = null
    let referrer: string | null = null
    try {
      utmSource = new URLSearchParams(window.location.search).get('utm_source')
      const propio = document.referrer !== '' && new URL(document.referrer).origin === window.location.origin
      referrer = document.referrer === '' || propio ? null : document.referrer
    } catch {
      // Un referente que no es una URL válida no es motivo para perder la visita entera.
    }

    void recordInvitationViewAction({ token, kind, utmSource, referrer })
  }, [token, kind])

  return null
}
