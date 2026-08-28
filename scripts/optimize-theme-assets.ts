/**
 * Deja las imágenes de los temas en un peso que se pueda versionar y servir.
 *
 * Tal y como salen de la maqueta pesan 148 MB: son exportaciones a tamaño de impresión
 * para una invitación que se mira en un teléfono. Un repositorio con 148 MB de PNG es un
 * `git clone` de varios minutos para siempre, y en producción es la portada tardando
 * ocho segundos en un 4G boliviano.
 *
 * Dos reglas:
 *
 * - **El tipo lo decide la firma, no la extensión.** Tres archivos de la maqueta vienen
 *   con la extensión cambiada —un JPEG llamado `.png` y dos PNG llamados `.jpg`—. Fiarse
 *   del nombre produce un `<img>` que el navegador acaba adivinando y `sharp` no.
 * - **La transparencia manda sobre el formato.** Una corona recortada convertida a JPEG
 *   sale con un rectángulo blanco detrás, y eso no se ve en la miniatura: se ve el día de
 *   la boda.
 *
 * Se ejecuta una vez, después de `import-theme-assets.ts`:
 * `pnpm tsx scripts/optimize-theme-assets.ts`
 */
import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import sharp from 'sharp'

const RAIZ = 'public/temas'

/**
 * El ancho máximo. Estos diseños son columnas de teléfono de 390 a 560 puntos; a 2x, 1400
 * cubre la pantalla más densa con holgura. Los fondos a pantalla completa se sirven con
 * `background-size: cover`, así que tampoco piden más.
 */
const ANCHO_MAXIMO = 1400

type Firma = { tipo: 'png' | 'jpg' | 'webp' | 'gif' | 'avif'; conAlfa: boolean }

/** El tipo real, leído de los primeros bytes. Nunca de la extensión, que la escribe quien exportó. */
export function firmaDe(bytes: Uint8Array): Firma['tipo'] | null {
  const empieza = (...b: number[]) => b.every((valor, indice) => bytes[indice] === valor)
  if (empieza(0x89, 0x50, 0x4e, 0x47)) return 'png'
  if (empieza(0xff, 0xd8, 0xff)) return 'jpg'
  if (empieza(0x47, 0x49, 0x46, 0x38)) return 'gif'
  // `RIFF` lo comparten WAV y AVI: hay que mirar el byte 8. Misma lección que los
  // comprobantes del Plan B.
  if (empieza(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return 'webp'
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'avif'
  return null
}

async function optimizar(ruta: string): Promise<{ antes: number; despues: number; destino: string }> {
  const bytes = await readFile(ruta)
  const tipo = firmaDe(bytes)
  if (tipo === null) throw new Error(`Firma desconocida: ${ruta}`)

  const imagen = sharp(bytes)
  const meta = await imagen.metadata()
  const conAlfa = meta.hasAlpha === true

  const redimensionada =
    (meta.width ?? 0) > ANCHO_MAXIMO ? imagen.resize({ width: ANCHO_MAXIMO, withoutEnlargement: true }) : imagen

  // Se codifica en los dos y se conserva el más pequeño. AVIF suele ganar en fotografía y
  // WebP en recortes con transparencia y bordes duros, pero no siempre, y adivinarlo
  // archivo a archivo cuesta más que probarlo.
  const [avif, webp] = await Promise.all([
    redimensionada.clone().avif({ quality: conAlfa ? 60 : 52, effort: 6 }).toBuffer(),
    redimensionada.clone().webp({ quality: conAlfa ? 82 : 78, effort: 6 }).toBuffer(),
  ])

  const ganador = avif.length <= webp.length ? { bytes: avif, ext: '.avif' } : { bytes: webp, ext: '.webp' }
  const destino = ruta.slice(0, -extname(ruta).length) + ganador.ext

  await writeFile(destino, ganador.bytes)
  if (destino !== ruta) await rm(ruta)

  return { antes: bytes.length, despues: ganador.bytes.length, destino }
}

async function principal(): Promise<void> {
  const temas = await readdir(RAIZ)
  let antes = 0
  let despues = 0

  for (const tema of temas) {
    const dir = join(RAIZ, tema)
    if (!(await stat(dir)).isDirectory()) continue
    for (const archivo of await readdir(dir)) {
      const resultado = await optimizar(join(dir, archivo))
      antes += resultado.antes
      despues += resultado.despues
    }
  }

  const mb = (n: number) => (n / 1024 / 1024).toFixed(1)
  console.log('%s MB → %s MB (%d%% menos)', mb(antes), mb(despues), Math.round((1 - despues / antes) * 100))
}

if (process.argv[1]?.endsWith('optimize-theme-assets.ts')) {
  principal().catch((cause: unknown) => {
    console.error(cause)
    process.exit(1)
  })
}


