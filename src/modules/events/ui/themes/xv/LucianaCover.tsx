'use client'

import Image from 'next/image'
import { CoverShell } from './CoverShell'

type Props = {
  readonly bgAsset: string
  /** La fotografía del evento, cuando la subieron: sustituye a la del modelo. */
  readonly foto?: string | undefined
  /** El faro verde, que en este diseño cierra la portada en vez de presidirla. */
  readonly lanternAsset: string
  readonly accent: string
  readonly textColor: string
  readonly bg: string
  readonly line1: string
  readonly line2: string
  /** «XV AÑOS», la copia del propio diseño. */
  readonly title: string
  readonly name: string
  readonly badge: string
  readonly hint: string
  readonly openLabel: string
}

const SOMBRA = '0 2px 8px rgba(0,0,0,.75)'

/**
 * La portada de «Bosque Encantado»: el bosque a sangre, el convite en dos renglones y el
 * faro abajo del todo.
 *
 * Es hermana de la de «Mascarada» y no la misma: aquí los filetes son dos barras rectas,
 * el titular va en Italiana y la pieza que la remata —el faro— cierra en vez de abrir.
 */
export function LucianaCover({
  bgAsset,
  foto,
  lanternAsset,
  accent,
  textColor,
  bg,
  line1,
  line2,
  title,
  name,
  badge,
  hint,
  openLabel,
}: Props) {
  const barra = (
    <span
      aria-hidden
      style={{ display: 'block', width: 90, height: 2, background: accent, margin: '22px auto', boxShadow: SOMBRA }}
    />
  )

  return (
    <CoverShell bg={bg} bgAsset={bgAsset} foto={foto} openLabel={openLabel} veils={['rgba(10,25,16,.5)']}>
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

        {barra}

        <span
          style={{
            fontFamily: 'var(--font-italiana)',
            fontSize: 42,
            fontWeight: 700,
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

        {barra}

        <span
          style={{
            padding: '10px 20px',
            border: `1.5px solid ${accent}`,
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 10,
            letterSpacing: '0.3em',
            color: accent,
            textShadow: SOMBRA,
          }}
        >
          {badge}
        </span>
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

        <Image
          alt=""
          aria-hidden
          height={130}
          src={lanternAsset}
          style={{ width: 130, height: 'auto', marginTop: 30, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.5))' }}
          width={130}
        />
      </span>
    </CoverShell>
  )
}
