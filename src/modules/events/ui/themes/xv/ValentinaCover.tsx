'use client'

import Image from 'next/image'
import { CoverShell } from './CoverShell'

type Props = {
  readonly bgAsset: string
  /** La fotografía del evento, cuando la subieron: sustituye a la del modelo. */
  readonly foto?: string | undefined
  /** La máscara veneciana, arriba del todo. */
  readonly maskAsset: string
  readonly accent: string
  readonly textColor: string
  readonly bg: string
  readonly line1: string
  readonly line2: string
  /** «15 AÑOS», la copia del propio diseño. */
  readonly title: string
  readonly name: string
  readonly hint: string
  readonly openLabel: string
}

const SOMBRA = '0 0 28px rgba(0,0,0,.9), 0 0 12px rgba(0,0,0,.8), 0 2px 4px rgba(0,0,0,.85)'

/** El filete con el lazo del centro, que es de este diseño y no del kit. */
function Filete({ color }: { readonly color: string }) {
  return (
    <span aria-hidden style={{ display: 'flex', justifyContent: 'center', margin: '22px auto' }}>
      <svg height="14" viewBox="0 0 90 14" width="90">
        <path
          d="M2 7 H32 M58 7 H88 M32 7 C38 1, 42 1, 45 7 C48 13, 52 13, 58 7"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      </svg>
    </span>
  )
}

/**
 * La portada de «Mascarada»: la máscara sobre el salón morado, el convite en dos renglones
 * y el nombre entre dos filetes con lazo.
 *
 * El orden es el de la maqueta y no es intercambiable: la máscara preside y por eso va
 * arriba —en «Bosque Encantado», que es la misma familia, el faro va al final—.
 */
export function ValentinaCover({
  bgAsset,
  foto,
  maskAsset,
  accent,
  textColor,
  bg,
  line1,
  line2,
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
      imageFilter="saturate(0.85)"
      openLabel={openLabel}
      veils={['rgba(20,8,35,.58)', 'linear-gradient(180deg, rgba(18,7,32,0) 45%, rgba(18,7,32,.82) 100%)']}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 30px',
        }}
      >
        <Image
          alt=""
          aria-hidden
          height={220}
          src={maskAsset}
          style={{ width: 220, height: 'auto', marginBottom: 30, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.5))' }}
          width={220}
        />

        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: accent,
            textTransform: 'uppercase',
            textShadow: SOMBRA,
          }}
        >
          {line1}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '0.2em',
            color: accent,
            textTransform: 'uppercase',
            marginTop: 4,
            textShadow: SOMBRA,
          }}
        >
          {line2}
        </span>

        <Filete color={accent} />

        <span
          style={{
            fontFamily: 'var(--font-cinzel)',
            fontWeight: 500,
            fontSize: 42,
            letterSpacing: '0.15em',
            color: accent,
            marginTop: 10,
            textShadow: SOMBRA,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-great-vibes)',
            fontSize: 62,
            color: textColor,
            marginTop: 14,
            lineHeight: 1,
            textShadow: SOMBRA,
          }}
        >
          {name}
        </span>

        <Filete color={accent} />

        <span
          style={{
            marginTop: 10,
            fontSize: 10,
            opacity: 0.9,
            letterSpacing: '0.2em',
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
