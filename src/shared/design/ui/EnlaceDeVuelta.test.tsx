import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnlaceDeVuelta } from './EnlaceDeVuelta'

const vinoDe = (referrer: string) => Object.defineProperty(document, 'referrer', { configurable: true, value: referrer })
/** jsdom arranca con el historial vacío (`length === 1`), que es justo el caso de una pestaña nueva. */
const conHistorial = (entradas: number) => vi.spyOn(window.history, 'length', 'get').mockReturnValue(entradas)

afterEach(cleanup)

describe('EnlaceDeVuelta', () => {
  it('si se vino de otra página nuestra, sale por donde entró y no al destino fijo', () => {
    vinoDe(`${window.location.origin}/es/xv-anos`)
    const atras = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const largo = conHistorial(2)

    render(<EnlaceDeVuelta href="/es/colecciones#modelos">Cerrar</EnlaceDeVuelta>)
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
    fireEvent(screen.getByText('Cerrar'), evento)

    expect(atras).toHaveBeenCalledTimes(1)
    expect(evento.defaultPrevented).toBe(true)
    atras.mockRestore()
    largo.mockRestore()
  })

  it('si se llegó de fuera —Google, la dirección escrita— el paso atrás sacaría del sitio: va al destino', () => {
    vinoDe('https://www.google.com/')
    const atras = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    render(<EnlaceDeVuelta href="/es/colecciones#modelos">Cerrar</EnlaceDeVuelta>)
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
    fireEvent(screen.getByText('Cerrar'), evento)

    expect(atras).not.toHaveBeenCalled()
    expect(evento.defaultPrevented).toBe(false)
    atras.mockRestore()
  })

  it('una pestaña nueva abierta desde el sitio tiene referrer pero no historial: va al destino', () => {
    vinoDe(`${window.location.origin}/es/xv-anos`)
    const atras = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const largo = conHistorial(1)

    render(<EnlaceDeVuelta href="/es/colecciones#modelos">Cerrar</EnlaceDeVuelta>)
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
    fireEvent(screen.getByText('Cerrar'), evento)

    expect(atras).not.toHaveBeenCalled()
    expect(evento.defaultPrevented).toBe(false)
    atras.mockRestore()
    largo.mockRestore()
  })

  it('una pestaña nueva no tiene de dónde volver: tampoco', () => {
    vinoDe('')
    const atras = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    render(<EnlaceDeVuelta href="/es/colecciones#modelos">Cerrar</EnlaceDeVuelta>)
    fireEvent.click(screen.getByText('Cerrar'))

    expect(atras).not.toHaveBeenCalled()
    atras.mockRestore()
  })
})
