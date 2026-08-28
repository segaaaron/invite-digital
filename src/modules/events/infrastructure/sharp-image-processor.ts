import sharp from 'sharp'
import { MAX_IMAGE_EDGE } from '../domain/media'
import type { ImageProcessor } from '../application/ports'

/**
 * Cuánto se comprime. Es una decisión de codificación, no de producto, y por eso vive aquí
 * y no en el dominio: a 82 una fotografía de boda no se distingue del original a simple
 * vista y pesa entre un quinto y un décimo.
 */
const CALIDAD = 82

/**
 * Deja la fotografía lista para servirse: reducida, reencodada y sin nada que no sea la
 * imagen.
 *
 * **Siempre WEBP.** Lo pinta todo navegador que exista hoy, guarda transparencia —el PNG
 * de un monograma la necesita— y pesa la mitad que un JPEG equivalente. Guardar el formato
 * de entrada obligaría a decidir calidad por formato y a mantener cuatro caminos para un
 * resultado que se ve igual.
 *
 * `rotate()` sin argumentos aplica la orientación que trae el EXIF **antes** de que se
 * borre: sin esa línea, una foto tomada con el teléfono de lado se guarda tumbada, porque
 * el dato que la enderezaba se va con los metadatos. Y los metadatos se van a propósito:
 * una fotografía de la novia lleva dentro dónde y cuándo se tomó, y esa invitación se
 * reparte por WhatsApp.
 *
 * `withoutEnlargement` porque agrandar una foto pequeña no añade un solo detalle: solo
 * pesa más y se ve peor.
 *
 * No lanza. Un fichero que no se puede decodificar es una respuesta —`null`, que el caso
 * de uso traduce a «eso no es una imagen»—, no una avería del servidor.
 */
export const sharpImageProcessor: ImageProcessor = {
  async normalize(bytes) {
    try {
      const salida = await sharp(bytes)
        .rotate()
        .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: CALIDAD })
        .toBuffer()

      return { bytes: new Uint8Array(salida), contentType: 'image/webp' }
    } catch (cause) {
      console.error('No se pudo procesar la imagen subida:', cause)
      return null
    }
  },
}
