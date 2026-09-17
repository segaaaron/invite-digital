'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { BubblesRise } from '../kit/backgrounds/BubblesRise'
import { FotoDeFondo } from '../kit/backgrounds/FotoDeFondo'
import { PALETA as P } from './xv.palette'

type Props = {
  readonly bgAsset: string
  readonly crownAsset: string
  /** «Te invito», arriba del todo. */
  readonly line1: string
  readonly line2: string
  readonly title: string
  readonly name: string
  /** «INGRESA A MI INVITACIÓN». */
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de los dos diseños bajo el mar: fotografía a sangre, corona y burbujas.
 *
 * Vive **con el tema y no en el kit** porque su paleta y sus imágenes son de este diseño:
 * llevarla al kit metería el morado de esta invitación en código que comparten dieciséis.
 *
 * Es un `<button>` a pantalla completa, no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y quien usa lector de pantalla no oye que haya nada que
 * tocar, y la invitación se acaba aquí.
 */
export function SofiaCover({ bgAsset, crownAsset, line1, line2, title, name, hint, openLabel }: Props) {
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
        background: P.rosa,
        color: P.tinta,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <FotoDeFondo filter="saturate(1.35) contrast(1.12)" priority src={bgAsset} />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,8,30,0.55) 0%, rgba(15,8,30,0) 28%, rgba(15,8,30,0) 68%, rgba(15,8,30,0.6) 100%)',
        }}
      />
      <span aria-hidden style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 140px 40px rgba(10,5,20,0.55)' }} />
      <BubblesRise color="rgba(180,220,255,0.5)" count={20} seed={11} />

      <span style={{ textAlign: 'center', padding: '40px 30px', position: 'relative', zIndex: 1 }}>
        {/*
          El halo que la maqueta pone detrás del texto. No es decoración: el castillo tiene
          torres claras justo donde caen «XV AÑOS» y el nombre, y sin él la letra blanca se
          pierde encima. La sombra de texto sola no basta sobre un fondo tan claro.
        */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: '4% -4%',
            zIndex: -1,
            background:
              'radial-gradient(ellipse 72% 62% at 50% 50%, rgba(30,15,55,0.6) 0%, rgba(30,15,55,0.3) 55%, transparent 82%)',
          }}
        />
        <span
          style={{
            display: 'block',
            position: 'relative',
            fontFamily: 'var(--font-cormorant)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: '#f3e0ff',
            textTransform: 'uppercase',
            textShadow: '0 0 30px rgba(15,8,40,.9), 0 0 12px rgba(15,8,40,.75), 0 2px 4px rgba(15,8,40,.85)',
          }}
        >
          {line1}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-cormorant)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '0.2em',
            color: '#f3e0ff',
            textTransform: 'uppercase',
            marginTop: 4,
            textShadow: '0 0 30px rgba(15,8,40,.9), 0 0 12px rgba(15,8,40,.75), 0 2px 4px rgba(15,8,40,.85)',
          }}
        >
          {line2}
        </span>
        <span aria-hidden style={{ display: 'block', width: 90, height: 2, background: '#FFFDF8', margin: '22px auto' }} />
        <Image
          alt=""
          aria-hidden
          height={200}
          src={crownAsset}
          style={{
            width: 200,
            height: 'auto',
            margin: '0 auto',
            display: 'block',
            filter: 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(30,15,55,.55)) contrast(1.4)',
          }}
          width={200}
        />
        <span
          style={{
            display: 'block',
            marginTop: 30,
            fontFamily: 'var(--font-italiana)',
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#f3e0ff',
            textShadow: '0 0 30px rgba(15,8,40,.9), 0 2px 4px rgba(15,8,40,.85)',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-great-vibes)',
            fontSize: 62,
            color: '#ffffff',
            marginTop: 14,
            lineHeight: 1,
            textShadow: '0 0 30px rgba(15,8,40,.9), 0 2px 4px rgba(15,8,40,.85)',
          }}
        >
          {name}
        </span>
        <span aria-hidden style={{ display: 'block', width: 90, height: 2, background: '#FFFDF8', margin: '22px auto' }} />
        <span
          style={{
            display: 'block',
            marginTop: 10,
            fontSize: 10,
            opacity: 0.9,
            letterSpacing: '0.2em',
            fontFamily: 'var(--font-jetbrains-mono)',
            color: '#FFFDF8',
          }}
        >
          {hint}
        </span>
      </span>
    </button>
  )
}
