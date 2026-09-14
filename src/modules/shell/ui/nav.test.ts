import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { panelNav } from './nav'

const enlaces = (slug: string | null): string[] =>
  panelNav(slug, {}, true)
    .flatMap((seccion) => seccion.items)
    .map((item) => item.href)
    .filter((href): href is string => href !== null)

describe('panelNav', () => {
  it('ningún enlace es un ancla', () => {
    // «Vista previa» apuntaba a `/configuracion#vista-previa`, y ese `id` no existía en
    // ninguna página: pulsarlo dejaba al atelier en Configuración sin que nada pasara. Un
    // ancla en la barra es una promesa que nadie comprueba.
    for (const href of enlaces('boda')) expect(href).not.toContain('#')
  })

  it('cada enlace del evento lleva a una ruta que existe', () => {
    // La barra es lo primero que se pulsa. Un enlace a una carpeta que no está es un 404
    // servido por nuestra propia navegación, y el typecheck no ve una cadena.
    const raiz = join(process.cwd(), 'src/app/(panel)/panel/eventos/[slug]')
    const segmentos = new Set<string>()
    const recorrer = (directorio: string) => {
      for (const entrada of readdirSync(directorio)) {
        const camino = join(directorio, entrada)
        if (!statSync(camino).isDirectory()) continue
        // Los grupos de rutas —`(gestion)`— no son un segmento de la dirección.
        if (entrada.startsWith('(')) recorrer(camino)
        else segmentos.add(entrada)
      }
    }
    recorrer(raiz)

    for (const href of enlaces('boda')) {
      if (!href.startsWith('/panel/eventos/boda/')) continue
      expect(segmentos).toContain(href.replace('/panel/eventos/boda/', '').split('/')[0])
    }
  })

  it('sin ningún evento, los enlaces del evento se apagan en vez de desaparecer', () => {
    const seccionDelEvento = panelNav(null)[0]
    expect(seccionDelEvento?.items.every((item) => item.href === null)).toBe(true)
  })

  it('la barra del cliente no enseña lo que es del atelier', () => {
    // Esconder el enlace no es la protección —esa es la sección que pide cada página—,
    // pero enseñarle el plan o el check-in sería enseñarle enlaces que le devuelven 404.
    //
    // **`/configuracion` salió de esta lista a propósito.** Es la pantalla donde escribe
    // su invitación —los textos y la canción que sube—, y para eso el admin le da acceso.
    // Lo que sigue siendo del atelier son las tarjetas de dentro —diseño, `slug`,
    // contraseña y borrado—, que esa página no le pinta y cuyas acciones piden `full`.
    const delCliente = panelNav('boda', {}, false, false, true)
      .flatMap((seccion) => seccion.items)
      .map((item) => item.href)

    for (const prohibido of ['/plan', '/qr', '/checkin']) {
      expect(delCliente).not.toContain(`/panel/eventos/boda${prohibido}`)
    }
    expect(delCliente).not.toContain('/panel/pedidos')
    expect(delCliente).not.toContain('/panel')
  })

  it('y sí enseña lo suyo: invitados, mesas, regalos, mensajes y su invitación', () => {
    const delCliente = panelNav('boda', {}, false, false, true)
      .flatMap((seccion) => seccion.items)
      .map((item) => item.href)

    // `/configuracion` está aquí desde que el cliente escribe su propia invitación: es la
    // pantalla donde cambia sus textos y elige la canción que sube. Se fija por los dos
    // lados —lo prohibido arriba, lo suyo aquí— porque un corte vigilado solo por un lado
    // se afloja sin que ninguna prueba lo diga.
    for (const suyo of [
      '/invitados',
      '/mesas',
      '/regalos',
      '/mensajes',
      '/configuracion',
      '/vista-previa',
      '/estadisticas',
    ]) {
      expect(delCliente).toContain(`/panel/eventos/boda${suyo}`)
    }
  })

  it('la vista previa es su propia pantalla, no un trozo de Configuración', () => {
    const diseno = panelNav('boda').find((seccion) => seccion.label === 'Diseño')
    const previa = diseno?.items.find((item) => item.label === 'Vista previa')
    expect(previa?.href).toBe('/panel/eventos/boda/vista-previa')
  })
})
