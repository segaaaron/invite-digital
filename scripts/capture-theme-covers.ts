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
 * Qué diseños se capturan. Sin argumentos, todos los portados; con claves sueltas
 * —`pnpm tsx scripts/capture-theme-covers.ts cumple-beer`—, solo esos.
 *
 * Un diseño nuevo no tiene por qué reescribir las dieciséis portadas que ya estaban: las
 * capturas cambian un poco en cada pasada y ese ruido acaba en el repositorio.
 */
/**
 * Los diseños cuya tarjeta es **su portada cerrada**, no la invitación abierta.
 *
 * El guion abre la portada antes de capturar —si no, los ocho de sobre saldrían con la
 * misma fotografía—, y en estos la portada es justo lo que hay que enseñar: «Cervecería
 * Vintage» abierta es madera oscura con una cuenta atrás, que no dice nada del modelo. Y se
 * captura, no se recorta el arte: el nombre de quien cumple lo pinta el diseño encima.
 */
const TARJETA_ES_LA_PORTADA = new Set(['cumple-beer'])

const PEDIDOS = process.argv.slice(2).filter((argumento) => !argumento.startsWith('-'))
const MODELOS = PEDIDOS.length === 0 ? CATALOG_LISTOS : CATALOG_LISTOS.filter((entrada) => PEDIDOS.includes(entrada.key))

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

  if (MODELOS.length === 0) throw new Error(`Ningún modelo del catálogo se llama así: ${PEDIDOS.join(', ')}`)

  for (const entrada of MODELOS) {
    const pagina = await contexto.newPage()
    // `domcontentloaded` y no `networkidle`: contra `next dev` el canal de recarga en
    // caliente deja una conexión abierta y la espera no termina nunca.
    await pagina.goto(`${BASE}/modelos/es/${entrada.key}`, { waitUntil: 'domcontentloaded' })
    await pagina
      .evaluate(async () => {
        for (const imagen of document.images) imagen.loading = 'eager'
        await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))))
      })
      .catch(() => {})

    // Las tipografías tardan más que la red: capturar antes deja el diseño con la fuente
    // de respaldo, que es justo lo que la portada no puede enseñar.
    await pagina.evaluate(() => document.fonts.ready)
    await pagina.waitForTimeout(1200)

    // La portada de apertura se abre antes de capturar. La tarjeta del catálogo tiene que
    // enseñar **el diseño**, y con la portada puesta los ocho de sobre saldrían con la misma
    // fotografía de un sobre y no habría forma de distinguirlos en la rejilla.
    const portada = pagina.getByRole('button', { name: /abrir la invitaci/i })
    if ((await portada.count()) > 0 && !TARJETA_ES_LA_PORTADA.has(entrada.key)) {
      await portada.first().click()
      await pagina.waitForTimeout(600)
    }

    // Se captura **el aparato**, no la ventana: la vista previa enseña la invitación dentro
    // de un marco de teléfono sobre fondo oscuro, y una portada con esa moldura y sus bandas
    // negras no es la portada del modelo.
    const marco = pagina.locator('.theme-phone-frame')
    const captura = await ((await marco.count()) > 0 ? marco.screenshot({ type: 'png' }) : pagina.screenshot({ type: 'png' }))

    await sharp(captura)
      // La tarjeta del catálogo es 5:7 y el teléfono es más alargado: se recorta por arriba,
      // que es donde estos diseños ponen el nombre y la fotografía.
      .resize({ width: ANCHO, height: ALTO, fit: 'cover', position: 'top' })
      .avif({ quality: 62, effort: 6 })
      .toFile(`${DESTINO}/${entrada.key}.avif`)

    console.log('· %s', entrada.key)
    await pagina.close()
  }

  await navegador.close()
  console.log('%d portadas en %s', MODELOS.length, DESTINO)
}

principal().catch((cause: unknown) => {
  console.error(cause)
  process.exit(1)
})
