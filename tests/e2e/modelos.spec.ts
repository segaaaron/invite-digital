import { expect, test } from '@playwright/test'
import { CATALOG_LISTOS } from '../../src/shared/design/theme-catalog'

/**
 * El escaparate de modelos: las invitaciones que el motor sabe pintar.
 *
 * No necesita sesión ni base sembrada con eventos: la vista previa arma su propio evento
 * de muestra y pinta el contenido que el propio diseño trae. Es lo que la hace servible
 * como escaparate — y lo que hace que esta suite no dependa de fixtures.
 */

const CLAVES = CATALOG_LISTOS.map((entrada) => entrada.key)

/**
 * Los anchos de la maqueta. Estos diseños están dibujados como una columna de teléfono, y
 * el teléfono es donde se abren: es ahí donde un desborde deja media invitación cortada.
 */
const ANCHOS = [
  { nombre: 'teléfono', width: 390, height: 844 },
  { nombre: 'teléfono ancho', width: 559, height: 900 },
  { nombre: 'tableta', width: 820, height: 1180 },
  { nombre: 'portátil', width: 1280, height: 900 },
] as const

/**
 * Un elemento **de contenido** que se sale de la pantalla sin ancestro que lo desplace.
 *
 * `body` lleva `overflow-x: hidden`, así que el desborde no da barra: da contenido
 * cortado, que es peor —la mitad derecha simplemente no existe para quien mira, y nada
 * avisa—.
 *
 * **La decoración se excluye, y no es una excusa.** Estos diseños sangran a propósito: las
 * esquinas florales de la boda botánica cuelgan 46 píxeles fuera del papel, los ramos de
 * fondo 90, y los pétalos caen de lado a lado. Recortarlos por el borde de la ventana es
 * exactamente lo que la maqueta hace y lo que se quiere.
 *
 * La distinción no se inventa aquí: la decoración ya va marcada `aria-hidden` porque un
 * lector de pantalla tampoco tiene nada que hacer con ella. Si un texto o una fotografía
 * del contenido se sale, no lleva esa marca y esta prueba lo caza.
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

  return [...document.querySelectorAll('article *')]
    .filter((el) => el.closest('[aria-hidden="true"]') === null)
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.right > limite + 1 && !puedeDesplazarse(el)
    })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`)
}

/**
 * Un elemento **de contenido** más ancho que la columna en la que está dibujado el diseño.
 *
 * `cortados` caza lo que se sale de la ventana en un teléfono. Esto caza lo contrario y
 * pasó desapercibido tres días: en un portátil, un bloque que se quedó fuera de
 * `ThemeColumn` se estira a lo ancho de la pantalla mientras el resto de la invitación
 * sigue en su columna, y el diseño se parte en dos.
 *
 * No es una molestia estética. La portada de la boda botánica es una fotografía a sangre
 * con `object-fit: cover`: estirada a 1900 píxeles de ancho y 540 de alto, lo que se ve
 * de la pareja es el cielo que tenían detrás, y la invitación se abre en un campo crema
 * vacío con dos nombres flotando.
 *
 * Se miran solo las hojas —una imagen, o un elemento con texto propio—: los contenedores
 * ocupan el ancho de la página a propósito, y la decoración sangra a propósito.
 */
function desbordanLaColumna(tope: number): string[] {
  const centro = document.documentElement.clientWidth / 2
  const izquierda = centro - tope / 2
  const derecha = centro + tope / 2

  return [...document.querySelectorAll('article *')]
    .filter((el) => el.closest('[aria-hidden="true"]') === null)
    .filter((el) => {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 4) return false
      // Se miran las hojas: una imagen, o un elemento con texto propio. Los contenedores
      // ocupan el ancho de la página a propósito.
      const esHoja =
        el.tagName === 'IMG' ||
        [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
      if (!esHoja) return false
      // No es el ancho, es **dónde cae**: una fila de tres piezas repartidas de extremo a
      // extremo tiene tres cajas estrechas y ocupa la pantalla entera.
      return r.left < izquierda - 1 || r.right > derecha + 1
    })
    .slice(0, 5)
    .map((el) => {
      const r = el.getBoundingClientRect()
      const texto = el.tagName === 'IMG' ? (el.getAttribute('src') ?? '') : (el.textContent ?? '')
      return `${el.tagName.toLowerCase()} [${Math.round(r.left)}→${Math.round(r.right)}] «${texto.trim().slice(0, 26)}»`
    })
}

