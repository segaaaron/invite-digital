import type { ComponentType } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InvitationContent } from '../../domain/invitation-content'
import { fiestaDeCategoria } from '../../domain/fiesta'
import { formaPara } from '../content-shapes'
import type { ThemeDefinition, ThemeProps } from './contract'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from './kit/test-helpers'
import { themeDefinitions } from './registry'
import { buscarEnInvitacion } from '../seguir-seccion'
import { loQueSePerderia } from '../../domain/invitation-content'
import { propsDePrueba } from './test-props'

/**
 * **Lo que el editor pide sale en la invitación.** Para los diecisiete, no para uno.
 *
 * Es la regla del proyecto —el panel solo pregunta lo que el diseño pinta (`pinta`)— y se
 * comprobaba leyendo las vistas a mano, diseño por diseño. Así se coló un diseño que pedía
 * fotografía de portada y línea sobre los nombres sin pintar ninguna de las dos: el cliente
 * las rellenaba, se guardaban, y no salían en ninguna parte. Lo vio él en su panel.
 *
 * Esto lo comprueba de una vez: se escribe un valor propio en **cada campo que el editor
 * ofrece** y se exige que aparezca en el árbol pintado. Un diseño nuevo que declare de más
 * deja esta prueba en rojo el mismo día, con el nombre del campo.
 *
 * Las clases que no son texto —fecha, imagen, audio, icono y el enlace del mapa— quedan
 * fuera: lo que sale de ellas es un formato, un `src` o un `href`, no lo escrito.
 */
const SIN_TEXTO = new Set(['fecha', 'imagen', 'audio', 'icono', 'ubicacion'])

/** Las vistas, por su fichero: `Component` es un `dynamic()` y en pruebas no resuelve. */
const VISTAS = import.meta.glob('./*/*.view.tsx', { eager: true }) as Record<string, Record<string, ComponentType<ThemeProps>>>

function vistaDe(tema: ThemeDefinition): ComponentType<ThemeProps> | null {
  const sufijo = `/${tema.key}.view.tsx`
  const modulo = Object.entries(VISTAS).find(([ruta]) => ruta.endsWith(sufijo))?.[1]
  if (modulo === undefined) return null
  // Por su nombre, no «la primera función»: varias vistas exportan además sus piezas, y
  // una de ellas acababa renderizándose en lugar del diseño.
  const entradas = Object.entries(modulo).filter(([, valor]) => typeof valor === 'function')
  // `xv.view.tsx` exporta además el esqueleto que comparten los siete XV (`XvSharedView`),
  // que pide su piel por props: sin descartarlo se renderizaba ese y no el diseño.
  const vistas = entradas.filter(([nombre]) => nombre.endsWith('View') && !nombre.includes('Shared'))
  const porNombre = vistas[vistas.length - 1]?.[1]
  return porNombre ?? entradas[0]?.[1] ?? null
}

const valor = (seccion: string, clave: string) => `zzz${seccion}${clave}`.toLowerCase().replace(/[^a-z]/g, '')

/** El contenido del diseño con un valor reconocible en cada campo que su editor ofrece. */
function contenidoConTodo(tema: ThemeDefinition): { contenido: InvitationContent; esperados: [string, string][] } {
  const salida: Record<string, unknown> = structuredClone(tema.defaultContent) as Record<string, unknown>
  const esperados: [string, string][] = []
  const fiesta = fiestaDeCategoria(tema.categorySlug)

  for (const seccion of tema.sections) {
    const forma = formaPara(seccion, tema.pinta, fiesta)
    const campos = forma.fields.filter((campo) => !SIN_TEXTO.has(campo.kind))

    if (forma.form === 'filas') {
      const previas = (tema.defaultContent[seccion] ?? [{}]) as readonly Record<string, unknown>[]
      const filas = previas.length === 0 ? [{}] : previas
      salida[seccion] = filas.map((fila, indice) => ({
        ...fila,
        ...Object.fromEntries(campos.map((campo) => [campo.key, `${valor(seccion, campo.key)}${indice}`])),
      }))
      for (const campo of campos) esperados.push([`${seccion}.${campo.key}`, `${valor(seccion, campo.key)}0`])
      continue
    }

    // Los anfitriones son papeles dentro de `roles`, y la vista los lee de ahí o de `names`.
    if (seccion === 'hosts' && forma.anfitriones !== undefined) {
      const roles = Object.fromEntries(campos.filter((c) => c.key !== 'label').map((c) => [c.key, valor(seccion, c.key)]))
      const padrinos = forma.list === undefined ? [] : [valor(seccion, forma.list.key)]
      salida.hosts = {
        ...(campos.some((c) => c.key === 'label') ? { label: valor(seccion, 'label') } : {}),
        roles: { ...roles, ...(padrinos.length === 0 ? {} : { godparents: padrinos }) },
        names: [...Object.values(roles), ...padrinos],
      }
      for (const campo of campos) esperados.push([`hosts.${campo.key}`, valor(seccion, campo.key)])
      if (forma.list !== undefined) esperados.push([`hosts.${forma.list.key}`, valor(seccion, forma.list.key)])
      continue
    }

    if (campos.length === 0 && forma.list === undefined) continue

    const lista =
      forma.list === undefined || forma.list.kind !== 'texto'
        ? {}
        : { [forma.list.key]: [valor(seccion, forma.list.key)] }
    salida[seccion] = {
      ...((tema.defaultContent[seccion] ?? {}) as object),
      ...Object.fromEntries(campos.map((campo) => [campo.key, valor(seccion, campo.key)])),
      ...lista,
    }
    for (const campo of campos) esperados.push([`${seccion}.${campo.key}`, valor(seccion, campo.key)])
    for (const clave of Object.keys(lista)) esperados.push([`${seccion}.${clave}`, valor(seccion, clave)])
  }

  return { contenido: salida as InvitationContent, esperados }
}

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
  // jsdom no reproduce: `play()` devuelve `undefined` y el reproductor busca su promesa.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

