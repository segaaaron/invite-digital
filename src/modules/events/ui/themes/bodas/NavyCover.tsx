'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useState } from 'react'
import { PALETA as P } from './boda-navy.palette'

type Props = {
  readonly bgAsset: string
  /** «Nuestra Boda». */
  readonly eyebrow: string
  /** Las iniciales grandes: «MA». */
  readonly initials: string
  readonly names: string
  /** La fecha en palabras: «20 DE SEPTIEMBRE DE 2026». */
  readonly fecha: string
  /** «Ingresa a nuestra invitación», del diccionario. */
  readonly cta: string
  readonly openLabel: string
}

/** Las diez motas doradas que suben por la portada: el `deluxe` de la maqueta. */
const MOTAS = Array.from({ length: 10 }, (_, i) => ({ izquierda: i * 10 + 5, duracion: 8 + (i % 3) * 2, retraso: i * 0.8 }))

/** El resplandor dorado con sombra que la maqueta pone a todo el texto blanco de la portada. */
const RESPLANDOR = '0 0 15px rgba(197,150,26,0.6), 0 2px 4px rgba(0,0,0,0.8)'

/**
 * La portada de «Noche Estrellada»: la lluvia de purpurina sobre el azul de medianoche.
 *
 * Es el `IntroCover style="ovalFrame"` de su maqueta con `deluxe`, sin sobre
 * (`envelopeImage: none`), sin aros y con `ctaBanner`: las motas subiendo, y a partir del
 * 38 % el rótulo en Montserrat, las iniciales en Playfair, los nombres en cursiva, el
 * filete de rombo y la fecha, todo en blanco con su resplandor de oro; abajo, la llamada a
 * entrar dentro de su cápsula con la flecha que rebota.
 *
 * El `glow` que la maqueta declara no se ve en ella: va con `z-index: -1` y queda debajo de
 * la fotografía. Por eso no está.
 */
export function NavyCover({ bgAsset, eyebrow, initials, names, fecha, cta, openLabel }: Props) {
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
        background: P.marino,
        animation: 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {MOTAS.map((mota) => (
          <span
            className="theme-quieto-si-reduce"
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

      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '38%',
          height: '40%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: P.tinta,
          textShadow: RESPLANDOR,
        }}
      >
        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 18.7, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          {eyebrow}
        </span>
        {initials === '' ? null : (
          <span style={{ fontFamily: 'var(--font-playfair-display)', fontWeight: 700, fontSize: 64, lineHeight: 1, marginTop: 6 }}>{initials}</span>
        )}
        <span
          style={{
            fontFamily: 'var(--font-playfair-display)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 35.2,
            lineHeight: 1.1,
            marginTop: 6,
            maxWidth: '82%',
          }}
        >
          {names}
        </span>
        <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 90, margin: '6px 0' }}>
          <span style={{ display: 'block', flex: 1, height: 1, background: P.oroVivo }} />
          <span style={{ display: 'block', width: 6, height: 6, background: P.oroVivo, transform: 'rotate(45deg)' }} />
          <span style={{ display: 'block', flex: 1, height: 1, background: P.oroVivo }} />
        </span>
        {fecha === '' ? null : (
          <span style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300, fontSize: 12.1, letterSpacing: '0.25em' }}>{fecha}</span>
        )}
      </span>

      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '12px 26px',
            border: '1px solid rgba(212,175,55,0.6)',
            borderRadius: 999,
            background: 'rgba(10,20,40,0.25)',
            color: P.oroVivo,
          }}
        >
          <span style={{ display: 'block', fontFamily: 'var(--font-montserrat)', fontWeight: 500, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {cta}
          </span>
          <span
            aria-hidden
            className="theme-quieto-si-reduce"
            style={{ display: 'block', marginTop: 8, fontSize: 16, animation: 'theme-bounceDown 1.4s ease-in-out infinite' }}
          >
            ↓
          </span>
        </span>
      </span>
    </button>
  )
}
