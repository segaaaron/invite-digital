'use client'

import { useState } from 'react'
import { prefiereMenosMovimiento } from './motion'

type Props = {
  readonly accent: string
  readonly track: string
  readonly artist: string
  /** El rótulo sobre el título. Del diccionario: la invitación va en el idioma del evento. */
  readonly eyebrow: string
  readonly textColor?: string
  readonly playBg?: string
  readonly playIconColor: string
  readonly trackColor?: string
  readonly artistColor?: string
}

/**
 * La canción del evento, con su ecualizador.
 *
 * **No suena, y es a propósito.** Servir audio propio es su propio problema —almacén,
 * formato, licencia de la grabación— y no entra en esta rebanada. La maqueta tampoco
 * sonaba. Lo que hace el botón es lo que hace en el diseño: mover las barras.
 *
 * No lleva `<audio>` ni autoplay. Una invitación que empieza a sonar sola al abrirse en
 * una oficina o en un velatorio es la razón por la que los navegadores lo bloquean.
 */
export function MusicPlayer({
  accent,
  track,
  artist,
  eyebrow,
  textColor = 'currentColor',
  playBg,
  playIconColor,
  trackColor,
  artistColor,
}: Props) {
  const [sonando, setSonando] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        border: `1px solid ${accent}40`,
        borderRadius: 999,
        background: `${accent}08`,
        color: textColor,
      }}
    >
      <button
        aria-pressed={sonando}
        onClick={() => setSonando((anterior) => !anterior)}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: playBg ?? accent,
          color: playIconColor,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
        }}
        type="button"
      >
        <span aria-hidden>{sonando ? '❚❚' : '▶'}</span>
        <span className="sr-only">{track}</span>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, letterSpacing: '0.3em', color: accent, opacity: 0.95 }}>
          {eyebrow}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: trackColor ?? 'inherit',
          }}
        >
          {track}
        </div>
        <div style={{ fontSize: 10, opacity: artistColor === undefined ? 0.85 : 1, color: artistColor ?? 'inherit' }}>
          {artist}
        </div>
      </div>

      <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
        {[0, 1, 2, 3].map((barra) => (
          <div
            key={barra}
            style={{
              width: 2,
              background: accent,
              borderRadius: 1,
              height: sonando && !reducido ? '100%' : `${30 - barra * 6}%`,
              animation: sonando && !reducido ? `theme-eq 0.8s ease-in-out ${barra * 0.15}s infinite` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}
