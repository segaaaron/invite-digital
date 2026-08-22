'use client'

import { useEffect } from 'react'
import { recordInvitationViewAction } from '../actions'

/**
 * Cuenta una visita, una sola vez por pestaña.
 *
 * No pinta nada y no estorba: la página del invitado es lo que la persona vino a ver. El
 * guardo va en `sessionStorage` porque el conteo que interesa es «alguien abrió esto»,
 * no «alguien pulsó atrás y adelante».
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
    void recordInvitationViewAction({ token, kind })
  }, [token, kind])

  return null
}
