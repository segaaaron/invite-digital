/**
 * **Reduce una fotografía en el navegador antes de subirla**: a 2560 px por el lado largo, en JPEG de buena
 * calidad. Una foto de celular de 5–25 MB llega en unos cientos de KB: sube rápido con datos móviles y no
 * choca con ningún tope. El servidor la vuelve a procesar igual (y le quita los metadatos).
 *
 * Si el navegador no sabe abrirla (un HEIC en Chrome), devuelve la original: el servidor dirá si vale.
 * Una imagen ya pequeña se sube tal cual.
 */
export async function reducirFoto(archivo: File, ladoMaximo = 2560, calidad = 0.86): Promise<File> {
  if (!archivo.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp|avif)$/i.test(archivo.name)) return archivo
  let imagen: ImageBitmap
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    return archivo
  }
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height))
  if (escala === 1 && archivo.size <= 1_500_000) {
    imagen.close()
    return archivo
  }
  const ancho = Math.round(imagen.width * escala)
  const alto = Math.round(imagen.height * escala)
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (ctx === null) {
    imagen.close()
    return archivo
  }
  ctx.drawImage(imagen, 0, 0, ancho, alto)
  imagen.close()
  const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad))
  if (blob === null || blob.size >= archivo.size) return archivo
  return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: archivo.lastModified })
}

/**
 * Cambia la foto elegida en un `<input type="file">` por su versión reducida, **en el propio campo**: así el
 * formulario envía la pequeña sin que quien lo usa haga nada distinto. Devuelve el archivo que queda.
 */
export async function reducirEnElCampo(campo: HTMLInputElement): Promise<File | null> {
  const original = campo.files?.[0]
  if (original === undefined || !original.type.startsWith('image/')) return original ?? null
  const reducida = await reducirFoto(original)
  if (reducida === original) return original
  try {
    const lista = new DataTransfer()
    lista.items.add(reducida)
    campo.files = lista.files
    return reducida
  } catch {
    return original
  }
}

