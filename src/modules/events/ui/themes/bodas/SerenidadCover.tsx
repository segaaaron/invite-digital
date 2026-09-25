'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { PALETA as P } from './boda-serenidad.palette'

type Props = {
  readonly bgAsset: string
  /** «ISSUE · 09 / 2026», el rótulo de portada de las Editorial. */
  readonly eyebrow: string
  readonly names: string
  /** La fecha en palabras: «20 DE SEPTIEMBRE DE 2026». */
  readonly fecha: string
  /** «Ingresa a nuestra invitación», del diccionario. */
  readonly cta: string
  readonly openLabel: string
}

/** Las diez motas doradas que suben por la portada: el `deluxe` de la maqueta. */
const MOTAS = Array.from({ length: 10 }, (_, i) => ({ izquierda: i * 10 + 5, duracion: 8 + (i % 3) * 2, retraso: i * 0.8 }))

/**
 * La portada de «Jardín de Serenidad»: la caída de flores azules con el texto centrado.
 *
 * Es el `IntroCover` de marco ovalado de su maqueta (`style="ovalFrame"`, `deluxe`,
 * `textPalette`, `topOffset: 46%`): la fotografía a sangre, las motas de oro subiendo, y en
 * el bloque centrado el rótulo en Cormorant, los nombres en Playfair cursiva, el filete de
 * rombo, la fecha y, abajo del todo, la llamada a entrar con su flecha que rebota.
 */
export function SerenidadCover({ bgAsset, eyebrow, names, fecha, cta, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      onClick={() => setAbierta(true)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        width: '100%',
        overflow: 'hidden',
        background: P.cielo,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      {reducido ? null : (
        <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {MOTAS.map((mota) => (
            <span
              key={mota.izquierda}
              style={{
                position: 'absolute',
                left: `${mota.izquierda}%`,
                bottom: -10,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#f0d98a',
                opacity: 0.5,
                boxShadow: '0 0 4px #f0d98a',
                animation: `theme-floatUp ${mota.duracion}s linear ${mota.retraso}s infinite`,
              }}
            />
          ))}
        </span>
      )}

      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '46%',
          height: '40%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: P.marino,
        }}
      >
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18.7, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          {eyebrow}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-playfair-display)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 42,
            lineHeight: 1.1,
            maxWidth: '82%',
            textShadow: '1px 1px 3px rgba(184,134,11,0.3)',
          }}
        >
          {names}
        </span>
        <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 90, margin: '6px 0' }}>
          <span style={{ display: 'block', flex: 1, height: 1, background: P.marino }} />
          <span style={{ display: 'block', width: 6, height: 6, background: P.marino, transform: 'rotate(45deg)' }} />
          <span style={{ display: 'block', flex: 1, height: 1, background: P.marino }} />
        </span>
        {fecha === '' ? null : (
          <span style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 300, fontSize: 12.1, letterSpacing: '0.25em' }}>{fecha}</span>
        )}
      </span>

      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', color: P.marino }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-cormorant)', fontWeight: 500, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {cta}
        </span>
        <span
          aria-hidden
          style={{ display: 'block', marginTop: 10, fontSize: 18, animation: reducido ? undefined : 'theme-bounceDown 1.4s ease-in-out infinite' }}
        >
          ↓
        </span>
      </span>
    </button>
  )
}
