'use client'

import Image from 'next/image'
import { useState } from 'react'

type Props = {
  readonly bgAsset: string
  readonly crownAsset: string
  /** «XV AÑOS». */
  readonly title: string
  readonly name: string
  /** «· MIS QUINCE · 2026». */
  readonly serial: string
  readonly hint: string
  readonly openLabel: string
  /** El oro y el cristal de la paleta del diseño. */
  readonly oro: string
  readonly cristal: string
}

const HALO = '0 0 15px rgba(255,255,255,0.9)'
const RESPLANDOR_ORO = '0 0 10px rgba(197,165,90,0.8), 0 0 25px rgba(197,165,90,0.4)'

/**
 * La portada de «Papillon» (`PapillonCover`, `xv-papillon.jsx`): las mariposas rosas a
 * sangre, la corona redonda que late con un resplandor dorado, el nombre en un cristal
 * esmerilado y, abajo, la llamada en blanco con su flecha que rebota.
 *
 * Un `<button>` a pantalla completa: con un div, quien navega con teclado no la abre.
 */
export function PapillonCover({ bgAsset, crownAsset, title, name, serial, hint, openLabel, oro, cristal }: Props) {
  const [abierta, setAbierta] = useState(false)

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
        display: 'flex',
        flexDirection: 'column',
        background: '#F8E0E4',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />
      <span style={{ flex: '0.6 1 0%' }} />
      <span style={{ position: 'relative', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Image
          alt=""
          aria-hidden
          className="theme-quieto-si-reduce"
          height={175}
          src={crownAsset}
          style={{
            width: 175,
            height: 'auto',
            borderRadius: '50%',
            boxShadow: '0 0 30px rgba(197,165,90,0.3), 0 0 60px rgba(255,200,200,0.2)',
            animation: 'theme-crownGlow 3.5s ease-in-out infinite',
          }}
          width={175}
        />
        <span style={{ position: 'relative', display: 'block', width: '100%', marginTop: 18 }}>
          <span
            aria-hidden
            style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: cristal, borderRadius: 20 }}
          />
          <span style={{ position: 'relative', display: 'block', padding: '25px 35px' }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-outfit)',
                fontWeight: 300,
                fontSize: '1.1rem',
                letterSpacing: '0.3em',
                color: oro,
                textShadow: HALO,
              }}
            >
              {title}
            </span>
            <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '14px 0' }}>
              <span style={{ width: 44, height: 1, background: oro }} />
              <span style={{ color: oro, fontSize: 12, textShadow: HALO }}>◆</span>
              <span style={{ width: 44, height: 1, background: oro }} />
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-great-vibes)',
                fontSize: '4.5rem',
                color: oro,
                lineHeight: 1,
                textShadow: '0 1px 3px rgba(0,0,0,0.1), 0 0 20px rgba(255,255,255,0.9)',
              }}
            >
              {name}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 14,
                fontFamily: 'var(--font-outfit)',
                fontWeight: 300,
                fontSize: '0.95rem',
                letterSpacing: '0.25em',
                color: oro,
                textShadow: HALO,
              }}
            >
              {serial}
            </span>
          </span>
        </span>
      </span>
      <span style={{ flex: '1.3 1 0%' }} />
      <span style={{ position: 'relative', flex: '0 0 auto', paddingBottom: 30, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', paddingBottom: 5, borderBottom: '1px solid rgba(197,165,90,0.5)' }}>
          <span
            style={{
              fontFamily: 'var(--font-outfit)',
              fontWeight: 500,
              fontSize: '0.85rem',
              letterSpacing: '0.2em',
              color: '#FFFFFF',
              textTransform: 'uppercase',
              textShadow: RESPLANDOR_ORO,
            }}
          >
            {hint}
          </span>
        </span>
        <span
          aria-hidden
          className="theme-quieto-si-reduce"
          style={{ display: 'block', marginTop: 8, fontSize: '1.2rem', color: '#FFFFFF', textShadow: RESPLANDOR_ORO, animation: 'theme-bounceDown 2s ease-in-out infinite' }}
        >
          ↓
        </span>
      </span>
    </button>
  )
}
