import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from './kit/test-helpers'
import { propsDePrueba } from './test-props'
import { BodaBotView } from './bodas/boda-bot.view'
import { XvView } from './xv/xv.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

/**
 * Quien ya confirmó no puede leer «Confírmame antes del 17 de octubre» encima de «Confirmación
 * enviada»: el bloque se contradice. Con la respuesta dada, el plazo no se pinta.
 */
describe('el bloque de confirmación, una vez respondida', () => {
  for (const [nombre, Vista, plazo] of [
    ['XV', XvView, /Confírmame antes/],
    ['Botánica', BodaBotView, /antes del/],
  ] as const) {
    it(`${nombre}: sin respuesta pide confirmar antes del plazo; respondida, no`, () => {
      const { unmount } = render(<Vista {...propsDePrueba({})} />)
      expect(screen.getAllByText(plazo).length).toBeGreaterThan(0)
      unmount()

      render(<Vista {...propsDePrueba({})} respondida />)
      expect(screen.queryByText(plazo)).toBeNull()
    })
  }
})
