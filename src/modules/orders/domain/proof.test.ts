import { describe, expect, it } from 'vitest'
import { MAX_PROOF_BYTES, checkProof, sniffMime } from './proof'

const jpeg = () => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const png = () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const pdf = () => Buffer.from('%PDF-1.7\n%âãÏÓ', 'latin1')
const webp = () => Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')])

describe('sniffMime', () => {
  it('reconoce los cuatro tipos que se aceptan', () => {
    expect(sniffMime(jpeg())).toBe('image/jpeg')
    expect(sniffMime(png())).toBe('image/png')
    expect(sniffMime(pdf())).toBe('application/pdf')
    expect(sniffMime(webp())).toBe('image/webp')
  })

  it('un RIFF que no es WEBP no cuela: los primeros cuatro bytes no bastan', () => {
    const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WAVEfmt ')])

    expect(sniffMime(wav)).toBeNull()
  })

  it('lo que no reconoce no lo inventa', () => {
    expect(sniffMime(Buffer.from('MZ\x90\x00 ejecutable de Windows', 'latin1'))).toBeNull()
    expect(sniffMime(Buffer.from('<?php system($_GET[0]); ?>'))).toBeNull()
    expect(sniffMime(Buffer.alloc(0))).toBeNull()
  })
})

describe('checkProof', () => {
  it('acepta un PNG dentro del tope', () => {
    const veredicto = checkProof({ bytes: png(), declaredName: 'comprobante.png', declaredType: 'image/png' })

    expect(veredicto).toEqual({ ok: true, mime: 'image/png' })
  })

  it('el tipo lo decide el contenido, no lo que dice el cliente', () => {
    // Un ejecutable renombrado a .png y anunciado como image/png: las dos cosas las
    // escribe quien sube el fichero, así que ninguna de las dos se cree.
    const veredicto = checkProof({
      bytes: Buffer.from('MZ\x90\x00', 'latin1'),
      declaredName: 'comprobante.png',
      declaredType: 'image/png',
    })

    expect(veredicto).toEqual({ ok: false, reason: 'tipo_no_admitido' })
  })

  it('y un PNG de verdad se acepta aunque el cliente mienta al revés', () => {
    const veredicto = checkProof({ bytes: png(), declaredName: 'factura.exe', declaredType: 'application/x-msdownload' })

    expect(veredicto).toEqual({ ok: true, mime: 'image/png' })
  })

  it('rechaza lo que pasa del tope', () => {
    const gordo = Buffer.concat([png(), Buffer.alloc(MAX_PROOF_BYTES)])

    expect(checkProof({ bytes: gordo, declaredName: 'x.png', declaredType: 'image/png' })).toEqual({
      ok: false,
      reason: 'demasiado_grande',
    })
  })

  it('rechaza el fichero vacío', () => {
    expect(checkProof({ bytes: Buffer.alloc(0), declaredName: 'x.png', declaredType: 'image/png' })).toEqual({
      ok: false,
      reason: 'vacio',
    })
  })
})
