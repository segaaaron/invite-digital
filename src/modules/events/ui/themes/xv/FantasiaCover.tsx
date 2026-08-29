'use client'

import Image from 'next/image'
import { CoverShell } from './CoverShell'

type Props = {
  readonly bgAsset: string
  /** La tiara, arriba. */
  readonly tiaraAsset: string
  /** El sobre con la corona: el nombre va escrito **encima**, a su altura. */
  readonly envelopeAsset: string
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
 * La portada de «Noche Estrellada»: tiara, «XV AÑOS» y el sobre con el nombre escrito
 * sobre él.
 *
 * El nombre no va debajo del sobre sino **dentro**, al 84 % de su altura: es donde la
 * ilustración deja el hueco claro. Colocarlo debajo deja el sobre con un vacío en medio y
 * el nombre descolgado.
 */
export function FantasiaCover({
  bgAsset,
  tiaraAsset,
  envelopeAsset,
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
      openLabel={openLabel}
      veils={[
        'rgba(10,20,45,.42)',
        'linear-gradient(180deg, rgba(10,20,45,.55) 0%, transparent 45%)',
        `linear-gradient(180deg, transparent 82%, ${bg} 100%)`,
      ]}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          alt=""
          aria-hidden
          height={150}
          src={tiaraAsset}
          style={{ width: 150, height: 'auto', marginBottom: 4, filter: 'drop-shadow(0 4px 14px rgba(0,0,0,.5))' }}
          width={150}
        />

        <span
          style={{
            fontFamily: 'var(--font-italiana)',
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: accent,
            marginTop: 18,
            textShadow: SOMBRA,
          }}
        >
          {title}
        </span>

        <span style={{ position: 'relative', display: 'block', width: '92%', margin: '20px 0' }}>
          <Image
            alt=""
            aria-hidden
            height={480}
            src={envelopeAsset}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            width={480}
          />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '84%',
              transform: 'translate(-50%,-50%)',
              fontFamily: 'var(--font-great-vibes)',
              fontSize: 58,
              color: textColor,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textShadow: '0 2px 10px rgba(0,0,0,.8)',
            }}
          >
            {name}
          </span>
        </span>

        <span
          style={{
            fontSize: 13,
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
