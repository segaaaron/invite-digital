'use client'

import Image from 'next/image'
import { useState } from 'react'

type Props = {
  readonly bgAsset: string
  /** Los anillos, debajo de los nombres. */
  readonly ringsAsset: string
  /** El oro del filete con rombo. */
  readonly accent: string
  readonly bg: string
  readonly textColor: string
  /** «Nuestra Boda», del contenido del diseño. */
  readonly eyebrow: string
  readonly names: string
  readonly initials: string
  readonly hint: string
  readonly openLabel: string
}

/** El resplandor dorado con sombra que la maqueta pone a todo el texto de esta portada. */
const RESPLANDOR = '0 0 15px rgba(197,150,26,0.6), 0 2px 4px rgba(0,0,0,0.8)'

/**
 * La portada de «Editorial» en V3 (`IntroCover` con `style="ovalFrame"`, `utils.jsx`): la
 * fotografía de hojas con su óvalo dorado y, dentro, el rótulo, las iniciales y los nombres
 * en blanco con resplandor dorado, un filete con rombo y los anillos; abajo, la llamada con
 * su flecha que rebota.
 *
 * **El óvalo lo trae la fotografía**, no se dibuja: dibujarlo encima salían dos óvalos
 * desalineados.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>` como en la maqueta: con un
 * div, quien navega con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function OvalFrameCover({ bgAsset, ringsAsset, accent, bg, textColor, eyebrow, names, initials, hint, openLabel }: Props) {
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
        background: bg,
        color: textColor,
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
        <span
          style={{
            fontFamily: 'var(--font-montserrat)',
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '0.3em',
            color: textColor,
            textTransform: 'uppercase',
            textShadow: RESPLANDOR,
          }}
        >
          {eyebrow}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-playfair-display)',
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 1,
            color: textColor,
            marginTop: 6,
            textShadow: RESPLANDOR,
          }}
        >
          {initials}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-playfair-display)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 32,
            lineHeight: 1.1,
            color: textColor,
            marginTop: 6,
            maxWidth: '82%',
            textShadow: RESPLANDOR,
          }}
        >
          {names}
        </span>
        <span aria-hidden style={{ width: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '6px 0' }}>
          <span style={{ flex: 1, height: 1, background: accent }} />
          <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)' }} />
          <span style={{ flex: 1, height: 1, background: accent }} />
        </span>
        <Image
          alt=""
          aria-hidden
          height={140}
          src={ringsAsset}
          style={{
            width: '45%',
            height: 'auto',
            marginTop: 10,
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.35)) drop-shadow(0 0 14px rgba(255,255,255,.5))',
          }}
          width={140}
        />
      </span>

      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center' }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-dm-sans)',
            fontWeight: 600,
            fontSize: 10.3,
            letterSpacing: '0.15em',
            color: textColor,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {hint}
        </span>
        <span
          aria-hidden
          className="theme-quieto-si-reduce"
          style={{ display: 'block', marginTop: 8, fontSize: 17, color: textColor, animation: 'theme-bounceDown 1.4s ease-in-out infinite' }}
        >
          ↓
        </span>
      </span>
    </button>
  )
}