const CON_VISTA = themeDefinitions()
  .map((tema) => ({ tema, Vista: vistaDe(tema) }))
  .filter((entrada): entrada is { tema: ThemeDefinition; Vista: ComponentType<ThemeProps> } => entrada.Vista !== null)

describe('lo que el editor pide de cada diseño', () => {
  it('encuentra la vista de todos, para que la prueba no pase por no mirar nada', () => {
    const sinVista = themeDefinitions()
      .filter((tema) => tema.key !== 'clasico')
      .filter((tema) => vistaDe(tema) === null)
      .map((tema) => tema.key)
    expect(sinVista).toEqual([])
  })

  it.each(CON_VISTA)('«$tema.key» pinta todo lo que su editor pregunta', ({ tema, Vista }) => {
    const { contenido, esperados } = contenidoConTodo(tema)
    const { container } = render(
      <Vista {...propsDePrueba({ content: contenido })} audioSrc="/modelos/musica/prueba" />,
    )
    // El texto **y** lo que describe una imagen: el rótulo de una casilla de galería es su
    // pie mientras no hay fotografía y su texto alternativo cuando la hay. Las dos cosas
    // son «sale en la invitación».
    const atributos = [...container.querySelectorAll('[alt], [title], [aria-label]')]
      .flatMap((nodo) => [nodo.getAttribute('alt'), nodo.getAttribute('title'), nodo.getAttribute('aria-label')])
      .filter((valor): valor is string => valor !== null)
    const pintado = `${container.textContent ?? ''} ${atributos.join(' ')}`.toLowerCase()

    expect(esperados.filter(([, texto]) => !pintado.includes(texto)).map(([campo]) => campo)).toEqual([])
  })
})

/**
 * El orden en que se pinta cada sección, sacado de la vista: la primera aparición de cualquiera de sus
 * campos. Lo que no pinta texto (la fecha, la música sin rótulo) no tiene posición y no cuenta.
 */
