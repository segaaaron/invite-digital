/**
 * Capturas de las pantallas, de golpe y a fichero.
 *
 * Existe porque mirar dieciséis invitaciones abriendo pestañas a mano es lo más lento que
 * se hace en este proyecto: cada modelo son una navegación, una espera a que bajen las
 * fotografías y una captura, y son dieciséis por cada cambio de piel. Esto lo hace en un
 * comando y deja los PNG en `.shots/`, listos para mirarlos uno detrás de otro.
 *
 *   pnpm shots                      · los dieciséis modelos a 1440×900
 *   pnpm shots --ancho 390          · los dieciséis en un teléfono
 *   pnpm shots --url /es/colecciones --url /panel  · rutas sueltas
 *   pnpm shots --base http://localhost:3100        · contra otro servidor
 *
 * Va contra el servidor que ya esté levantado —`pnpm dev` en el 3000 por defecto—, así que
 * **no construye nada**. Para lo que necesita sesión hay que tener el `.auth` de las e2e.
 */

import { mkdir, rm } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { CATALOG_LISTOS } from '../src/shared/design/theme-catalog'

const args = process.argv.slice(2)
const valor = (nombre: string): string | undefined => {
  const i = args.indexOf(`--${nombre}`)
  return i === -1 ? undefined : args[i + 1]
}
const todos = (nombre: string): string[] =>
  args.flatMap((arg, i) => (arg === `--${nombre}` && args[i + 1] !== undefined ? [args[i + 1] as string] : []))

const BASE = valor('base') ?? 'http://localhost:3000'
const ANCHO = Number(valor('ancho') ?? 1440)
const ALTO = Number(valor('alto') ?? 900)
const SALIDA = valor('salida') ?? '.shots'

/** Sin `--url`, los dieciséis modelos: es para lo que se escribió. */
const rutas = todos('url')
const objetivos =
  rutas.length > 0
    ? rutas.map((ruta) => ({ nombre: ruta.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'raiz', ruta }))
    : CATALOG_LISTOS.map((entrada) => ({ nombre: entrada.key, ruta: `/modelos/es/${entrada.key}` }))

async function main(): Promise<void> {
  await rm(SALIDA, { recursive: true, force: true })
  await mkdir(SALIDA, { recursive: true })

  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({ viewport: { width: ANCHO, height: ALTO } })
  const pagina = await contexto.newPage()

  for (const objetivo of objetivos) {
    // `domcontentloaded`, nunca `networkidle`: en desarrollo el canal de recarga en
    // caliente deja una conexión abierta para siempre y la espera no termina nunca. Lo que
    // hay que esperar son las imágenes, y eso se pide abajo.
    const respuesta = await pagina.goto(`${BASE}${objetivo.ruta}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    // Las fotografías van `loading="lazy"`: sin esperar a que estén decodificadas, la
    // captura sale con los huecos en blanco y parece un fallo que no existe.
    await pagina
      .evaluate(async () => {
        // Las `loading="lazy"` fuera de pantalla no bajan solas: se fuerzan antes de mirar.
        for (const imagen of document.images) imagen.loading = 'eager'
        await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))))
      })
      .catch(() => {})
    await pagina.waitForTimeout(600)
    await pagina.screenshot({ path: `${SALIDA}/${objetivo.nombre}.png` })
    console.log(`${respuesta?.status() ?? '???'}  ${objetivo.ruta}  →  ${SALIDA}/${objetivo.nombre}.png`)
  }

  await navegador.close()
  console.log(`\n${objetivos.length} capturas en ${SALIDA}/ a ${ANCHO}×${ALTO}.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
