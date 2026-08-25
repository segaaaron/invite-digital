import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { createEvent, createGuestGroup } from './helpers/panel'

/**
 * Conexión propia, no la de `fixtures/db`: ese módulo lo comparten varias suites del
 * mismo worker, y el primer `afterAll` que cierre el pool deja a las demás escribiendo
 * contra una conexión muerta —«write CONNECTION_ENDED», en una prueba que ni siquiera
 * toca la base—. Es la regla del proyecto: cada suite abre la suya.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const borrarEvento = async (slug: string): Promise<void> => {
  await sql`delete from events where slug = ${slug}`
}

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-responsive-e2e'

/**
 * El panel entero, ancho por ancho.
 *
 * Lo que se mide **no** es `scrollWidth` de la página: `body` lleva `overflow-x: hidden`,
 * así que un desborde no produce barra horizontal —produce contenido **cortado**, que es
 * peor: la mitad derecha de una tabla simplemente no existe para quien mira el teléfono, y
 * nada avisa—. Lo que se busca es exactamente eso: un elemento que se salga de la pantalla
 * sin ningún ancestro que pueda desplazarlo.
 *
 * Se escapa con facilidad y vuelve en cuanto alguien añade una columna a una tabla.
 */
function cortados(): string[] {
  const limite = document.documentElement.clientWidth
  const puedeDesplazarse = (el: Element): boolean => {
    for (let a = el.parentElement; a !== null; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    return false
  }

  return [...document.querySelectorAll('main *')]
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.right > limite + 1 && !puedeDesplazarse(el)
    })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`)
}

/**
 * La otra mitad del desborde, la que `cortados` no ve.
 *
 * Un elemento **absolutamente posicionado** dentro de un contenedor con `overflow-x: auto`
 * no se recorta si el bloque que lo contiene está más arriba —el `div` del scroll es
 * `static`, así que su bloque contenedor acaba siendo el `main`, que sí es `relative`—. El
 * caso real fue un `span.sr-only` de una cabecera de tabla: mide 1 px, nadie lo ve, y
 * estiraba el documento de 390 a 709 px en el teléfono. Como tiene un ancestro con scroll,
 * `cortados` lo daba por bueno; el `scrollWidth` del documento no.
 */
function anchoDocumento(): { ancho: number; ventana: number } {
  return { ancho: document.documentElement.scrollWidth, ventana: document.documentElement.clientWidth }
}
const VISTAS = [
  ['resumen', ''],
  ['invitados', '/invitados'],
  ['mesas', '/mesas'],
  ['mesas · tarjetas', '/mesas?vista=tarjetas'],
  ['regalos', '/regalos'],
  ['regalos · lista', '/regalos?vista=regalos'],
  ['mensajes', '/mensajes'],
  ['check-in', '/checkin'],
  ['estadísticas', '/estadisticas'],
  ['configuración', '/configuracion'],
  ['plan', '/plan'],
] as const

/**
 * Los anchos son los cortes de la maqueta —860 para la carcasa, 900 para las rejillas de
 * dos y cuatro columnas, 560 para el teléfono—, medidos un píxel por debajo y otro por
 * encima donde importa: el fallo que se buscaba vivía **entre** dos cortes, con la barra
 * ya en columna y la rejilla todavía en una sola.
 */
const ANCHOS = [
  { nombre: 'teléfono', width: 390, height: 844 },
  { nombre: 'teléfono ancho', width: 559, height: 900 },
  { nombre: 'tableta', width: 820, height: 1180 },
  { nombre: 'tableta ancha', width: 899, height: 1180 },
  { nombre: 'portátil', width: 1024, height: 800 },
] as const

test.beforeAll(async () => {
  await borrarEvento(SLUG)
})

test.afterAll(async () => {
  await borrarEvento(SLUG)
  await sql.end({ timeout: 5 })
})

test('ninguna vista del panel desborda a lo ancho en teléfono ni en tableta', async ({ page }) => {
  // Once vistas por cinco anchos son cincuenta y cinco navegaciones: no caben en el
  // límite de treinta segundos, y agotarlo se lee como un desborde que no existe.
  test.setTimeout(240_000)
  await createEvent(page, { slug: SLUG, title: 'Boda responsive e2e' })
  // Con datos dentro: una tabla vacía cabe en cualquier pantalla y no probaría nada.
  await createGuestGroup(page, SLUG, 'Familia Rojas Peña', 4)

  for (const tamano of ANCHOS) {
    await page.setViewportSize({ width: tamano.width, height: tamano.height })

    for (const [nombre, ruta] of VISTAS) {
      await page.goto(`/panel/eventos/${SLUG}${ruta}`)
      await page.waitForLoadState('networkidle')

      const fuera = await page.evaluate(cortados)
      expect(fuera, `${nombre} deja contenido fuera de la pantalla en ${tamano.nombre}`).toEqual([])

      const doc = await page.evaluate(anchoDocumento)
      expect(doc.ancho, `${nombre} estira el documento en ${tamano.nombre}`).toBeLessThanOrEqual(doc.ventana)
    }
  }
})

/**
 * Las vistas del atelier que no cuelgan de un evento. Van aparte porque no llevan `slug`
 * en la ruta, no porque importen menos: la de pedidos enseña referencias en monoespaciada
 * y enlaces con el nombre del fichero que subió el cliente, que es exactamente la clase de
 * texto largo que estira un documento.
 */
const VISTAS_ATELIER = [
  ['ayuda', '/panel/ayuda'],
  ['pedidos', '/panel/pedidos'],
] as const

test('las vistas del atelier tampoco desbordan', async ({ page }) => {
  for (const tamano of ANCHOS) {
    await page.setViewportSize({ width: tamano.width, height: tamano.height })

    for (const [nombre, ruta] of VISTAS_ATELIER) {
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')

      const fuera = await page.evaluate(cortados)
      expect(fuera, `${nombre} deja contenido fuera de la pantalla en ${tamano.nombre}`).toEqual([])

      const doc = await page.evaluate(anchoDocumento)
      expect(doc.ancho, `${nombre} estira el documento en ${tamano.nombre}`).toBeLessThanOrEqual(doc.ventana)
    }
  }
})

test('las páginas públicas del pedido tampoco desbordan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/es/pedido/firma-3d')
  await page.waitForLoadState('networkidle')
  expect(await page.evaluate(cortados)).toEqual([])
  const alta = await page.evaluate(anchoDocumento)
  expect(alta.ancho).toBeLessThanOrEqual(alta.ventana)
})
