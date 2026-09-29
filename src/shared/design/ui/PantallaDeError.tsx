'use client'

import { useEffect } from 'react'

/**
 * **La pantalla de cuando algo falla**, la misma en todo el sitio (29 de septiembre): nunca la genérica de Next
 * («This page couldn't load», en inglés y sin salida). Dice qué pasó con calma, deja reintentar, ofrece una
 * salida y anota el fallo en el registro con su código (el detalle real lo guarda el servidor).
 */
export function PantallaDeError({
  error,
  reset,
  titulo = 'Algo no salió bien',
  texto = 'No se pudo terminar de cargar. Ya quedó anotado para revisarlo. Vuelve a intentarlo; lo que ya estaba guardado no se perdió.',
  reintentar = 'Volver a intentar',
  salida,
}: {
  error: Error & { digest?: string }
  reset: () => void
  titulo?: string
  texto?: string
  reintentar?: string
  /** Adónde ir si reintentar no basta. Un enlace normal: recarga desde cero. */
  salida?: { href: string; rotulo: string }
}) {
  useEffect(() => {
    const cuerpo = JSON.stringify({ mensaje: `Pantalla de error${error.digest ? ` · ${error.digest}` : ''}: ${error.message}`, pila: error.stack, ruta: location.pathname })
    void fetch('/api/fallos', { method: 'POST', body: cuerpo, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-[520px] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="font-display text-[28px] font-light text-ink">{titulo}</p>
      <p className="text-[14px] leading-[1.7] text-ink-soft">{texto}</p>
      {error.digest ? <p className="font-mono text-[11px] text-ink-mute">Código {error.digest}</p> : null}
      <div className="flex flex-wrap justify-center gap-2">
        <button className="rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[12px] tracking-[0.12em] text-white uppercase" onClick={reset} type="button">
          {reintentar}
        </button>
        {salida === undefined ? null : (
          // Un enlace de verdad y no `<Link>`: si la página falló, lo sano es cargar la siguiente desde cero.
          <a className="rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-6 py-3 text-[12px] tracking-[0.12em] text-ink uppercase" href={salida.href}>
            {salida.rotulo}
          </a>
        )}
      </div>
    </div>
  )
}
