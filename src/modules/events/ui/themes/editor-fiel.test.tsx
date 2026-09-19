import type { ComponentType } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InvitationContent } from '../../domain/invitation-content'
import { fiestaDeCategoria } from '../../domain/fiesta'
import { formaPara } from '../content-shapes'
import type { ThemeDefinition, ThemeProps } from './contract'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from './kit/test-helpers'
import { themeDefinitions } from './registry'
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
