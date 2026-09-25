'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { CoverShell } from './CoverShell'

type Props = {
  readonly bgAsset: string
  /** La fotografía del evento, cuando la subieron: sustituye a la del modelo. */
  readonly foto?: string | undefined
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
 * La portada de «Noche Estrellada»: «XV AÑOS» y el sobre con el nombre escrito
 * sobre él.
 *
 * El nombre no va debajo del sobre sino **dentro**, al 84 % de su altura: es donde la
 * ilustración deja el hueco claro. Colocarlo debajo deja el sobre con un vacío en medio y
 * el nombre descolgado.
 */
export function FantasiaCover({
  bgAsset,
  foto,
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
      foto={foto}
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
          // V3: sin la tiara de arriba y con los tres bloques a 36 px.
          gap: 36,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-italiana)',
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: accent,
            textShadow: SOMBRA,
          }}
        >
          {title}
        </span>

        <span style={{ position: 'relative', display: 'block', width: '92%' }}>
          <Image
            alt=""
            aria-hidden
            height={480}
            src={envelopeAsset}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            width={480}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '84%',
              width: 'calc(100% + 80px)',
              height: 138,
              transform: 'translate(-50%,-50%)',
              background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10,18,38,.55) 0%, transparent 75%)',
            }}
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
