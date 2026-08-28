import { describe, expect, it } from 'vitest'
import { firmaDe } from './optimize-theme-assets'

const bytes = (...valores: number[]) => new Uint8Array(valores)

describe('firmaDe', () => {
  it('reconoce PNG', () => {
    expect(firmaDe(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png')
  })

  it('reconoce JPEG', () => {
    expect(firmaDe(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpg')
  })

  it('reconoce WEBP mirando el byte 8, no solo RIFF', () => {
    expect(firmaDe(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe('webp')
  })

  it('no toma por WEBP un WAV ni un AVI', () => {
    // `RIFF` lo comparten WAV y AVI. Es la misma lección que dejaron los comprobantes del
    // Plan B, y aquí importa porque `sharp` no adivina: revienta.
    expect(firmaDe(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBeNull()
    expect(firmaDe(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20))).toBeNull()
  })

  it('desconfía de lo que no reconoce', () => {
    expect(firmaDe(bytes(0x3c, 0x21, 0x44, 0x4f))).toBeNull()
    expect(firmaDe(bytes())).toBeNull()
  })

  it('no se fía de la extensión, porque la maqueta trae tres que mienten', () => {
    // `wedding-couple.png` es un JPEG; `fondo-disco-mariana-opt.jpg` y
    // `fondo-disco-tacones-opt.jpg` son PNG. Se comprobó leyendo los 93 archivos.
    expect(firmaDe(bytes(0xff, 0xd8, 0xff, 0xe0))).not.toBe('png')
  })
})
