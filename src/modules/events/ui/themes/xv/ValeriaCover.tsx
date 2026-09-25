'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { CoverShell } from './CoverShell'

type Props = {
  readonly bgAsset: string
  /** La fotografía del evento, cuando la subieron: sustituye a la del modelo. */
  readonly foto?: string | undefined
  /** La tiara, entre el titular y el nombre. */
  readonly tiaraAsset: string
  readonly accent: string
  readonly textColor: string
  readonly bg: string
  /** «XV AÑOS», la copia del propio diseño. */
  readonly title: string
  readonly name: string
  readonly hint: string
  readonly openLabel: string
}

const SOMBRA = '0 2px 10px rgba(0,0,0,.8), 0 0 20px rgba(0,0,0,.6)'

/**
 * La portada de «Gala Real»: el marco guindo con su cenefa, «XV AÑOS», la tiara y el
 * nombre.
 *
 * El contenido va al 18 % por cada lado: el marco de la fotografía ya ocupa los bordes, y
 * a ancho completo el titular se le monta encima.
 */
export function ValeriaCover({
  bgAsset,
  foto,
  tiaraAsset,
  accent,
  textColor,
  bg,
  title,
  name,
  hint,
  openLabel,
}: Props) {
  return (
    <CoverShell
      bg={bg}
      bgAsset={bgAsset}
      foto={foto}
      openLabel={openLabel}
      veils={['rgba(45,10,22,.2)', `linear-gradient(180deg, transparent 88%, ${bg} 100%)`]}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 18%',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-italiana)',
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: accent,
            textShadow: SOMBRA,
          }}
        >
          {title}
        </span>

        <span style={{ display: 'block', width: '78%', margin: '18px 0' }}>
          <Image
            alt=""
            aria-hidden
            height={300}
            src={tiaraAsset}
            style={{ width: '100%', height: 'auto', display: 'block', filter: 'drop-shadow(0 6px 20px rgba(0,0,0,.6))' }}
            width={300}
          />
          <span
            style={{
              display: 'block',
              marginTop: 20,
              fontFamily: 'var(--font-great-vibes)',
              fontSize: 52,
              color: textColor,
              lineHeight: 1,
              textShadow: '0 2px 10px rgba(0,0,0,.8)',
            }}
          >
            {name}
          </span>
        </span>

        <span
          style={{
            fontSize: 12,
            opacity: 0.95,
            letterSpacing: '0.25em',
            fontFamily: 'var(--font-jetbrains-mono)',
            color: accent,
            textShadow: SOMBRA,
          }}
        >
          {hint}
        </span>
      </span>
    </CoverShell>
  )
}
