/**
 * Trae al repositorio las imágenes de los dieciséis diseños de la maqueta.
 *
 * Son **el aspecto del tema**, como un SVG del kit: van versionadas en `public/temas/`,
 * no en el almacén de medios del evento, que es para lo que sube el atelier.
 *
 * Se ejecuta una vez: `pnpm tsx scripts/import-theme-assets.ts`
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const ORIGEN =
  '/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/VallHallaWwepApp'

const DESTINO = 'public/temas'

/**
 * Un espacio o una mayúscula en una ruta servida es un fallo que aparece en producción y
 * **no** en macOS, cuyo sistema de ficheros no distingue mayúsculas: `BORDE PLATA SF.png`
 * funciona aquí y da 404 en el contenedor. Se normaliza al copiar, una vez, y no se
 * vuelve a pensar en ello.
 *
 * El sufijo de hash que la maqueta añade a los duplicados (`-5c764da1`) no dice nada del
 * contenido y se quita: es lo que hace que `MASCARADA MORADA.jpeg` y
 * `MASCARADA MORADA-5c764da1.jpeg` caigan en el mismo destino, que es justo lo que se
 * quiere para poder deduplicarlas.
 */
export function normalizarNombre(original: string): string {
  const ext = extname(original).toLowerCase()
  const base = ext.length > 0 ? original.slice(0, -ext.length) : original
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/-[0-9a-f]{8}$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${limpio}${ext === '.jpeg' ? '.jpg' : ext}`
}

/** Qué imágenes usa cada tema. Sale de leer los dieciséis componentes de la maqueta. */
export type MapaDeTemas = ReadonlyMap<string, readonly string[]>

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')

/**
 * Copia las imágenes de un tema, deduplicando por contenido.
 *
 * Si dos originales distintos caen en el mismo destino con **distinto** contenido, para
 * con error en vez de pisar uno: son dos imágenes que el diseño distingue y hay que
 * desambiguar a mano. Silenciarlo dejaría un tema con la imagen de otro y nadie lo vería
 * hasta abrirlo.
 */
export async function copiarTema(
  clave: string,
  originales: readonly string[],
  leer: (ruta: string) => Promise<Uint8Array>,
  escribir: (ruta: string, bytes: Uint8Array) => Promise<void>,
): Promise<{ copiadas: number; duplicadas: number }> {
  const porDestino = new Map<string, string>()
  let copiadas = 0
  let duplicadas = 0

  for (const original of originales) {
    const destino = normalizarNombre(original.split('/').slice(-1)[0] ?? original)
    const bytes = await leer(join(ORIGEN, original))
    const hash = sha(bytes)
    const anterior = porDestino.get(destino)

    if (anterior !== undefined) {
      if (anterior !== hash) {
        throw new Error(
          `Dos imágenes distintas caen en ${clave}/${destino}. Desambigua a mano: ${original}`,
        )
      }
      duplicadas += 1
      continue
    }

    porDestino.set(destino, hash)
    await escribir(join(DESTINO, clave, destino), bytes)
    copiadas += 1
  }

  return { copiadas, duplicadas }
}

async function principal(): Promise<void> {
  const mapa: MapaDeTemas = new Map(
    JSON.parse(await readFile('scripts/theme-assets.json', 'utf8')) as [string, string[]][],
  )

  let total = 0
  for (const [clave, originales] of mapa) {
    await mkdir(join(DESTINO, clave), { recursive: true })
    const { copiadas, duplicadas } = await copiarTema(
      clave,
      originales,
      (ruta) => readFile(ruta),
      (ruta, bytes) => writeFile(ruta, bytes),
    )
    total += copiadas
    console.log(`%s: %d copiadas, %d duplicadas`, clave, copiadas, duplicadas)
  }
  console.log('Total: %d imágenes en %d temas', total, mapa.size)
}

// `await` de primer nivel no compila al formato CJS con el que tsx ejecuta esto, así que
// el guion arranca con `.then` en vez de con `await`.
if (process.argv[1]?.endsWith('import-theme-assets.ts')) {
  principal().catch((cause: unknown) => {
    console.error(cause)
    process.exit(1)
  })
}

export { DESTINO, ORIGEN }
