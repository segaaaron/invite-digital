'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly bgAsset: string
  /** El oro del rótulo y los filetes, de la paleta del diseño. */
  readonly accent: string
  readonly bg: string
  /** «Nuestra boda», el rótulo de arriba. */
  readonly eyebrow: string
  /** Los nombres de la pareja, en una línea. */
  readonly names: string
  /** La fecha en palabras: «12 DE DICIEMBRE DE 2026». */
  readonly fecha: string
  /** «Ingresa a nuestra invitación», del diccionario. */
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Cinemática»: la fotografía negra y dorada de su maqueta
 * (`wedding-variants-9.jsx`, `WeddingCinematic`).
 *
 * Nuestro port abría con el **telón dibujado** del kit —«Algo inolvidable»—, que es el que
 * la maqueta usa cuando un diseño no trae fotografía. Este sí la trae: el arte a sangre y,
 * encima, el rótulo, los nombres en caligrafía, el filete de rombo, la fecha y la llamada a
 * entrar, todo dentro del hueco que el arte deja libre (15 % a 72 % de ancho, 37 % a 78 %
 * de alto), que es como lo encuadra la maqueta.
 */
export function CinematicaCover({ bgAsset, accent, bg, eyebrow, names, fecha, hint, openLabel }: Props) {
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
        background: bg,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span
        style={{
          position: 'absolute',
          left: '15%',
          right: '28%',
          top: '37%',
          bottom: '22%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '34px 10px',
          textAlign: 'center',
          color: accent,
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, letterSpacing: '0.35em', whiteSpace: 'nowrap' }}>
            {eyebrow}
          </span>
          <span aria-hidden style={{ display: 'block', width: 46, height: 1, background: accent }} />
          <span style={{ fontFamily: 'var(--font-great-vibes)', fontSize: 32, lineHeight: 1.15, whiteSpace: 'nowrap' }}>{names}</span>
          <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 90 }}>
            <span style={{ display: 'block', flex: 1, height: 1, background: accent }} />
            <span style={{ display: 'block', width: 6, height: 6, background: accent, transform: 'rotate(45deg)' }} />
            <span style={{ display: 'block', flex: 1, height: 1, background: accent }} />
          </span>
          {fecha === '' ? null : (
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9.5, letterSpacing: '0.22em', whiteSpace: 'nowrap' }}>{fecha}</span>
          )}
        </span>

        <span style={{ width: '100%' }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 8.5, letterSpacing: '0.22em', whiteSpace: 'nowrap' }}>
            {hint}
          </span>
          <span aria-hidden style={{ display: 'block', marginTop: 8, fontSize: 14 }}>
            ↓
          </span>
        </span>
      </span>
    </button>
  )
}
