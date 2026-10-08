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

  // La invitación de muestra (`article`) va dentro de su marco de teléfono, que recorta su propio arte a
  // propósito: es el diseño que se vende y tiene sus pruebas de fidelidad.
  return [...document.querySelectorAll('main *')]
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.right > limite + 1 && !puedeDesplazarse(el) && el.closest('article') === null
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
/**
 * **El panel en el celular y la tableta, medido** (6 de octubre; la meta del roadmap desde el 7): los botones,
 * enlaces y campos del panel se tocan con el dedo (**44 px** de alto, lo que pide Apple) y la letra se lee
 * sin esfuerzo (**12 px**). Hubo 270 toques pequeños y 744 textos diminutos en 19 pantallas. Se mide por
 * debajo de 860 px, donde el panel deja la barra lateral.
 *
 * Fuera de la medida: lo que va dentro de una invitación (`article`, el diseño que se vende), lo oculto,
 * los enlaces dentro de un párrafo y el plano del salón (sus sillas son un dibujo a escala).
 */
function enElCelular(): { chicos: string[]; letra: string[] } {
  const visible = (el: Element) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1
  }
  const fuera = (el: Element) => el.closest('article, [aria-hidden="true"], dialog:not([open]), .plano-del-salon') !== null
  // Una casilla dentro de su etiqueta se toca por la etiqueta; un nombre cuya tarjeta entera es el enlace
  // (`after:inset-0`), por la tarjeta; lo plegado en un `<details>` cerrado no se ve.
  const porSuEtiqueta = (el: Element) => (el as HTMLInputElement).type === 'checkbox' || (el as HTMLInputElement).type === 'radio' ? (el.closest('label')?.getBoundingClientRect().height ?? 0) >= 44 : false
  const plegado = (el: Element) => { const d = el.closest('details'); return d !== null && !d.open && el.tagName !== 'SUMMARY' }
  const chicos = [...document.querySelectorAll('main :is(a[href], button, select, summary, input:not([type="hidden"]), textarea, [role="button"], [role="tab"]), nav[aria-label="Navegación principal"] :is(a, button)')]
    .filter((el) => visible(el) && !fuera(el) && el.closest('p') === null && !porSuEtiqueta(el) && !plegado(el) && !/after:inset-0/.test(String(el.className)))
    // Medio píxel de tolerancia: a 360 px un botón de 44 px puede medir 43,98 por el redondeo de subpíxel.
    .filter((el) => el.getBoundingClientRect().height < 43.5)
    .map((el) => `${el.tagName.toLowerCase()} «${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().height)} px`)
  const letra = [...document.querySelectorAll('main *')]
    .filter((el) => visible(el) && !fuera(el) && [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== ''))
    .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 12)
    .map((el) => `«${(el.textContent ?? '').trim().slice(0, 30)}» ${getComputedStyle(el).fontSize}`)
  return { chicos: [...new Set(chicos)].slice(0, 8), letra: [...new Set(letra)].slice(0, 8) }
}

const VISTAS = [
  ['resumen', ''],
  ['invitados', '/invitados'],
  ['invitados · importar', '/invitados?panel=importar'],
  ['invitados · enviar', '/invitados?panel=envio'],
  ['mesas', '/mesas'],
  ['mesas · tarjetas', '/mesas?vista=tarjetas'],
  ['regalos', '/regalos'],
  ['regalos · lista', '/regalos?vista=regalos'],
  ['mensajes', '/mensajes'],
  ['check-in', '/checkin'],
  ['códigos qr', '/qr'],
  ['configuración', '/configuracion'],
  ['configuración · ver cómo queda', '/configuracion?ver=1'],
  ['plan', '/plan'],
] as const

/**
 * Los anchos son los cortes de la maqueta —860 para la carcasa, 900 para las rejillas de
 * dos y cuatro columnas, 560 para el teléfono—, medidos un píxel por debajo y otro por
 * encima donde importa: el fallo que se buscaba vivía **entre** dos cortes, con la barra
 * ya en columna y la rejilla todavía en una sola.
 */
const ANCHOS = [
  { nombre: 'teléfono chico', width: 360, height: 780 },
  { nombre: 'teléfono', width: 390, height: 844 },
  { nombre: 'teléfono ancho', width: 559, height: 900 },
  { nombre: 'tableta vertical', width: 768, height: 1024 },
  { nombre: 'tableta', width: 820, height: 1180 },
  { nombre: 'tableta ancha', width: 899, height: 1180 },
  { nombre: 'portátil', width: 1024, height: 800 },
] as const

