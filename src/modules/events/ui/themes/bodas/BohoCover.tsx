'use client'

import Image from 'next/image'
import { useState } from 'react'
import { PALETA as P } from './boda-boho.palette'

type Props = {
  readonly bgAsset: string
  /** «Nuestra Boda». */
  readonly eyebrow: string
  /** Las iniciales separadas: «S O». */
  readonly initials: string
  readonly names: string
  /** «Ingresa a nuestra invitación», del diccionario. */
  readonly cta: string
  readonly openLabel: string
}

/** La sombra blanca que la maqueta pone a todo el texto de la portada, para leerlo sobre las pampas. */
const LEGIBLE = '0 1px 3px rgba(255,255,255,0.5)'

/**
 * La portada de «Pampas y Flores Secas»: la fotografía de pampas a sangre, arriba el rótulo,
 * las iniciales, los nombres en caligrafía y el filete de rombo, y abajo la llamada a entrar.
 *
 * Es la portada escrita a mano de su maqueta (no un `IntroCover`): sin fundido de entrada y
 * con la flecha quieta, como allí.
 */
export function BohoCover({ bgAsset, eyebrow, initials, names, cta, openLabel }: Props) {
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
        background: P.crema,
        color: P.cafe,
        textShadow: LEGIBLE,
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover', objectPosition: 'top center' }} />

      <span
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          padding: '9% 12% 6%',
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 14, letterSpacing: '0.5em', textTransform: 'uppercase' }}>{eyebrow}</span>
          {initials === '' ? null : (
            <span style={{ fontFamily: 'var(--font-spectral)', fontWeight: 600, fontSize: 34, letterSpacing: '0.12em' }}>{initials}</span>
          )}
          <span style={{ fontFamily: 'var(--font-great-vibes)', fontSize: 58, lineHeight: 1 }}>{names}</span>
          <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: 130 }}>
            <span style={{ display: 'block', flex: 1, height: 1, background: P.oro }} />
            <span style={{ display: 'block', width: 7, height: 7, background: P.oro, transform: 'rotate(45deg)' }} />
            <span style={{ display: 'block', flex: 1, height: 1, background: P.oro }} />
          </span>
        </span>

        <span>
          <span style={{ display: 'block', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{cta}</span>
          <span aria-hidden style={{ display: 'block', marginTop: 10, fontSize: 17 }}>
            ↓
          </span>
        </span>
      </span>
    </button>
  )
}