test.describe('el escaparate de modelos', () => {
  test('lista los treinta y cuatro diseños portados de la colección', () => {
    // Si algún día se publica uno sin portar, esta suite recorre uno más y falla al
    // abrirlo. Es lo que impide que el número se desajuste en silencio.
    //
    // Son treinta y cuatro —dieciséis bodas, diecisiete XV y el cumpleaños— y la web vende
    // treinta y tres: «cumple-beer» está portado y todavía no se vende, así que se abre por
    // su dirección —el panel enlaza a ella— y no sale en el catálogo. Lo comprueba la
    // última prueba de este archivo.
    expect(CLAVES).toHaveLength(34)
  })

  for (const clave of CLAVES) {
    test(`«${clave}» se abre y pinta su diseño`, async ({ page }) => {
      const respuesta = await page.goto(`/modelos/es/${clave}`)
      expect(respuesta?.status(), clave).toBe(200)

      // La invitación es un `<article>` con un solo titular: el nombre de quien celebra.
      await expect(page.locator('article')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    })

    test(`«${clave}» no escribe nada desde la vista previa`, async ({ page }) => {
      // Las ranuras son las piezas de verdad y se rellenan, como en la maqueta; lo que
      // `PreviewSlot` corta es el envío. Aquí el token está vacío y una confirmación de
      // mentira acabaría en el panel de alguien. El `submit` se dispara a mano: por el
      // botón, la validación del navegador pararía con el nombre vacío y daría verde sin
      // probar nada.
      await page.goto(`/modelos/es/${clave}`)
      await page.waitForLoadState('networkidle')
      const formularios = page.locator('article form')
      expect(await formularios.count(), clave).toBeGreaterThan(0)

      const envios: string[] = []
      page.on('request', (peticion) => {
        if (peticion.method() === 'POST') envios.push(peticion.url())
      })
      await formularios.evaluateAll((lista) => {
        for (const formulario of lista) {
          formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        }
      })
      await page.waitForTimeout(500)
      expect(envios, clave).toEqual([])
    })
  }

  test('un modelo que no existe responde 404, no el tema por defecto', async ({ page }) => {
    // `themeFor` cae al clásico con una clave desconocida, que es lo correcto para una
    // invitación de verdad y lo incorrecto aquí: sería el tema por defecto con otro nombre.
    const respuesta = await page.goto('/modelos/es/no-existe-este-modelo')
    expect(respuesta?.status()).toBe(404)
  })

  test('el clásico no se vende: no tiene ficha de escaparate', async ({ page }) => {
    const respuesta = await page.goto('/modelos/es/clasico')
    expect(respuesta?.status()).toBe(404)
  })
})

test.describe('los modelos, ancho por ancho', () => {
  for (const ancho of ANCHOS) {
    for (const clave of CLAVES) {
      test(`«${clave}» cabe en ${ancho.nombre} (${ancho.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: ancho.width, height: ancho.height })
        await page.goto(`/modelos/es/${clave}`)
        await page.waitForLoadState('networkidle')

        expect(await page.evaluate(cortados), `${clave} · ${ancho.nombre}`).toEqual([])

        // El `scrollWidth` del documento tiene que quedarse en la ventana: `body` recorta
        // en horizontal, así que si crece es que algo escapó de ese recorte. Un píxel de
        // margen por el redondeo del navegador.
        const documento = await page.evaluate(() => ({
          ancho: document.documentElement.scrollWidth,
          ventana: document.documentElement.clientWidth,
        }))
        expect(documento.ancho, `${clave} · ${ancho.nombre} · scrollWidth`).toBeLessThanOrEqual(
          documento.ventana + 1,
        )
      })
    }
  }
})

test.describe('los modelos, dentro del teléfono', () => {
  /**
   * La maqueta enseña cada invitación dentro de un aparato: una tarjeta de unos 430
   * puntos, centrada, sobre fondo oscuro y sin nada a los lados. No es una decisión de
   * presentación: estos diseños **están dibujados para esa pantalla** —el papel pintado,
   * los pétalos y los degradados llegan a los bordes—, y servidos a lo ancho de un
   * portátil el fondo se derrama y lo que se ve deja de ser el modelo.
   */
  for (const clave of CLAVES) {
    test(`«${clave}» se enseña dentro del marco de teléfono`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`/modelos/es/${clave}`)
      await page.waitForLoadState('networkidle')
      // Con la portada puesta el marco no se desplaza a propósito (`data-portada` en
      // `keyframes.css`): se mide con la invitación abierta, que es lo que se recorre.
      await page.locator('[data-portada]').first().click()
      await expect(page.locator('[data-portada]'), clave).toHaveCount(0)

      const marco = await page.evaluate(() => {
        const nodo = document.querySelector('.theme-phone-frame')
        if (nodo === null) return null
        const r = nodo.getBoundingClientRect()
        const raiz = document.documentElement
        const articulo = document.querySelector('article')?.getBoundingClientRect() ?? null
        return {
          ancho: Math.round(r.width),
          centrado: Math.abs(r.left + r.width / 2 - raiz.clientWidth / 2) < 2,
          desplaza: getComputedStyle(nodo).overflowY,
          articuloDentro: articulo !== null && articulo.left >= r.left - 1 && articulo.right <= r.right + 1,
          // El aparato entero tiene que verse: arriba, abajo y sin que la página se
          // desplace. Con el marco más alto que la ventana, la tarjeta salía cortada por
          // abajo y quien miraba tenía que desplazar la página para ver el borde.
          entero: r.top >= -1 && r.bottom <= raiz.clientHeight + 1,
          paginaDesplaza: raiz.scrollHeight > raiz.clientHeight + 1,
        }
      })

      expect(marco, clave).not.toBeNull()
      expect(marco?.ancho, clave).toBeLessThanOrEqual(440)
      expect(marco?.centrado, clave).toBe(true)
      // El marco es el contenedor de scroll: es lo que ancla los fondos `sticky` a la
      // tarjeta y recorta sus `100vh` en el borde, como el marco de la maqueta.
      expect(marco?.desplaza, clave).toBe('auto')
      expect(marco?.articuloDentro, clave).toBe(true)
      expect(marco?.entero, clave).toBe(true)
      expect(marco?.paginaDesplaza, clave).toBe(false)

      // La cruz de salir: esta pantalla no tiene cabecera ni nada que la enmarque, así que
      // sin ella salir es adivinar cuál de los botones del navegador toca. Va **fuera** de
      // la tarjeta, que es lo único que se viene a ver.
      const salida = page.getByRole('link', { name: /cerrar y volver/i })
      await expect(salida, clave).toBeVisible()
      await salida.click()
      await expect(page, clave).toHaveURL(/\/colecciones/)
    })
  }
})

test.describe('los modelos, en un portátil', () => {
  // `ThemeColumn` limita a 480. El margen es para el redondeo y para los bloques que se
  // salen un pelo por su propio padding, no para un bloque suelto a pantalla completa.
  const COLUMNA = 520

  for (const clave of CLAVES) {
    test(`«${clave}» se queda en su columna a 1440px`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`/modelos/es/${clave}`)
      await page.waitForLoadState('networkidle')

      expect(await page.evaluate(desbordanLaColumna, COLUMNA), clave).toEqual([])
    })
  }
})

test.describe('el catálogo público', () => {
  test('enseña los modelos de una fiesta a la vez: bodas y XV no se mezclan', async ({ page }) => {
    await page.goto('/es/colecciones')
    const pestanas = page.getByRole('navigation', { name: 'Colecciones' })
    await expect(pestanas.getByRole('link', { name: 'Bodas', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('link', { name: /abrir/i })).toHaveCount(8)
    await expect(page.getByRole('link', { name: /abrir/i }).first()).not.toHaveAttribute('href', /\/xv/)

    // La fiesta va en la URL: enlazable, sobrevive a recargar y a volver de una vista previa.
    await pestanas.getByRole('link', { name: 'XV años', exact: true }).click()
    await expect(page).toHaveURL(/fiesta=xv/)
    const enlaces = page.getByRole('link', { name: /abrir/i })
    await expect(enlaces).toHaveCount(8)
    for (const href of await enlaces.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) expect(href).toMatch(/\/modelos\/es\/xv/)
  })

  test('el cumpleaños no se vende todavía: no está en el catálogo, ni indexado', async ({ page }) => {
    // Está portado y solo el admin lo asigna. La dirección existe —el panel enlaza a ella
    // para verlo— y por eso lleva `noindex`; lo que no puede es salir en la web.
    for (const fiesta of ['', '?fiesta=xv']) {
      await page.goto(`/es/colecciones${fiesta}`)
      const hrefs = await page.getByRole('link', { name: /abrir/i }).evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))
      expect(hrefs.filter((href) => href.includes('cumple'))).toEqual([])
    }

    const respuesta = await page.goto('/modelos/es/cumple-beer')
    expect(respuesta?.status()).toBe(200)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('cada tarjeta abre la invitación de verdad', async ({ page }) => {
    // Hasta que existió la vista previa, la tarjeta era un dibujo bonito que no llevaba a
    // ninguna parte: el cliente elegía un modelo y el invitado recibía otra cosa.
    await page.goto('/es/colecciones')

    const primera = page.getByRole('link', { name: /abrir/i }).first()
    await expect(primera).toHaveAttribute('href', /^\/modelos\/es\//)

    await primera.click()
    await expect(page.locator('article')).toBeVisible()
  })
})