function ordenPintado(tema: ThemeDefinition, Vista: ComponentType<ThemeProps>): string[] {
  const { contenido, esperados } = contenidoConTodo(tema)
  const { container, unmount } = render(<Vista {...propsDePrueba({ content: contenido })} audioSrc="/modelos/musica/prueba" />)
  const primero = new Map<string, Element>()
  for (const [campo, texto] of esperados) {
    const seccion = campo.split('.')[0]!
    const nodo = buscarEnInvitacion(container, [texto])
    if (nodo === null || nodo.closest('[data-flotante]') !== null) continue
    const antes = primero.get(seccion)
    if (antes === undefined || nodo.compareDocumentPosition(antes) & Node.DOCUMENT_POSITION_FOLLOWING) primero.set(seccion, nodo)
  }
  unmount()
  return [...primero.entries()].sort(([, a], [, b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).map(([s]) => s)
}

describe('el editor va en el orden de la invitación', () => {
  it.each(CON_VISTA)('«$tema.key» declara sus secciones de arriba abajo', ({ tema, Vista }) => {
    const pintado = ordenPintado(tema, Vista)
    const declarado = tema.sections.filter((s) => pintado.includes(s))
    expect(declarado).toEqual(pintado)
  })
})

describe('guardar no pierde nada de lo que el editor manda', () => {
  // Sin falsos avisos: el ejemplo de cada diseño y un valor en cada campo del editor se guardan enteros.
  it.each(CON_VISTA)('«$tema.key»: su ejemplo y todos sus campos se guardan sin recortes', ({ tema }) => {
    const { contenido } = contenidoConTodo(tema)
    for (const seccion of tema.sections) {
      expect(loQueSePerderia(seccion, tema.defaultContent[seccion]), `ejemplo · ${seccion}`).toEqual([])
      expect(loQueSePerderia(seccion, contenido[seccion]), `editor · ${seccion}`).toEqual([])
    }
  })
})

describe('los topes del editor son los del guardado, en todos los diseños', () => {
  // Lo más largo que el editor deja escribir se guarda entero; uno más, se avisa (nunca se corta en silencio).
  it.each(CON_VISTA)('«$tema.key»: cada campo de texto guarda exactamente hasta su tope', ({ tema }) => {
    const fiesta = fiestaDeCategoria(tema.categorySlug)
    const { contenido } = contenidoConTodo(tema)
    let probados = 0
    for (const seccion of tema.sections) {
      const forma = formaPara(seccion, tema.pinta, fiesta)
      for (const campo of forma.fields) {
        if (campo.max === undefined) continue
        const con = (largo: number): unknown => {
          const base = structuredClone(contenido[seccion]) as unknown
          if (forma.form === 'filas') {
            const filas = base as Record<string, unknown>[]
            filas[0] = { ...filas[0], [campo.key]: 'y'.repeat(largo) }
            return filas
          }
          const bloque = (base ?? {}) as Record<string, unknown>
          if (seccion === 'hosts' && campo.key !== 'label') return { ...bloque, roles: { ...(bloque.roles as object), [campo.key]: 'y'.repeat(largo) } }
          return { ...bloque, [campo.key]: 'y'.repeat(largo) }
        }
        expect(loQueSePerderia(seccion, con(campo.max)), `${seccion}.${campo.key} con ${campo.max}`).toEqual([])
        expect(loQueSePerderia(seccion, con(campo.max + 1)).map((p) => p.motivo), `${seccion}.${campo.key} con ${campo.max + 1}`).toContain('largo')
        probados += 1
      }
    }
    // Los nombres de una lista (los padrinos): también con su tope.
    for (const seccion of tema.sections) {
      const forma = formaPara(seccion, tema.pinta, fiesta)
      if (forma.form !== 'campos' || forma.list?.maxTexto === undefined) continue
      const lista = (largo: number) => ({ ...(contenido[seccion] as object), roles: { ...((contenido[seccion] as { roles?: object }).roles ?? {}), [forma.list!.key]: ['y'.repeat(largo)] } })
      expect(loQueSePerderia(seccion, lista(forma.list.maxTexto)), `${seccion}.${forma.list.key}`).toEqual([])
      expect(loQueSePerderia(seccion, lista(forma.list.maxTexto + 1)).map((p) => p.motivo)).toContain('largo')
      probados += 1
    }
    expect(probados).toBeGreaterThan(0)
  })

  it.each(CON_VISTA)('«$tema.key» pinta los anfitriones con título y sin nombres sin romperse', ({ tema, Vista }) => {
    const content = { ...tema.defaultContent, hosts: { label: 'CON LA BENDICIÓN DE', names: [] } }
    expect(() => render(<Vista {...propsDePrueba({ content })} />).unmount()).not.toThrow()
  })

  it('el título de los anfitriones se guarda aunque el diseño no pida nombres', () => {
    expect(loQueSePerderia('hosts', { label: 'CON LA BENDICIÓN DE' })).toEqual([])
  })
})

describe('cada foto que el editor pide sale en su invitación', () => {
  // Cada diseño es autónomo: pide sus propias fotos (portada, retrato, casillas de galería, momentos) y las
  // pinta a su manera. Si un campo de foto no llegara a la vista, «subo la foto y no cambia»: se prueba en todos.
  it.each(CON_VISTA)('«$tema.key» pinta cada foto de su editor', ({ tema, Vista }) => {
    const fiesta = fiestaDeCategoria(tema.categorySlug)
    const contenido = structuredClone(tema.defaultContent) as Record<string, unknown>
    const esperadas: string[] = []
    for (const seccion of tema.sections) {
      const forma = formaPara(seccion, tema.pinta, fiesta)
      const fotos = forma.fields.filter((c) => c.kind === 'imagen')
      if (fotos.length === 0) continue
      if (forma.form === 'filas') {
        const previas = (contenido[seccion] as Record<string, unknown>[] | undefined) ?? []
        const n = Math.max(1, Math.min(forma.max, previas.length || 1))
        contenido[seccion] = Array.from({ length: n }, (_, i) => ({
          ...(previas[i] ?? { label: `Casilla ${i}`, time: '19:00', title: `Momento ${i}` }),
          ...Object.fromEntries(fotos.map((c) => [c.key, `foto-${seccion}-${c.key}-${i}`])),
        }))
        for (let i = 0; i < n; i++) for (const c of fotos) esperadas.push(`foto-${seccion}-${c.key}-${i}`)
      } else {
        contenido[seccion] = { ...((contenido[seccion] as object | undefined) ?? {}), ...Object.fromEntries(fotos.map((c) => [c.key, `foto-${seccion}-${c.key}`])) }
        for (const c of fotos) esperadas.push(`foto-${seccion}-${c.key}`)
      }
    }
    if (esperadas.length === 0) return
    const { container, unmount } = render(<Vista {...propsDePrueba({ content: contenido as InvitationContent })} />)
    const html = container.innerHTML
    unmount()
    const faltan = esperadas.filter((id) => !html.includes(`/media/${id}`) && !html.includes(encodeURIComponent(`/media/${id}`)))
    expect(faltan).toEqual([])
  })
})

