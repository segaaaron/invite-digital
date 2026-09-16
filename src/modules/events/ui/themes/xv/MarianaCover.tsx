'use client'

import { CoverShell } from './CoverShell'

type Props = {
  readonly bgAsset: string
  /** La fotografía del evento, cuando la subieron: sustituye a la del modelo. */
  readonly foto?: string | undefined
  readonly accent: string
  readonly bg: string
  /** El degradado de plata del titular: aquí el color es el material, no un acento. */
  readonly titleGradient: string
  readonly nameColor: string
  /** «XV AÑOS», la copia del propio diseño. */
  readonly title: string
  readonly name: string
  readonly hint: string
  readonly openLabel: string
}

const SOMBRA = '0 2px 10px rgba(0,0,0,.8), 0 0 20px rgba(0,0,0,.6)'

/**
 * La portada de «Encanto Musical»: la pista de baile a sangre y el nombre en la parte baja.
 *
 * **No lleva emblema**, y el texto va abajo a propósito: la fotografía tiene a la
 * quinceañera en el tercio superior, y centrar el titular como en las demás se lo escribe
 * encima de la cara. De ahí el relleno superior del 83 %, que es el de la maqueta.
 *
 * El «XV AÑOS» va en degradado de plata recortado sobre el texto: es el material del
 * diseño —como el oro de los anillos—, no un color de marca.
 */
export function MarianaCover({
  bgAsset,
  foto,
  accent,
  bg,
  titleGradient,
  nameColor,
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
      objectPosition="center 35%"
      openLabel={openLabel}
      veils={['rgba(0,0,0,.2)', `linear-gradient(180deg, transparent 88%, ${bg} 100%)`]}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '83% 18% 7%',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-italiana)',
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '0.15em',
            background: titleGradient,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: SOMBRA,
          }}
        >
          {title}
        </span>

        <span
          style={{
            display: 'block',
            width: '78%',
            margin: '10px 0',
            fontFamily: 'var(--font-great-vibes)',
            fontSize: 52,
            color: nameColor,
            lineHeight: 1,
            textShadow: '0 2px 10px rgba(0,0,0,.8), 0 0 24px rgba(255,255,255,.35)',
          }}
        >
          {name}
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
