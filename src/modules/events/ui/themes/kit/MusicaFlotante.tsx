'use client'

import { useState } from 'react'
import { prefiereMenosMovimiento } from './motion'
import { useCancion } from './MusicPlayer'

/**
 * La canción de los diseños que **no pintan reproductor** (Editorial, Civil, Destino): un botón
 * redondo con una nota musical, abajo a la derecha, que pausa y reanuda. Suena igual que el
 * reproductor (`useCancion`: al abrir o con el primer toque).
 *
 * **Capa `sticky`, no `fixed`**, como `CapaFija`: el marco de teléfono (escritorio, tablet, vista
 * previa) lleva `translateZ(0)` y dentro de él un `fixed` se desplazaba con el contenido —al bajar,
 * el botón se iba—. Por eso va como **primera hija del `<article>`**: una capa del alto de la
 * pantalla pegada arriba, sin ocupar sitio y sin recibir toques, con el botón en su esquina.
 * Va por debajo de las portadas (`zIndex` 40 < 50). Sin archivo no se pinta.
 */
export function MusicaFlotante({ audioSrc, track, artist }: { readonly audioSrc: string | undefined; readonly track?: string | undefined; readonly artist?: string | undefined }) {
  const { sonando, alternar, boton, audioProps } = useCancion(audioSrc, false)
  const [reducido] = useState(prefiereMenosMovimiento)
  if (audioSrc === undefined || audioSrc === '') return null
  const cancion = [track, artist].filter((t) => t !== undefined && t !== '').join(' · ') || 'la música'

  return (
    <>
      <audio {...audioProps} src={audioSrc} />
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: 'var(--alto, 100dvh)',
          marginBottom: 'calc(var(--alto, 100dvh) * -1)',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      >
      <button
        aria-label={sonando ? `Pausar ${cancion}` : `Reproducir ${cancion}`}
        aria-pressed={sonando}
        onClick={alternar}
        ref={boton}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'auto',
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          background: 'rgba(20, 20, 20, 0.62)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.28)',
          color: 'rgba(255, 255, 255, 0.95)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          opacity: sonando ? 1 : 0.8,
        }}
        title={sonando ? 'Pausar la música' : 'Reproducir la música'}
        type="button"
      >
        {/* El latido va en un halo detrás, no en el botón: el blanco del toque no se mueve. */}
        {sonando && !reducido ? (
          <span
            aria-hidden
            style={{ position: 'absolute', inset: -1, borderRadius: '50%', border: '1px solid rgba(255, 255, 255, 0.5)', animation: 'theme-latido 2.4s ease-out infinite', pointerEvents: 'none' }}
          />
        ) : null}
        <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="20">
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
          {/* En pausa, la nota tachada: se ve de un vistazo que está callada. */}
          {sonando ? null : <path d="M3 3l18 18" />}
        </svg>
      </button>
      </div>
    </>
  )
}
