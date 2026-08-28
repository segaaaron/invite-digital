import Image from 'next/image'
import type { CSSProperties } from 'react'
import { themeAsset } from '../../assets'

/**
 * Las acuarelas florales, en cinco tonos.
 *
 * Son fotografías de arreglos con el fondo recortado, no dibujo vectorial: por eso entran
 * como imagen y no como SVG. Viven en `public/temas/flora/` y no dentro de un tema porque
 * las comparten la boda botánica y el palacio griego, y duplicarlas serían dos megabytes
 * por el mismo arreglo.
 *
 * `red` y `violet` reutilizan las esquinas rosas a propósito: la maqueta hace lo mismo, y
 * es que el ramo tiene tono propio pero la esquina no se distingue.
 */
const FLORA = {
  white: { left: 'white-corner-left.avif', right: 'white-corner-right.avif', spray: 'white-spray.avif' },
  pink: { left: 'pink-corner-left.avif', right: 'pink-corner-right.avif', spray: 'pink-spray.avif' },
  red: { left: 'red-corner-left.avif', right: 'red-corner-right.avif', spray: 'pink-spray.avif' },
  violet: { left: 'pink-corner-left.avif', right: 'pink-corner-right.avif', spray: 'violet-spray.avif' },
  orange: { left: 'pink-corner-left.avif', right: 'pink-corner-right.avif', spray: 'orange-spray.avif' },
} as const

export type FloraTone = keyof typeof FLORA

type CornerProps = {
  readonly tone?: FloraTone
  readonly side?: 'left' | 'right'
  readonly width?: number
  readonly rotate?: number
  readonly flipX?: boolean
  readonly flipY?: boolean
  readonly opacity?: number
  readonly sway?: boolean
  readonly shadow?: boolean
  readonly style?: CSSProperties
}

const transformacion = (flipX: boolean, flipY: boolean, rotate: number): string | undefined => {
  const partes = [flipX ? 'scaleX(-1)' : '', flipY ? 'scaleY(-1)' : '', rotate === 0 ? '' : `rotate(${rotate}deg)`]
  const compuesta = partes.filter(Boolean).join(' ')
  return compuesta.length === 0 ? undefined : compuesta
}

/** El arreglo de esquina. El balanceo lo apaga la hoja de estilos si se pide menos movimiento. */
export function FloralCorner({
  tone = 'white',
  side = 'left',
  width = 220,
  rotate = 0,
  flipX = false,
  flipY = false,
  opacity = 1,
  sway = true,
  shadow = true,
  style,
}: CornerProps) {
  return (
    <div aria-hidden style={{ width, pointerEvents: 'none', ...style }}>
      <Image
        alt=""
        className={sway ? 'theme-sway-slow' : undefined}
        height={Math.round(width * 1.1)}
        src={themeAsset('flora', FLORA[tone][side])}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          opacity,
          transform: transformacion(flipX, flipY, rotate),
          transformOrigin: 'center',
          filter: shadow ? 'drop-shadow(0 6px 14px rgba(60,70,55,0.13))' : undefined,
        }}
        width={width}
      />
    </div>
  )
}

type SprayProps = {
  readonly tone?: FloraTone
  readonly width?: number
  readonly opacity?: number
  readonly flipX?: boolean
  readonly rotate?: number
  readonly sway?: boolean
  readonly shadow?: boolean
  readonly style?: CSSProperties
}

/** El ramo horizontal, para encabezados y separadores. */
export function FloralSpray({
  tone = 'white',
  width = 260,
  opacity = 1,
  flipX = false,
  rotate = 0,
  sway = true,
  shadow = false,
  style,
}: SprayProps) {
  return (
    <div aria-hidden style={{ width, pointerEvents: 'none', ...style }}>
      <Image
        alt=""
        className={sway ? 'theme-sway-slower' : undefined}
        height={Math.round(width * 0.45)}
        src={themeAsset('flora', FLORA[tone].spray)}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          opacity,
          transform: transformacion(flipX, false, rotate),
          transformOrigin: 'center',
          filter: shadow ? 'drop-shadow(0 6px 14px rgba(60,70,55,0.12))' : undefined,
        }}
        width={width}
      />
    </div>
  )
}

type DividerProps = {
  readonly tone?: FloraTone
  readonly width?: number
  /** El color del filete a los lados. Sin defecto: un defecto es un color de tema escondido. */
  readonly line: string
  readonly opacity?: number
  readonly style?: CSSProperties
}

/** El separador: ramo centrado con dos filetes. */
export function FloralDivider({ tone = 'white', width = 200, line, opacity = 0.95, style }: DividerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, ...style }}>
      <div aria-hidden style={{ flex: 1, height: 1, background: line }} />
      <FloralSpray opacity={opacity} sway={false} tone={tone} width={width} />
      <div aria-hidden style={{ flex: 1, height: 1, background: line }} />
    </div>
  )
}
