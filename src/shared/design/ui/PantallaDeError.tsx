'use client'

import { useEffect } from 'react'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * **La pantalla de cuando algo falla**, la misma en todo el sitio (29 de septiembre): nunca la genérica de Next
 * («This page couldn't load», en inglés y sin salida). Dice qué pasó con calma, deja reintentar, ofrece una
 * salida y anota el fallo en el registro con su código (el detalle real lo guarda el servidor).
 */
export function PantallaDeError({
  error,
  reset,
  titulo,
  texto,
  reintentar,
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
  const t = useT()
  useEffect(() => {
    const cuerpo = JSON.stringify({ mensaje: `Pantalla de error${error.digest ? ` · ${error.digest}` : ''}: ${error.message}`, pila: error.stack, ruta: location.pathname })
    void fetch('/api/fallos', { method: 'POST', body: cuerpo, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined)
  }, [error])

  return (
    // La maqueta (E41): el aviso en su medallón rojo, el título en Bodoni, qué pasó y las dos salidas.
    <div className="mx-auto flex max-w-[600px] flex-col items-center gap-4 px-6 pt-16 pb-16 text-center">
      <span aria-hidden className="relative mb-2 grid size-[84px] place-items-center rounded-full bg-danger/12 text-danger">
        <span className="absolute inset-[-8px] rounded-full bg-danger/6" />
        <svg className="relative size-9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 24 24">
          <path d="M12 4 2.8 19.5h18.4L12 4Z" />
          <path d="M12 10v4.5M12 17.2v.1" />
        </svg>
      </span>
      <h1 className="font-display text-[38px] leading-tight font-medium text-ink max-[559px]:text-[30px]">{titulo ?? t('Algo no salió bien', 'Something went wrong')}</h1>
      <p className="text-[15.5px] leading-[1.6] text-ink-soft">{texto ?? t('No se pudo terminar de cargar. Ya quedó anotado para revisarlo. Vuelve a intentarlo; lo que ya estaba guardado no se perdió.', 'It couldn’t finish loading. We’ve logged it to look into. Try again; anything already saved was not lost.')}</p>
      {error.digest ? <p className="text-[12px] text-ink-mute">{t('Código', 'Code')} {error.digest}</p> : null}
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        {salida === undefined ? null : (
          // Un enlace de verdad y no `<Link>`: si la página falló, lo sano es cargar la siguiente desde cero.
          <a className="inline-flex min-h-11 items-center rounded-[10px] border border-line-panel-strong bg-bg-raised px-4.5 text-[14.5px] font-medium text-ink no-underline hover:border-gold" href={salida.href}>
            {salida.rotulo}
          </a>
        )}
        <button className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-shell-deep px-4.5 text-[14.5px] font-medium text-shell-ink hover:bg-sage" onClick={reset} type="button">
          {reintentar ?? t('Volver a intentar', 'Try again')}
        </button>
      </div>
    </div>
  )
}
