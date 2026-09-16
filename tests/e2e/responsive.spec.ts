import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE, AUTH_STATE } from './fixtures/atelier'
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
  ['invitados · grupos', '/invitados?vista=grupos'],
  ['invitados · importar', '/invitados?panel=importar'],
  ['mesas', '/mesas'],
  ['mesas · tarjetas', '/mesas?vista=tarjetas'],
  ['regalos', '/regalos'],
  ['regalos · lista', '/regalos?vista=regalos'],
  ['mensajes', '/mensajes'],
  ['check-in', '/checkin'],
  ['códigos qr', '/qr'],
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
  // Trece vistas por cinco anchos son sesenta y cinco navegaciones: no caben en el
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
 * en la ruta, no porque importen menos.
 */
const VISTAS_ATELIER = [['ayuda', '/panel/ayuda']] as const

/** Las del administrador, que necesitan su propia sesión: a un atelier le dan 404. */
const VISTAS_ADMIN = [
  // Los pedidos están aquí y no con las del atelier desde que aprobar crea la cuenta del
  // cliente y un evento: es del admin, y a un atelier le responde 404. La vista sigue
  // siendo la que más estira el documento —referencias en monoespaciada y el nombre del
  // fichero que subió el cliente—, así que se mide igual, solo que con la sesión correcta.
  ['pedidos', '/panel/pedidos'],
  ['admin · hoy', '/panel/admin'],
  ['admin · consultas', '/panel/admin/consultas'],
  ['admin · eventos', '/panel/admin/eventos'],
  // El alta abierta: cinco campos en dos columnas que en un teléfono tienen que apilarse.
  ['admin · eventos · alta', '/panel/admin/eventos?panel=nueva'],
  ['admin · ingresos', '/panel/admin/ingresos'],
  ['admin · planes', '/panel/admin/planes'],
  ['admin · extras', '/panel/admin/extras'],
  ['admin · modelos', '/panel/admin/modelos'],
  ['admin · la web', '/panel/admin/web'],
  ['admin · usuarios', '/panel/admin/usuarios'],
  // El alta abierta: el rol en tarjetas y la contraseña inicial, que en un teléfono se apilan.
  ['admin · usuarios · alta', '/panel/admin/usuarios?panel=alta'],
  ['admin · mi cuenta', '/panel/cuenta'],
  ['admin · cobros', '/panel/admin/pagos'],
  ['admin · auditoría', '/panel/admin/auditoria'],
] as const

/**
 * La puerta del panel va aparte de todas: es la única pantalla **sin sesión**, y en ella
 * la mitad oscura de la marca desaparece por debajo de 860. Media pantalla de decoración
 * en un teléfono dejaría el formulario por debajo del pliegue.
 */
test('la puerta del panel no desborda en ningún ancho', async ({ browser }) => {
  const anonima = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.8' } })
  const page = await anonima.newPage()

  for (const tamano of ANCHOS) {
    await page.setViewportSize({ width: tamano.width, height: tamano.height })
    await page.goto('/panel/entrar')
    await page.waitForLoadState('networkidle')

    const fuera = await page.evaluate(cortados)
    expect(fuera, `la puerta deja contenido fuera de la pantalla en ${tamano.nombre}`).toEqual([])

    const doc = await page.evaluate(anchoDocumento)
    expect(doc.ancho, `la puerta estira el documento en ${tamano.nombre}`).toBeLessThanOrEqual(doc.ventana)

    // El formulario entra sin desplazar: es lo único que se viene a hacer a esta página.
    const boton = page.getByRole('button', { name: 'Entrar' })
    await expect(boton).toBeInViewport()
  }

  await anonima.close()
})

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

test('las vistas del administrador tampoco desbordan', async ({ browser }) => {
  // Trece pantallas por cinco anchos son sesenta y cinco cargas con `networkidle`: no caben
  // en los 30 s por defecto desde que el admin tiene Hoy, Consultas, Ingresos, Planes y
  // Modelos. Partirla en una prueba por pantalla repetiría el contexto de sesión trece veces.
  test.setTimeout(150_000)
  const sesion = await browser.newContext({ storageState: ADMIN_AUTH_STATE })
  const page = await sesion.newPage()

  for (const tamano of ANCHOS) {
    await page.setViewportSize({ width: tamano.width, height: tamano.height })

    for (const [nombre, ruta] of VISTAS_ADMIN) {
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')

      const fuera = await page.evaluate(cortados)
      expect(fuera, `${nombre} deja contenido fuera de la pantalla en ${tamano.nombre}`).toEqual([])

      const doc = await page.evaluate(anchoDocumento)
      expect(doc.ancho, `${nombre} estira el documento en ${tamano.nombre}`).toBeLessThanOrEqual(doc.ventana)
    }
  }

  await sesion.close()
})

test('las páginas públicas del pedido tampoco desbordan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/es/pedido/firma-3d')
  await page.waitForLoadState('networkidle')
  expect(await page.evaluate(cortados)).toEqual([])
  const alta = await page.evaluate(anchoDocumento)
  expect(alta.ancho).toBeLessThanOrEqual(alta.ventana)
})

test('las páginas de cada fiesta y la de colecciones tampoco desbordan', async ({ page }) => {
  for (const ancho of [390, 820, 1280]) {
    await page.setViewportSize({ width: ancho, height: 900 })
    for (const ruta of ['/es/bodas', '/es/xv-anos', '/es/colecciones?fiesta=xv']) {
      await page.goto(ruta)
      await page.waitForLoadState('domcontentloaded')
      expect(await page.evaluate(anchoDocumento), `${ruta} a ${ancho}`).toMatchObject({ ancho: expect.any(Number) })
      const doc = await page.evaluate(anchoDocumento)
      expect(doc.ancho, `${ruta} estira el documento a ${ancho}`).toBeLessThanOrEqual(doc.ventana)
    }
  }
})
