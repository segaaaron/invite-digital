'use client'

import Image from 'next/image'
import { useState } from 'react'
import { PALETA as P } from './boda-glamour.palette'

type Props = {
  readonly bgAsset: string
  /** Los aros, debajo del filete. */
  readonly ringsAsset: string
  /** «Nuestra Boda». */
  readonly eyebrow: string
  readonly names: string
  /** «Toca para abrir», del diccionario. */
  readonly cta: string
  readonly openLabel: string
}

/**
 * La portada de «Glamour»: el marco guinda con flores, y dentro el rótulo, los nombres en
 * Playfair cursiva muy grandes, el filete de rombo en rosa viejo y los aros.
 *
 * Es el `IntroCover style="ovalFrame"` de su maqueta con `textPalette`, sin iniciales ni
 * fecha, `nameSizeBoost: 1.8`, `textGap: 12`, los aros debajo al 13 % y la llamada a 110 px
 * del pie. Sin fundido de entrada: esa rama de la maqueta no lo tiene.
 */
export function GlamourCover({ bgAsset, ringsAsset, eyebrow, names, cta, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      onClick={() => setAbierta(true)}
      style={{ position: 'fixed', inset: 0, zIndex: 50, cursor: 'pointer', border: 'none', padding: 0, width: '100%', overflow: 'hidden', background: P.guinda }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '13%',
          height: '72%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 17, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: P.blancoCalido }}>
          {eyebrow}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-playfair-display)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 57.6,
            lineHeight: 1.1,
            marginTop: 12,
            maxWidth: '82%',
            color: '#ffffff',
            textShadow: '0 0 12px rgba(255,200,170,0.3)',
          }}
        >
          {names}
        </span>
        <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 90, margin: '12px 0' }}>
          <span style={{ display: 'block', flex: 1, height: 1, background: P.rosa }} />
          <span style={{ display: 'block', width: 6, height: 6, background: P.rosa, transform: 'rotate(45deg)' }} />
          <span style={{ display: 'block', flex: 1, height: 1, background: P.rosa }} />
        </span>
        <span style={{ position: 'relative', display: 'block', width: '13%', marginTop: 10, opacity: 0.8 }}>
          <Image alt="" aria-hidden height={100} sizes="80px" src={ringsAsset} style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.25))' }} width={100} />
        </span>
      </span>

      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 110, textAlign: 'center', color: P.rosa, textShadow: '0 1px 3px rgba(255,255,255,0.5)' }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-dm-sans)',
            fontWeight: 600,
            fontSize: 10.3,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {cta}
        </span>
        <span aria-hidden className="theme-quieto-si-reduce" style={{ display: 'block', marginTop: 8, fontSize: 17, animation: 'theme-bounceDown 1.4s ease-in-out infinite' }}>
          ↓
        </span>
      </span>
    </button>
  )
}
