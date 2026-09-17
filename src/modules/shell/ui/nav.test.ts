import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { panelNav } from './nav'

// El atelier dueño y el admin juntos: entre los dos pintan todos los enlaces que existen.
const enlaces = (slug: string | null): string[] =>
  [...panelNav(slug, {}, true), ...panelNav(slug, {}, false)]
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

  it('nunca pinta un enlace apagado: lo que no lleva a ninguna parte no sale', () => {
    // Cada rol ve solo lo suyo. Una fila apagada es una opción que ese rol no tiene,
    // enseñada igual.
    for (const [slug, admin, puerta, cliente] of [
      [null, false, false, false],
      [null, true, false, false],
      [null, false, false, true],
      [null, false, true, false],
      ['boda', true, false, false],
    ] as const) {
      const secciones = panelNav(slug, {}, admin, puerta, cliente)
      for (const seccion of secciones) {
        expect(seccion.items.length).toBeGreaterThan(0)
        for (const item of seccion.items) expect(item.href).not.toBeNull()
      }
    }
  })

  it('el atelier sin evento ve su cuenta, no las secciones del evento', () => {
    const secciones = panelNav(null)
    expect(secciones.map((seccion) => seccion.label)).toEqual(['Cuenta'])
    expect(secciones[0]?.items.map((item) => item.href)).toEqual(['/panel/cuenta', '/panel', '/panel/ayuda'])
  })

  it('el admin fuera de un evento ve la administración y su cuenta, sin repetir «Todos los eventos»', () => {
    const secciones = panelNav(null, {}, true)
    expect(secciones.map((seccion) => seccion.label)).toEqual(['Día a día', 'Negocio', 'Sistema', 'Cuenta'])
    const hrefs = secciones.flatMap((seccion) => seccion.items).map((item) => item.href)
    expect(hrefs).not.toContain('/panel')
    expect(hrefs).not.toContain('/panel/ayuda')
    expect(hrefs).toContain('/panel/admin/eventos')
    // «Hoy» abre la administración y «Consultas» va justo detrás: son lo que se mira cada día.
    expect(hrefs.slice(0, 2)).toEqual(['/panel/admin', '/panel/admin/consultas'])
  })

  it('el admin llega a planes, ingresos y modelos desde la barra', () => {
    const hrefs = panelNav(null, {}, true).flatMap((seccion) => seccion.items).map((item) => item.href)
    for (const ruta of ['/panel/admin/planes', '/panel/admin/extras', '/panel/admin/ingresos', '/panel/admin/modelos']) expect(hrefs).toContain(ruta)
    // Y un atelier no: esas pantallas son del dinero de Luxury Atelier.
    const delAtelier = panelNav('boda').flatMap((seccion) => seccion.items).map((item) => item.href)
    expect(delAtelier.some((href) => href.startsWith('/panel/admin'))).toBe(false)
  })

  it('la insignia de consultas cuenta las nuevas', () => {
    const consultas = panelNav(null, { consultas: 3 }, true)
      .flatMap((seccion) => seccion.items)
      .find((item) => item.href === '/panel/admin/consultas')
    expect(consultas?.count).toBe(3)
    expect(consultas?.countLabel).toBe('nuevas')
  })

  it('el admin dentro de una boda ve solo el menú de esa boda, sin la administración mezclada', () => {
    const secciones = panelNav('boda', {}, true)
    expect(secciones.map((seccion) => seccion.label)).toEqual(['Este evento'])
    expect(secciones[0]?.items.map((item) => item.href)).toEqual([
      '/panel/eventos/boda/configuracion',
      '/panel/eventos/boda/vista-previa',
    ])
    const todas = secciones.flatMap((seccion) => seccion.items.map((item) => item.href))
    // Nada de la administración: se sale del evento con «← Volver», no por un enlace suelto.
    expect(todas.some((href) => href.startsWith('/panel/admin'))).toBe(false)
    // Los datos de la boda son del cliente: para verlos entra como el cliente.
    for (const ruta of ['/invitados', '/mensajes', '/mesas', '/planner/tareas', '/extras', '/porteros']) {
      expect(todas).not.toContain(`/panel/eventos/boda${ruta}`)
    }
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

    for (const prohibido of ['/plan', '/qr']) {
      expect(delCliente).not.toContain(`/panel/eventos/boda${prohibido}`)
    }
    // Las llegadas sí: quien celebra ve quién entró (16 sep).
    expect(delCliente).toContain('/panel/eventos/boda/checkin')
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

  it('«Equipo» —con los porteros dentro— lo ven quien compró y el atelier; ni el admin ni el personal de puerta', () => {
    const hrefs = (admin: boolean, puerta: boolean, cliente: boolean) =>
      panelNav('boda', {}, admin, puerta, cliente)
        .flatMap((seccion) => seccion.items)
        .map((item) => item.href)
    const ruta = '/panel/eventos/boda/equipo'
    expect(hrefs(false, false, true)).toContain(ruta)
    expect(hrefs(false, false, false)).toContain(ruta)
    expect(hrefs(true, false, false)).not.toContain(ruta)
    expect(hrefs(false, true, false)).not.toContain(ruta)
  })

  // Escribir la invitación es lo primero que se hace: su grupo va arriba de la barra.
  it('la invitación va primero, para el cliente y para el atelier', () => {
    expect(panelNav('boda', {}, false, false, true)[0]?.label).toBe('Mi invitación')
    expect(panelNav('boda')[0]?.label).toBe('Invitación')
  })

  it('la vista previa es su propia pantalla, no un trozo de Configuración', () => {
    const diseno = panelNav('boda').find((seccion) => seccion.label === 'Invitación')
    const previa = diseno?.items.find((item) => item.label === 'Ver cómo queda')
    expect(previa?.href).toBe('/panel/eventos/boda/vista-previa')
  })

  it('el planner sale para quien celebra y para quien lleva el evento, no para la puerta', () => {
    const rutas = (secciones: ReturnType<typeof panelNav>) => secciones.flatMap((s) => s.items.map((i) => i.href))
    expect(rutas(panelNav('boda', {}, false, false, true))).toContain('/panel/eventos/boda/planner/tareas')
    expect(rutas(panelNav('boda'))).toContain('/panel/eventos/boda/planner/presupuesto')
    expect(rutas(panelNav('boda', {}, false, true))).not.toContain('/panel/eventos/boda/planner/tareas')
  })

  it('en el equipo cada uno ve lo suyo: el anfitrión y el planner abren Equipo, el co-anfitrión no', () => {
    const rutas = (equipo: 'anfitrion' | 'coanfitrion' | 'planner') =>
      panelNav('boda', {}, false, false, true, { equipo }).flatMap((s) => s.items.map((i) => i.href))
    expect(rutas('anfitrion')).toContain('/panel/eventos/boda/equipo')
    expect(rutas('planner')).toContain('/panel/eventos/boda/equipo')
    // Porteros ya no es una entrada aparte: vive dentro de Equipo.
    expect(rutas('anfitrion')).not.toContain('/panel/eventos/boda/porteros')
    expect(rutas('anfitrion')).toContain('/panel/eventos/boda/extras')
    expect(rutas('planner')).not.toContain('/panel/eventos/boda/extras')
    expect(rutas('coanfitrion')).not.toContain('/panel/eventos/boda/equipo')
    expect(rutas('coanfitrion')).toContain('/panel/eventos/boda/planner/tareas')
    expect(rutas('coanfitrion')).toContain('/panel/eventos/boda/planner/cortejo')
    expect(rutas('coanfitrion')).not.toContain('/panel/eventos/boda/planner/proveedores')
    expect(rutas('planner')).toContain('/panel/eventos/boda/planner/cronograma')
    expect(rutas('planner')).toContain('/panel/eventos/boda/dia-d')
    expect(rutas('coanfitrion')).not.toContain('/panel/eventos/boda/dia-d')
    expect(rutas('coanfitrion')).toContain('/panel/eventos/boda/planner/documentos')
  })

  it('quien es planner en algún evento llega a su mesa desde la cuenta', () => {
    const rutas = (secciones: ReturnType<typeof panelNav>) => secciones.flatMap((s) => s.items.map((i) => i.href))
    expect(rutas(panelNav(null, {}, false, false, false, { mesaPlanner: true }))).toContain('/panel/planner')
    expect(rutas(panelNav(null))).not.toContain('/panel/planner')
    expect(rutas(panelNav('boda'))).toContain('/panel/eventos/boda/equipo')
  })
})

