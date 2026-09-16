import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA as SOFIA } from './xv.content'
import { CONTENIDO_DE_MUESTRA as ISABELLE } from './xv-isabelle.content'
import { CONTENIDO_DE_MUESTRA as VALENTINA } from './xv-valentina.content'
import { CONTENIDO_DE_MUESTRA as LUCIANA } from './xv-luciana.content'
import { XvView } from './xv.view'
import { XvIsabelleView } from './xv-isabelle.view'
import { XvValentinaView } from './xv-valentina.view'
import { XvLucianaView } from './xv-luciana.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

/**
 * La portada es un solo botón: toque donde toque, abre la invitación. Llevaba además una
 * placa con marco —«▸ MIS QUINCE · SOFÍA»— que parecía otro botón, hacía lo mismo y repetía
 * el nombre que la portada ya escribe en grande. Queda una sola llamada: la frase de entrar.
 * «Encanto Musical» no está: su rótulo va suelto sobre la partitura, sin marco, como parte del dibujo.
 */
describe('las portadas de XV tienen una sola llamada', () => {
  for (const [nombre, Vista, contenido] of [
    ['Bajo el Mar', XvView, SOFIA],
    ['Isabelle', XvIsabelleView, ISABELLE],
    ['Valentina', XvValentinaView, VALENTINA],
    ['Luciana', XvLucianaView, LUCIANA],
  ] as const) {
    it(nombre, () => {
      render(<Vista {...propsDePrueba({ content: contenido })} />)
      expect(screen.getByText('INGRESA A MI INVITACIÓN')).toBeInTheDocument()
      expect(screen.queryByText(/▸/)).toBeNull()
      const nombreEnPlaca = new RegExp(`·\\s*${contenido.hero?.nameA ?? ''}\\s*$`, 'i')
      expect(screen.queryByText(nombreEnPlaca)).toBeNull()
    })
  }
})