test.beforeAll(async ({ browser }) => {
  await borrarEvento(SLUG)
  // Con datos dentro: una tabla vacía cabe en cualquier pantalla y no probaría nada.
  const contexto = await browser.newContext({ storageState: AUTH_STATE })
  const page = await contexto.newPage()
  await createEvent(page, { slug: SLUG, title: 'Boda responsive e2e' })
  await createGuestGroup(page, SLUG, 'Familia Rojas Peña', 4)
  await contexto.close()
})

test.afterAll(async () => {
  await borrarEvento(SLUG)
  await sql.end({ timeout: 5 })
})

// Una prueba por ancho: quince vistas por siete anchos, con la medida de toques y letra, no cabían en una.
for (const tamano of ANCHOS) {
  test(`ninguna vista del panel desborda en ${tamano.nombre} (${tamano.width} px)`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: tamano.width, height: tamano.height })

    for (const [nombre, ruta] of VISTAS) {
      // `load`, no `networkidle`: la campana y las novedades en vivo dejan su conexión abierta (ver abajo).
      await page.goto(`/panel/eventos/${SLUG}${ruta}`)
      await page.waitForLoadState('load')

      const fuera = await page.evaluate(cortados)
      expect(fuera, `${nombre} deja contenido fuera de la pantalla en ${tamano.nombre}`).toEqual([])

      const doc = await page.evaluate(anchoDocumento)
      expect(doc.ancho, `${nombre} estira el documento en ${tamano.nombre}`).toBeLessThanOrEqual(doc.ventana)

      if (tamano.width < 860) {
        const medida = await page.evaluate(enElCelular)
        expect(medida.chicos, `${nombre}: toques de menos de 44 px en ${tamano.nombre}`).toEqual([])
        expect(medida.letra, `${nombre}: letra de menos de 12 px en ${tamano.nombre}`).toEqual([])
      }
    }
  })
}

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
  // El tablero de seis etapas: en el teléfono se apilan; en escritorio se desplaza dentro de sí.
  ['admin · ventas', '/panel/admin/ventas'],
  ['admin · clientes', '/panel/admin/clientes'],
  ['admin · eventos', '/panel/admin/eventos'],
  // El alta abierta: cinco campos en dos columnas que en un teléfono tienen que apilarse.
  ['admin · eventos · alta', '/panel/admin/eventos?crear=evento'],
  ['admin · calendario', '/panel/admin/eventos/calendario'],
  ['admin · ventas', '/panel/admin/ventas'],
  ['admin · ventas · lista', '/panel/admin/ventas?vista=lista'],
  ['admin · ventas · cotizador', '/panel/admin/ventas?crear=cotizacion'],
  ['admin · clientes', '/panel/admin/clientes'],
  ['admin · mensajes y agenda', '/panel/admin/mensajes'],
  ['admin · ingresos', '/panel/admin/ingresos'],
  ['admin · planes', '/panel/admin/planes'],
  ['admin · extras', '/panel/admin/extras'],
  ['admin · modelos', '/panel/admin/modelos'],
  ['admin · la web', '/panel/admin/web'],
  ['admin · usuarios', '/panel/admin/usuarios'],
  // El alta abierta: el rol en tarjetas, que en un teléfono se apilan.
  ['admin · usuarios · alta', '/panel/admin/usuarios?crear=persona'],
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

for (const tamano of ANCHOS) {
  test(`las vistas del administrador tampoco desbordan en ${tamano.nombre} (${tamano.width} px)`, async ({ browser }) => {
    // Veintitrés pantallas y, por debajo de 860 px, la medida de toques y letra.
    test.setTimeout(240_000)
    const sesion = await browser.newContext({ storageState: ADMIN_AUTH_STATE })
    const page = await sesion.newPage()
    await page.setViewportSize({ width: tamano.width, height: tamano.height })

    for (const [nombre, ruta] of VISTAS_ADMIN) {
      // `load`, no `networkidle`: la campana del admin deja abierta su conexión en vivo y, según cuándo
      // conecte, la red no queda quieta nunca (se colgaba en una pantalla distinta cada vez).
      await page.goto(ruta)
      await page.waitForLoadState('load')

      const fuera = await page.evaluate(cortados)
      expect(fuera, `${nombre} deja contenido fuera de la pantalla en ${tamano.nombre}`).toEqual([])

      const doc = await page.evaluate(anchoDocumento)
      expect(doc.ancho, `${nombre} estira el documento en ${tamano.nombre}`).toBeLessThanOrEqual(doc.ventana)

      if (tamano.width < 860) {
        const medida = await page.evaluate(enElCelular)
        expect(medida.chicos, `${nombre}: toques de menos de 44 px en ${tamano.nombre}`).toEqual([])
        expect(medida.letra, `${nombre}: letra de menos de 12 px en ${tamano.nombre}`).toEqual([])
      }
    }

    await sesion.close()
  })
}

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
