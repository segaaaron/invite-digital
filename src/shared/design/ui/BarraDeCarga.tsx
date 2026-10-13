'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * La barra fina de arriba que dice «ya va» al pulsar un enlace.
 *
 * En este proyecto **no hay `loading.tsx`**: el `Suspense` que monta rompe el `notFound()` de las
 * páginas que deniegan (salían 200 en vez de 404). Así que la espera se enseña en el cliente: al
 * pulsar un enlace interno a otra dirección aparece la barra, y se va cuando la dirección cambia.
 * Solo escucha clics y la dirección: **no pregunta nada al servidor** y no lleva temporizadores.
 */
export function BarraDeCarga({ esqueleto = false }: { esqueleto?: boolean }) {
  const aqui = `${usePathname()}?${useSearchParams().toString()}`
  // Dónde estábamos al pulsar. La barra se ve mientras sigamos ahí: al llegar la página nueva
  // (o volver atrás) la dirección cambia y se va sola.
  const [desde, setDesde] = useState<string | null>(null)
  /** Si el clic lleva a otra pantalla (no solo a otro `?panel=`): entonces, además, el esqueleto (E42). */
  const [otraPantalla, setOtraPantalla] = useState(false)
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
      setOtraPantalla(destino.pathname !== location.pathname)
      setDesde(`${location.pathname}?${location.search.replace(/^\?/, '')}`)
    }
    // En captura: `<Link>` cancela el clic nativo (navega sin recargar), y escuchando después
    // `defaultPrevented` ya vendría puesto y la barra no saldría nunca.
    document.addEventListener('click', alPulsar, true)
    return () => document.removeEventListener('click', alPulsar, true)
  }, [])

  if (!cargando) return null
  // «Cargando» de la maqueta (E42): el esqueleto de una pantalla sobre el contenido, mientras llega la nueva. La barra
  // y el menú siguen ahí. Va dentro del `<main>` del panel, que es `relative`.
  const main = esqueleto && otraPantalla ? document.querySelector('main') : null
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[2147483647] h-[2.5px]">
        <div className="barra-de-carga h-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
      </div>
      {main === null ? null : createPortal(<Esqueleto />, main)}
    </>
  )
}

function Esqueleto() {
  const bloque = 'rounded-[8px] bg-line-panel/55 motion-safe:animate-pulse'
  return (
    <div aria-busy="true" aria-label="Cargando" className="absolute inset-0 z-20 overflow-hidden bg-bg px-6 pt-10 min-[1280px]:px-12" role="status">
      <div className={`${bloque} h-10 w-[280px] max-w-[70%]`} />
      <div className={`${bloque} mt-3 h-3.5 w-[460px] max-w-[90%]`} />
      <div className="mt-10 grid grid-cols-4 gap-6 max-[767px]:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div className="flex flex-col gap-2.5" key={i}>
            <div className={`${bloque} h-3 w-24`} />
            <div className={`${bloque} h-7 w-36 max-w-full`} />
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="flex items-center gap-4 border-t border-line-panel py-4" key={i}>
            <div className={`${bloque} size-9 shrink-0 rounded-full`} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`${bloque} h-3 w-[40%]`} />
              <div className={`${bloque} h-2.5 w-[25%]`} />
            </div>
            <div className={`${bloque} h-6 w-20 rounded-full max-[559px]:hidden`} />
            <div className={`${bloque} h-9 w-24 max-[559px]:hidden`} />
          </div>
        ))}
      </div>
    </div>
  )
}
