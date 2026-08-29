'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  /** El color de debajo, para el instante en que la fotografía todavía no está. */
  readonly bg: string
  readonly bgAsset: string
  /** El filtro de la fotografía, cuando el diseño la retoca. */
  readonly imageFilter?: string
  readonly objectPosition?: string
  /**
   * Los velos que van sobre la fotografía, en orden de pintado.
   *
   * Son varios y no uno porque estos diseños superponen un tinte plano y uno o dos
   * degradados: fundirlos en un solo valor cambia el color donde se cruzan.
   */
  readonly veils: readonly string[]
  readonly openLabel: string
  readonly children: ReactNode
}

/**
 * El armazón que comparten las cinco portadas de XV con fotografía a sangre.
 *
 * Es lo único que tienen en común de verdad —el botón a pantalla completa, la fotografía
 * de fondo y sus velos—; lo de dentro lo compone cada diseño, porque en la maqueta cada
 * uno es un componente distinto y no una repintada del anterior. Un solo componente con
 * banderas para las cinco fue lo que dejó a las cinco enseñando la misma pieza genérica.
 *
 * Es un `<button>` y no un `<div onClick>` como en la maqueta: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function CoverShell({ bg, bgAsset, imageFilter, objectPosition, veils, openLabel, children }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
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
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image
        alt=""
        aria-hidden
        fill
        priority
        sizes="480px"
        src={bgAsset}
        style={{ objectFit: 'cover', objectPosition: objectPosition ?? 'center', filter: imageFilter }}
      />
      {veils.map((velo) => (
        <span aria-hidden key={velo} style={{ position: 'absolute', inset: 0, background: velo }} />
      ))}
      {children}
    </button>
  )
}
