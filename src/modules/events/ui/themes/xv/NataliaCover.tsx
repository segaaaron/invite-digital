'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { PALETA as P } from './xv-natalia.palette'

type Props = {
  readonly bgAsset: string
  readonly noteAsset: string
  /** «Te invito a / celebrar mi fiesta», que aquí van en dos renglones de la misma línea. */
  readonly line1: string
  readonly line2: string
  readonly title: string
  readonly name: string
  /** V4: «SÁBADO 12 DE SEPTIEMBRE», donde iba «MIS QUINCE · NATALIA». */
  readonly fecha: string
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Encanto Marino»: la invitación fotografiada sobre una partitura. En V4 lleva
 * la fecha y la llamada a entrar en una píldora negra con filete de oro que late y brilla.
 *
 * El texto va dentro del recuadro claro que la fotografía ya trae —de ahí los porcentajes
 * del posicionamiento, que son los de la maqueta—: escribir encima de la partitura, fuera
 * de ese recuadro, deja el nombre ilegible.
 */
export function NataliaCover({ bgAsset, noteAsset, line1, line2, title, name, fecha, hint, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      data-cargando=""
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
        containerType: 'size',
        background: P.vidrio,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="100vw" src={bgAsset} style={{ objectFit: 'cover' }} />

      {/* V4: el papel claro de la fotografía, recortada como ella (cover). La foto mide W de ancho
          (W = max(100cqw, 55.814cqh)) y 1,791667·W de alto, centrada; el papel va del 36 % al 71,5 %
          de su ancho y del 29 % al 65 % de su alto. Se calcula la caja del papel directamente, sin
          una caja de la foto entera: esa, más ancha que el teléfono, se salía de la pantalla. */}
      <span
        style={{
          position: 'absolute',
          left: 'calc(50cqw - max(100cqw, 55.814cqh) * 0.14)',
          width: 'calc(max(100cqw, 55.814cqh) * 0.355)',
          top: 'calc(50cqh - max(100cqw, 55.814cqh) * 0.376250)',
          height: 'calc(max(100cqw, 55.814cqh) * 0.645000)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          containerType: 'size',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            WebkitFontSmoothing: 'antialiased',
            textShadow: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontWeight: 500,
              fontSize: 'min(11px, 4.4cqh)',
              letterSpacing: '0.2em',
              color: P.tintaPapel,
              textTransform: 'uppercase',
              lineHeight: 1.5,
            }}
          >
            {line1}
            <br />
            {line2}
          </span>
          <Image
            alt=""
            aria-hidden
            height={120}
            src={noteAsset}
            // La maqueta tiñe la nota dorada de pardo oscuro, como la tinta del papel.
            style={{
              width: 'auto',
              maxWidth: '75%',
              height: 'min(96px, 24cqh)',
              objectFit: 'contain',
              marginTop: 'min(10px, 3cqh)',
              filter: 'brightness(0) saturate(100%) invert(9%) sepia(28%) saturate(1800%) hue-rotate(2deg) brightness(85%) contrast(95%)',
            }}
            width={160}
          />
          <span
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontWeight: 700,
              fontSize: 'min(20px, 7.5cqh)',
              letterSpacing: '0.1em',
              marginTop: 'min(10px, 3cqh)',
              color: P.oroPapel,
              textShadow: '0 1px 0 rgba(255,244,214,.9)',
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-alex-brush)',
              fontSize: 'min(38px, 13cqh)',
              color: P.tintaNombre,
              lineHeight: 1,
              marginTop: 'min(4px, 1.2cqh)',
            }}
          >
            {name}
          </span>
          {fecha === '' ? null : (
            <span
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 'min(9px, 3.6cqh)',
                letterSpacing: '0.18em',
                color: P.tintaPapel,
                fontWeight: 700,
                marginTop: 'min(14px, 4cqh)',
              }}
            >
              {fecha}
            </span>
          )}
          <span
            className="theme-quieto-si-reduce"
            style={{
              marginTop: 'min(12px, 3.5cqh)',
              padding: 'min(8px, 2.4cqh) min(10px, 5cqw)',
              boxShadow: '0 2px 3px rgba(0,0,0,.35)',
              borderRadius: 999,
              background: `linear-gradient(100deg, ${P.pildora} 0%, ${P.pildora} 40%, ${P.brilloPildora} 50%, ${P.pildora} 60%, ${P.pildora} 100%)`,
              backgroundSize: '250% 100%',
              border: `1px solid ${P.oroPildora}`,
              color: P.tintaPildora,
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 'min(8.5px, 3.4cqh, 5.6cqw)',
              letterSpacing: '0.04em',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              fontWeight: 700,
              maxWidth: '94%',
              boxSizing: 'border-box',
              minHeight: 'min(32px, 12cqh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              animation: reducido ? undefined : 'theme-natPulse 2.4s ease-in-out infinite, theme-natShine 3.2s ease-in-out infinite',
            }}
          >
            {hint}
          </span>
        </span>
      </span>
    </button>
  )
}
