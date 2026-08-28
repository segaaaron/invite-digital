import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import { MAX_IMAGE_EDGE } from '../domain/media'
import { sharpImageProcessor } from './sharp-image-processor'

/** Una fotografía de verdad, del tamaño que sale de un teléfono. */
const fotografia = async (ancho: number, alto: number): Promise<Uint8Array> =>
  new Uint8Array(
    await sharp({
      create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 170, b: 120 } },
    })
      .jpeg({ quality: 100 })
      .toBuffer(),
  )

describe('sharpImageProcessor', () => {
  it('reduce la fotografía al lado largo y no la estira', async () => {
    const salida = await sharpImageProcessor.normalize(await fotografia(4032, 3024))

    expect(salida).not.toBeNull()
    const medidas = await sharp(salida!.bytes).metadata()
    expect(medidas.width).toBe(MAX_IMAGE_EDGE)
    // La proporción se conserva: 4032×3024 es 4:3, y 1600 de ancho son 1200 de alto.
    expect(medidas.height).toBe(1200)
  })

  it('mide por el lado largo, así que un retrato vertical se reduce por el alto', async () => {
    const salida = await sharpImageProcessor.normalize(await fotografia(1200, 3000))

    const medidas = await sharp(salida!.bytes).metadata()
    expect(medidas.height).toBe(MAX_IMAGE_EDGE)
    expect(medidas.width).toBe(640)
  })

  it('no agranda una fotografía que ya era pequeña', async () => {
    // Agrandarla no añade un solo detalle: solo pesa más y se ve peor.
    const salida = await sharpImageProcessor.normalize(await fotografia(400, 300))

    const medidas = await sharp(salida!.bytes).metadata()
    expect(medidas.width).toBe(400)
    expect(medidas.height).toBe(300)
  })

  it('siempre sale WEBP, venga lo que venga', async () => {
    const salida = await sharpImageProcessor.normalize(await fotografia(800, 600))

    expect(salida?.contentType).toBe('image/webp')
    expect((await sharp(salida!.bytes).metadata()).format).toBe('webp')
  })

  it('pesa mucho menos que lo que llegó', async () => {
    // Es todo el motivo: una fotografía de móvil se servía entera a un invitado con datos.
    const original = await fotografia(4032, 3024)
    const salida = await sharpImageProcessor.normalize(original)

    expect(salida!.bytes.byteLength).toBeLessThan(original.byteLength / 4)
  })

  it('se lleva los metadatos, que en una foto de boda dicen dónde y cuándo', async () => {
    const conExif = new Uint8Array(
      await sharp({ create: { width: 900, height: 600, channels: 3, background: '#c8aa78' } })
        .withExif({ IFD0: { Copyright: 'Estudio Ajeno', Software: 'Cámara' } })
        .jpeg()
        .toBuffer(),
    )
    expect((await sharp(conExif).metadata()).exif).toBeDefined()

    const salida = await sharpImageProcessor.normalize(conExif)

    expect((await sharp(salida!.bytes).metadata()).exif).toBeUndefined()
  })

  it('endereza la fotografía tomada de lado antes de tirar el EXIF que lo decía', async () => {
    // Sin `rotate()`, el dato que la enderezaba se va con los metadatos y la foto se queda
    // tumbada para siempre. La orientación 6 es el teléfono girado un cuarto de vuelta.
    const tumbada = new Uint8Array(
      await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#c8aa78' } })
        .withMetadata({ orientation: 6 })
        .jpeg()
        .toBuffer(),
    )

    const salida = await sharpImageProcessor.normalize(tumbada)

    const medidas = await sharp(salida!.bytes).metadata()
    expect(medidas.width).toBe(600)
    expect(medidas.height).toBe(1200)
  })

  it('lo que no se puede decodificar devuelve nada, y no revienta', async () => {
    // Unos bytes de cabecera de PNG con un cuerpo que no lo es: pasa la comprobación de
    // los primeros bytes y no pasa esta.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const falsa = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])

    expect(await sharpImageProcessor.normalize(falsa)).toBeNull()
  })
})
