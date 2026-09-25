'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * La barra fina de arriba que dice «ya va» al pulsar un enlace.
 *
 * En este proyecto **no hay `loading.tsx`**: el `Suspense` que monta rompe el `notFound()` de las
 * páginas que deniegan (salían 200 en vez de 404). Así que la espera se enseña en el cliente: al
 * pulsar un enlace interno a otra dirección aparece la barra, y se va cuando la dirección cambia.
 * Solo escucha clics y la dirección: **no pregunta nada al servidor** y no lleva temporizadores.
 */
export function BarraDeCarga() {
  const aqui = `${usePathname()}?${useSearchParams().toString()}`
  // Dónde estábamos al pulsar. La barra se ve mientras sigamos ahí: al llegar la página nueva
  // (o volver atrás) la dirección cambia y se va sola.
  const [desde, setDesde] = useState<string | null>(null)
  // Al cambiar la dirección se olvida el clic, ajustando el estado en el render (el patrón de
  // React para esto): si no, volver atrás a la página de partida la enseñaría otra vez colgada.
  const [ultima, setUltima] = useState(aqui)
  if (ultima !== aqui) {
    setUltima(aqui)
    setDesde(null)
  }
  const cargando = desde === aqui

  useEffect(() => {
    const alPulsar = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const enlace = (e.target as Element | null)?.closest?.('a[href]')
      if (!(enlace instanceof HTMLAnchorElement) || enlace.target === '_blank' || enlace.hasAttribute('download')) return
      const destino = new URL(enlace.href, location.href)
      if (destino.origin !== location.origin) return
      // Mismo sitio o solo un ancla: no hay página nueva que esperar.
      if (destino.pathname === location.pathname && destino.search === location.search) return
      setDesde(`${location.pathname}?${location.search.replace(/^\?/, '')}`)
    }
    // En captura: `<Link>` cancela el clic nativo (navega sin recargar), y escuchando después
    // `defaultPrevented` ya vendría puesto y la barra no saldría nunca.
    document.addEventListener('click', alPulsar, true)
    return () => document.removeEventListener('click', alPulsar, true)
  }, [])

  if (!cargando) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[2147483647] h-[2.5px]">
      <div className="barra-de-carga h-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
    </div>
  )
}
