/**
 * Captura la portada de cada diseño para el catálogo.
 *
 * La tarjeta de papel que el catálogo dibuja es elegante y es la de la maqueta, pero es un
 * dibujo: no enseña el diseño. Esto guarda una fotografía real de cada invitación, que es
 * lo que el cliente viene a mirar.
 *
 * Requiere el sitio compilado y servido:
 *
 *   pnpm build && pnpm start --port 3100
 *   SITE_URL=http://localhost:3100 pnpm tsx scripts/capture-theme-covers.ts
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { CATALOG_LISTOS } from '@/shared/design/theme-catalog'

const BASE = process.env.SITE_URL ?? 'http://localhost:3100'
const DESTINO = 'public/templates'

/**
 * El tamaño de la captura.
 *
 * La tarjeta del catálogo tiene proporción 5:7, así que se captura en esa proporción y no
 * en la de la pantalla: recortar después dejaría la mitad del diseño fuera. 560 de ancho
 * es el corte al que estos diseños siguen componiéndose como columna.
 */
const ANCHO = 560
const ALTO = Math.round((ANCHO * 7) / 5)

async function principal(): Promise<void> {
  await mkdir(DESTINO, { recursive: true })

  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({
    viewport: { width: ANCHO, height: ALTO },
    deviceScaleFactor: 2,
    // Sin animación: una portada que cambia sola cada vez que se regenera no sirve de
    // portada, y con las partículas en marcha cada captura sale distinta.
    reducedMotion: 'reduce',
  })

  for (const entrada of CATALOG_LISTOS) {
    const pagina = await contexto.newPage()
    await pagina.goto(`${BASE}/modelos/es/${entrada.key}`, { waitUntil: 'networkidle' })

    // Las tipografías tardan más que la red: capturar antes deja el diseño con la fuente
    // de respaldo, que es justo lo que la portada no puede enseñar.
    await pagina.evaluate(() => document.fonts.ready)
    await pagina.waitForTimeout(1200)

    const captura = await pagina.screenshot({ type: 'png' })
    await sharp(captura).avif({ quality: 62, effort: 6 }).toFile(`${DESTINO}/${entrada.key}.avif`)

    console.log('· %s', entrada.key)
    await pagina.close()
  }

  await navegador.close()
  console.log('%d portadas en %s', CATALOG_LISTOS.length, DESTINO)
}

principal().catch((cause: unknown) => {
  console.error(cause)
  process.exit(1)
})
