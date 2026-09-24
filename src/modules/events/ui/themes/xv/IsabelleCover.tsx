'use client'

import Image from 'next/image'
import { useState } from 'react'

type Props = {
  readonly bgAsset: string
  /** «XV AÑOS». */
  readonly title: string
  readonly name: string
  /** «· MIS QUINCE · 2026». */
  readonly serial: string
  readonly hint: string
  readonly openLabel: string
}

const ORO = '#B8860B'
const ORO_CLARO = '#D4AF37'

/**
 * La portada de «Palacio Griego» en V3 (`IsabelleIntroCover`): el templo entre nubes con el
 * sobre lacrado, «XV AÑOS» en oro con un rombo entre dos filetes, el nombre en caligrafía
 * sobre un halo claro y, abajo, la llamada en una caja parda con su flecha.
 *
 * Un `<button>` a pantalla completa: con un div, quien navega con teclado no la abre.
 */
export function IsabelleCover({ bgAsset, title, name, serial, hint, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
      className="theme-quieto-si-reduce"
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
        background: '#FFF8E7',
        animation: 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,248,231,.12), rgba(255,240,210,.1))' }} />

      <span style={{ position: 'absolute', left: 0, right: 0, top: '33%', textAlign: 'center', zIndex: 1 }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-italiana)',
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: ORO,
            textShadow: '1px 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {title}
        </span>
        <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '12px auto' }}>
          <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, transparent, ${ORO})` }} />
          <svg height="14" viewBox="0 0 14 14" width="14">
            <path d="M7 0 L14 7 L7 14 L0 7 Z" fill={ORO} />
          </svg>
          <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, ${ORO}, transparent)` }} />
        </span>
        <span style={{ position: 'relative', display: 'block' }}>
          <span
            aria-hidden
            style={{ position: 'absolute', inset: -30, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,248,231,.5) 0%, transparent 75%)' }}
          />
          <span
            style={{
              position: 'relative',
              display: 'block',
              fontFamily: 'var(--font-great-vibes)',
              fontSize: 52,
              color: '#3C2A14',
              lineHeight: 1,
              textShadow: '0 0 10px rgba(255,255,255,0.8)',
            }}
          >
            {name}
          </span>
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 12,
            fontSize: 11,
            letterSpacing: '0.3em',
            fontFamily: 'var(--font-jetbrains-mono)',
            color: ORO,
            textShadow: '1px 1px 2px rgba(0,0,0,0.25)',
          }}
        >
          {serial}
        </span>
      </span>

      <span style={{ position: 'absolute', left: 0, right: 0, bottom: '9%', textAlign: 'center', zIndex: 1 }}>
        <span style={{ display: 'inline-block', background: 'rgba(60,40,20,0.7)', borderRadius: 14, padding: '14px 26px' }}>
          <span style={{ display: 'block', fontSize: 14, letterSpacing: '0.3em', fontFamily: 'var(--font-jetbrains-mono)', color: ORO_CLARO, fontWeight: 700 }}>
            {hint}
          </span>
          <svg aria-hidden height="24" style={{ display: 'block', margin: '10px auto 0' }} viewBox="0 0 16 20" width="20">
            <path d="M8 1 V16 M2 11 L8 17 L14 11" fill="none" stroke={ORO_CLARO} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
          </svg>
        </span>
      </span>
    </button>
  )
}
