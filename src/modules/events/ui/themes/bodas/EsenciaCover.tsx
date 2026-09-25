'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { PALETA as P } from './esencia.palette'
import { RamaDeOlivo, FileteDeEsencia } from './esencia-ornamentos'

type Props = {
  /** El lino del fondo, con la rama de olivo impresa. */
  readonly bgAsset: string
  /** El retrato redondo del centro: el del cliente si lo subió, y si no el del diseño. */
  readonly retrato: string
  readonly monogram: string | undefined
  readonly eyebrow: string | undefined
  readonly nameA: string | undefined
  readonly nameB: string | undefined
  /** La fecha en palabras: «20 DE DICIEMBRE DE 2027». */
  readonly fecha: string
  /** «Desliza ↓», del diccionario. */
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Esencia»: el lino, el retrato redondo con su aro de oro y los nombres.
 *
 * Es la de su maqueta (`esencia.jsx`): fotografía de fondo a sangre, dos ramas de olivo en
 * las esquinas, el retrato de 130 px con borde dorado, el monograma, el rótulo, los dos
 * nombres en Cormorant con el «&» en cursiva entre ellos, el filete, la fecha, una línea
 * vertical que se desvanece y la llamada a deslizar, que late.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>` como la maqueta: con un div,
 * quien navega con teclado no puede abrirla.
 */
export function EsenciaCover({ bgAsset, retrato, monogram, eyebrow, nameA, nameB, fecha, hint, openLabel }: Props) {
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        cursor: 'pointer',
        border: 'none',
        padding: '48px 32px',
        width: '100%',
        overflow: 'hidden',
        background: P.papel,
        color: P.tinta,
        textAlign: 'center',
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover', zIndex: -1 }} />

      <span aria-hidden style={{ position: 'absolute', top: 30, right: 10 }}>
        <RamaDeOlivo ancho={140} giro={15} opacidad={0.15} />
      </span>
      <span aria-hidden style={{ position: 'absolute', bottom: 10, left: 4 }}>
        <RamaDeOlivo ancho={140} espejo giro={20} opacidad={0.08} />
      </span>

      <span
        style={{
          display: 'block',
          width: 130,
          height: 130,
          borderRadius: '50%',
          padding: 3,
          border: `2px solid ${P.oro}`,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
          <Image alt="" aria-hidden fill sizes="130px" src={retrato} style={{ objectFit: 'cover', objectPosition: 'center top' }} />
        </span>
      </span>

      {monogram === undefined ? null : (
        <span style={{ marginTop: 14, fontFamily: 'var(--font-cormorant)', fontSize: 21, letterSpacing: '0.1em', color: P.oro }}>
          {monogram}
        </span>
      )}
      {eyebrow === undefined ? null : (
        <span
          style={{
            marginTop: 14,
            fontFamily: 'var(--font-outfit)',
            fontWeight: 300,
            fontSize: 12,
            letterSpacing: '0.22em',
            color: '#8a8279',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
      )}

      <span style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 300, fontSize: 51, lineHeight: 1.05, color: P.tinta }}>{nameA}</span>
        {nameB === undefined ? null : (
          <>
            <span style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: P.oro }}>&amp;</span>
            <span style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 300, fontSize: 51, lineHeight: 1.05, color: P.tinta }}>{nameB}</span>
          </>
        )}
      </span>

      <FileteDeEsencia />

      {fecha === '' ? null : (
        <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 300, fontSize: 13, letterSpacing: '0.18em', color: '#8a8279' }}>{fecha}</span>
      )}

      <span aria-hidden style={{ display: 'block', width: 1, height: 40, marginTop: 14, background: `linear-gradient(${P.oroClaro}, transparent)` }} />
      <span
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-outfit)',
          fontSize: 11,
          letterSpacing: '0.2em',
          color: P.oro,
          animation: reducido ? undefined : 'theme-esenciaFloat 2.5s ease-in-out infinite',
        }}
      >
        {hint}
      </span>
    </button>
  )
}
