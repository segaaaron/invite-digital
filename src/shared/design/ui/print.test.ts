// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRINT_MARK, printMarkedOnly } from './print'

afterEach(() => {
  delete document.body.dataset.imprimiendo
  vi.restoreAllMocks()
})

describe('printMarkedOnly', () => {
  it('marca el cuerpo mientras el navegador dibuja el papel, y lo desmarca al terminar', () => {
    const imprimir = vi.fn(() => {
      expect(document.body.dataset.imprimiendo).toBe(PRINT_MARK)
    })
    vi.stubGlobal('print', imprimir)

    printMarkedOnly()

    expect(imprimir).toHaveBeenCalledOnce()
    expect(document.body.dataset.imprimiendo).toBeUndefined()
  })

  it('desmarca también cuando imprimir revienta', () => {
    vi.stubGlobal('print', () => {
      throw new Error('el usuario canceló')
    })

    expect(() => printMarkedOnly()).toThrow()
    // Si la marca se quedara puesta, la siguiente impresión de cualquier otra cosa
    // saldría en blanco: la regla esconde todo lo que no esté marcado.
    expect(document.body.dataset.imprimiendo).toBeUndefined()
  })
})
