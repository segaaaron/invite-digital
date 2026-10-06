'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  /** El color de debajo, para el instante en que el cartel todavía no está. */
  readonly bg: string
  /** El cartel de cabaret, a sangre. */
  readonly bgAsset: string
  readonly openLabel: string
  /** «ENTRA A LA INVITACIÓN»: la llamada del pie. */
  readonly cta: string
}

/**
 * La portada de «Femme Fatale»: el cartel a sangre y, al pie, la placa dorada que late
 * (`IntroCover style="poster"` de la maqueta, con su `posterCtaGlow`).
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega con
 * teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function FemmeCover({ bg, bgAsset, openLabel, cta }: Props) {
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
        background: bg,
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover', objectPosition: 'center' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '5%', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            border: '1px solid #E8C46E',
            outline: '1px solid rgba(232,196,110,.45)',
            outlineOffset: 2,
            borderRadius: 4,
            background: 'rgba(20,8,8,.62)',
            backdropFilter: 'blur(3px)',
            color: '#F3DFA8',
            fontFamily: 'var(--font-cinzel)',
            fontWeight: 600,
            fontSize: 8,
            letterSpacing: '0.18em',
            textShadow: '0 1px 4px rgba(0,0,0,.8)',
            whiteSpace: 'nowrap',
            animation: reducido ? undefined : 'theme-posterCtaGlow 2.4s ease-in-out infinite',
          }}
        >
          {cta}
          <span aria-hidden style={{ fontSize: 7 }}>
            ▸
          </span>
        </div>
      </div>
    </button>
  )
}
