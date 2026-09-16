'use client'

import { useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'

type Props = {
  readonly accent: string
  readonly bg: string
  readonly textColor: string
  /** «Abrir invitación», del diccionario. */
  readonly label: string
  /** «Toca en cualquier lugar», del diccionario. */
  readonly hint: string
  /** El nombre accesible del botón: quien usa lector de pantalla no ve el sobre. */
  readonly openLabel: string
  /**
   * Qué dibujo preside la portada.
   *
   * La maqueta tiene tres de línea —sobre, telón de cine y billete— y son el mismo
   * mecanismo con otro dibujo: mismo botón, mismo color por prop, mismo comportamiento.
   * Los que llevan fotografía propia no están aquí: viven con su tema.
   */
  readonly variant?: 'envelope' | 'curtain' | 'ticket'
  /** El titular del telón y la palabra grande del billete. Copia del diseño, no del kit. */
  readonly headline?: string
  /** La línea pequeña de encima: «ESTÁS INVITADO», «YOUR ACCESS». */
  readonly eyebrow?: string
  /**
   * La tipografía del titular del billete.
   *
   * Llega por prop y no escrita aquí porque el kit no sabe qué familias baja cada tema:
   * una variable CSS que el diseño no haya declarado en sus `fonts` no existe, y el
   * titular saldría con la de respaldo sin que nada lo avise.
   */
  readonly headlineFont?: string
}

/**
 * La portada de sobre: se toca y se abre la invitación.
 *
 * Es un **`<button>` a pantalla completa**, no un `<div onClick>` como en la maqueta. Con
 * un div, quien navega con teclado no puede abrirla y quien usa lector de pantalla no oye
 * que haya nada que tocar: la invitación se acaba en la portada. Cuesta lo mismo y lo
 * arregla entero.
 *
 * Las portadas con fotografía y color propios de cada diseño **no viven aquí**: viven con
 * su tema. Traerlas al kit metería la paleta de un diseño en código que comparten los
 * dieciséis, que es justo lo que la guardia de hexadecimales impide.
 */
export function EnvelopeCover({
  accent,
  bg,
  textColor,
  label,
  hint,
  openLabel,
  variant = 'envelope',
  headline,
  eyebrow,
  headlineFont,
}: Props) {
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
        background: bg,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        width: '100%',
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <span style={{ textAlign: 'center' }}>
        {variant !== 'envelope' ? null : (
        <span
          aria-hidden
          style={{
            position: 'relative',
            display: 'block',
            width: 240,
            height: 160,
            margin: '0 auto',
            border: `1px solid ${accent}`,
            background: bg,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '55%',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              background: accent,
              opacity: 0.15,
              borderBottom: `1px solid ${accent}`,
              transformOrigin: 'center top',
              animation: reducido ? undefined : 'theme-envelopeFlap 2.4s ease-in-out infinite',
            }}
          />
          <span style={{ position: 'absolute', inset: '30% 24px 24px', border: `1px dashed ${accent}`, opacity: 0.5 }} />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '60%',
              transform: 'translate(-50%, -50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: accent,
              color: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-cormorant)',
              fontStyle: 'italic',
              fontSize: 16,
            }}
          >
            ✉
          </span>
        </span>
        )}

        {variant === 'curtain' && headline !== undefined ? (
          <span style={{ display: 'block' }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 9,
                letterSpacing: '0.4em',
                color: accent,
              }}
            >
              {eyebrow ?? ''}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 18,
                fontFamily: 'var(--font-cormorant)',
                fontStyle: 'italic',
                fontSize: 56,
                lineHeight: 1,
                color: textColor,
              }}
            >
              {headline}
            </span>
            <span
              style={{
                display: 'inline-block',
                marginTop: 28,
                padding: '12px 24px',
                border: `1px solid ${accent}`,
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 10,
                letterSpacing: '0.35em',
                color: accent,
              }}
            >
              ▸ {label}
            </span>
          </span>
        ) : null}

        {variant === 'ticket' && headline !== undefined ? (
          <span style={{ display: 'block' }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 9,
                letterSpacing: '0.4em',
                color: accent,
              }}
            >
              {eyebrow ?? ''}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 14,
                fontFamily: headlineFont ?? 'var(--font-jetbrains-mono)',
                fontWeight: 700,
                fontSize: 64,
                lineHeight: 0.9,
                letterSpacing: '-0.04em',
                color: textColor,
              }}
            >
              {headline}
            </span>
            <span
              style={{
                display: 'inline-block',
                marginTop: 14,
                padding: '10px 22px',
                border: `1px solid ${accent}`,
                background: accent,
                color: bg,
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.35em',
              }}
            >
              {label} ▸
            </span>
          </span>
        ) : null}

        {/*
          «Abrir invitación» y «toca en cualquier lugar» son del sobre. El telón y el
          billete llevan su llamada **dentro de su propia chapa** —con el triángulo delante
          o detrás—, y repetirla aquí debajo la decía dos veces.
        */}
        {variant !== 'envelope' ? null : (
          <>
            <span
              style={{
                display: 'block',
                marginTop: 28,
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 10,
                letterSpacing: '0.4em',
                color: accent,
              }}
            >
              {label}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 6,
                fontSize: 11,
                opacity: 0.5,
                letterSpacing: '0.2em',
                fontFamily: 'var(--font-jetbrains-mono)',
              }}
            >
              {hint}
            </span>
          </>
        )}
      </span>
    </button>
  )
}
