import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loQueFaltaParaInvitar, pideNombres, type InvitationContent, type SectionKey } from '../../../domain/invitation-content'
import { formaPara } from '../../content-shapes'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { cumpleBeerDefinition } from './cumple-beer'
import { CONTENIDO_DE_MUESTRA } from './cumple-beer.content'
import { CumpleBeerView } from './cumple-beer.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
  // jsdom no reproduce: `play()` devuelve `undefined` y el reproductor busca su promesa.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

/**
 * Lo que el editor pide **sale en la invitación**, campo por campo.
 *
 * Es la regla del proyecto —el panel solo pregunta lo que el diseño pinta (`pinta`)— pero
 * hasta ahora se comprobaba leyendo. Al portar este diseño se declaró que aceptaba
 * fotografía de portada y línea sobre los nombres: el cliente las rellenaba, las guardaba,
 * y no salían en ninguna parte. Lo vio él en su panel, no una prueba.
 *
 * Esto lo comprueba de verdad: se escribe un valor propio en cada campo que el editor
 * ofrece y se exige que aparezca en el render. Las clases que no son texto —fecha, imagen,
 * audio, icono y el enlace del mapa— no se comparan: lo que sale de ellas es un formato, un
 * `src` o un `href`, no lo escrito.
 */
const SIN_TEXTO = new Set(['fecha', 'imagen', 'audio', 'icono', 'ubicacion'])

/** Un valor reconocible por campo, para encontrarlo en el árbol pintado. */
const valor = (seccion: string, clave: string) => `zzz-${seccion}-${clave}`

function contenidoConTodo(): InvitationContent {
  const salida: Record<string, unknown> = { ...CONTENIDO_DE_MUESTRA }

  for (const seccion of cumpleBeerDefinition.sections) {
    const forma = formaPara(seccion, cumpleBeerDefinition.pinta)
    const campos = forma.fields.filter((campo) => !SIN_TEXTO.has(campo.kind))
    if (campos.length === 0) continue

    if (forma.form === 'filas') {
      const previas = (CONTENIDO_DE_MUESTRA[seccion as SectionKey] ?? []) as readonly Record<string, unknown>[]
      salida[seccion] = previas.map((fila, indice) => ({
        ...fila,
        ...Object.fromEntries(campos.map((campo) => [campo.key, `${valor(seccion, campo.key)}-${indice}`])),
      }))
      continue
    }

    salida[seccion] = {
      ...((CONTENIDO_DE_MUESTRA[seccion as SectionKey] ?? {}) as object),
      ...Object.fromEntries(campos.map((campo) => [campo.key, valor(seccion, campo.key)])),
    }
  }

  return salida as InvitationContent
}

describe('lo que el editor pide de «Cervecería Vintage»', () => {
  it('sale todo en la invitación: ni un campo que el cliente rellene para nadie', () => {
    const contenido = contenidoConTodo()
    // Con música: sin archivo detrás este diseño no pinta el reproductor, que es lo que
    // hace su maqueta, y entonces el título y el artista no tendrían dónde salir.
    const { container } = render(
      <CumpleBeerView {...propsDePrueba({ content: contenido })} audioSrc="/modelos/musica/cumple-beer" />,
    )
    const pintado = container.textContent ?? ''

    const huerfanos: string[] = []
    for (const seccion of cumpleBeerDefinition.sections) {
      const forma = formaPara(seccion, cumpleBeerDefinition.pinta)
      for (const campo of forma.fields) {
        if (SIN_TEXTO.has(campo.kind)) continue
        const esperado = valor(seccion, campo.key)
        const sale = forma.form === 'filas' ? pintado.includes(`${esperado}-0`) : pintado.includes(esperado)
        if (!sale) huerfanos.push(`${seccion}.${campo.key}`)
      }
    }

    expect(huerfanos).toEqual([])
  })

  it('no pide ni fotografías ni bloque de portada: no tiene dónde ponerlos', () => {
    expect(cumpleBeerDefinition.pinta.fotos).toEqual({ casillas: 0 })
    expect(cumpleBeerDefinition.sections).not.toContain('hero')
  })

  it('no exige los nombres para poder invitar, porque no los pide', () => {
    // Exigir un campo que el editor no ofrece deja el reparto bloqueado para siempre, sin
    // nada que se pueda rellenar para desbloquearlo.
    expect(pideNombres(cumpleBeerDefinition)).toBe(false)
    expect(loQueFaltaParaInvitar(CONTENIDO_DE_MUESTRA, { pideNombres: false })).toEqual([])
  })
})
