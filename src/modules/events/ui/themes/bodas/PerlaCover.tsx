'use client'

import Image from 'next/image'
import { useState } from 'react'
import { PALETA as P } from './boda-perla.palette'

type Props = {
  readonly bgAsset: string
  /** «Nuestra Boda». */
  readonly eyebrow: string
  /** Las iniciales grandes, juntas: «EG». */
  readonly initials: string
  /** Los nombres sin «&», como los escribe la maqueta: «Emma Gael». */
  readonly names: string
  /** La fecha en palabras: «20 DE SEPTIEMBRE DE 2026». */
  readonly fecha: string
  /** «Ingresa a nuestra invitación», del diccionario. */
  readonly cta: string
  readonly openLabel: string
}

/**
 * La portada de «Marco Perlado»: el marco de flores blancas y perlas, con el texto dentro.
 *
 * Es el `IntroCover style="ovalFrame"` de su maqueta con `textPalette` y sin aros: el bloque
 * del 13 % al 85 %, el rótulo en Cormorant café, las iniciales en Playfair oliva espaciadas,
 * los nombres en cursiva café, el filete de rombo y la fecha en Montserrat oliva; abajo, la
 * llamada a entrar en DM Sans con su flecha que rebota.
 */
export function PerlaCover({ bgAsset, eyebrow, initials, names, fecha, cta, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      onClick={() => setAbierta(true)}
      className="theme-quieto-si-reduce"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        width: '100%',
        overflow: 'hidden',
        background: P.marfil,
        animation: 'theme-introFade 800ms ease',
      }}
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
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 17, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: P.cafe }}>
          {eyebrow}
        </span>
        {initials === '' ? null : (
          <span
            style={{ fontFamily: 'var(--font-playfair-display)', fontWeight: 700, fontSize: 64, lineHeight: 1, marginTop: 6, letterSpacing: '0.15em', color: P.oliva }}
          >
            {initials}
          </span>
        )}
        <span
          style={{
            fontFamily: 'var(--font-playfair-display)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 32,
            lineHeight: 1.1,
            marginTop: 6,
            maxWidth: '82%',
            color: P.cafe,
            textShadow: '1px 1px 3px rgba(184,134,11,0.3)',
          }}
        >
          {names}
        </span>
        <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 90, margin: '6px 0' }}>
          <span style={{ display: 'block', flex: 1, height: 1, background: P.oliva }} />
          <span style={{ display: 'block', width: 6, height: 6, background: P.oliva, transform: 'rotate(45deg)' }} />
          <span style={{ display: 'block', flex: 1, height: 1, background: P.oliva }} />
        </span>
        {fecha === '' ? null : (
          <span style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300, fontSize: 11, letterSpacing: '0.25em', color: P.oliva }}>{fecha}</span>
        )}
      </span>

      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', color: P.oliva, textShadow: '0 1px 3px rgba(255,255,255,0.5)' }}>
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
        <span
          aria-hidden
          className="theme-quieto-si-reduce"
          style={{ display: 'block', marginTop: 8, fontSize: 17, animation: 'theme-bounceDown 1.4s ease-in-out infinite' }}
        >
          ↓
        </span>
      </span>
    </button>
  )
}
