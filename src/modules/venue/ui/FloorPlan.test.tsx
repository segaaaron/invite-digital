import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeatedTable } from '../application/list-seating'
import type { VenueZone } from '../domain/venue-zone'
import { FloorPlan } from './FloorPlan'

const moveElementsAction = vi.fn(async () => ({ ok: true as const }))
const push = vi.fn()

vi.mock('../actions', () => ({
  moveElementsAction: (...args: unknown[]) => moveElementsAction(...(args as [])),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const mesa = (id: string, label: string, x: number, y: number): SeatedTable => ({
  id,
  eventId: 'e1',
  label,
  capacity: 8,
  shape: 'round', notes: null,
  x,
  y,
  taken: 4,
  free: 4,
  groups: [],
})

const zona: VenueZone = { id: 'z1', eventId: 'e1', kind: 'dance', label: 'Pista', x: 10, y: 10, w: 20, h: 20 }

const props = {
  eventId: 'e1',
  eventSlug: 'boda',
  tables: [mesa('t1', 'Mesa 01', 20, 20), mesa('t2', 'Mesa 02', 60, 60)],
  zones: [zona],
  exits: [{ href: '/panel/eventos/boda', label: 'Volver al evento' }],
}

/** jsdom da un rect de ceros; sin ancho, el arrastre no puede calcular porcentajes. */
const stubRect = () =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 1000,
    height: 1000,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 1000,
    toJSON: () => ({}),
  } as DOMRect)

const stubReducedMotion = (reduce: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduced-motion') ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  )
}

const arrastrar = (marca: HTMLElement, aX: number, aY: number) => {
  fireEvent.pointerDown(marca, { clientX: 0, clientY: 0, pointerId: 1 })
  fireEvent.pointerMove(marca, { clientX: aX, clientY: aY, pointerId: 1 })
  fireEvent.pointerUp(marca, { clientX: aX, clientY: aY, pointerId: 1 })
}

beforeEach(() => {
  moveElementsAction.mockClear()
  push.mockClear()
  stubRect()
  // El elemento arrastrado captura el puntero; jsdom no implementa la API.
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('FloorPlan', () => {
  it('pinta una marca por mesa y una por zona', () => {
    render(<FloorPlan {...props} />)
    expect(screen.getByRole('button', { name: /Mesa 01/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mesa 02/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pista/ })).toBeInTheDocument()
  })

  it('arrastrar mueve la marca en pantalla', () => {
    render(<FloorPlan {...props} />)
    const marca = screen.getByRole('button', { name: /Mesa 01/ })
    arrastrar(marca, 300, 400)
    expect(marca.style.left).toBe('50%')
    expect(marca.style.top).toBe('60%')
  })

  it('ARRASTRAR NO LLAMA A NINGUNA SERVER ACTION', () => {
    // Guardar por fotograma serían miles de escrituras por cada mesa que alguien mueve.
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    expect(moveElementsAction).not.toHaveBeenCalled()
  })

  it('sin cambios, «Guardar» está deshabilitado', () => {
    render(<FloorPlan {...props} />)
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled()
  })

  it('cuenta los cambios sin guardar', () => {
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    expect(screen.getByRole('status')).toHaveTextContent('1 cambio sin guardar')
    arrastrar(screen.getByRole('button', { name: /Mesa 02/ }), 100, 100)
    expect(screen.getByRole('status')).toHaveTextContent('2 cambios sin guardar')
  })

  it('«Guardar» manda TODAS las posiciones cambiadas en UNA sola llamada', async () => {
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    arrastrar(screen.getByRole('button', { name: /Pista/ }), 500, 500)
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => expect(moveElementsAction).toHaveBeenCalledTimes(1))
    expect(moveElementsAction).toHaveBeenCalledWith({
      eventId: 'e1',
      eventSlug: 'boda',
      moves: [
        { kind: 'table', id: 't1', x: 50, y: 60 },
        // La zona viaja con su tamaño: el lote lleva posición **y** medidas desde que el
        // plano deja redimensionarlas.
        { kind: 'zone', id: 'z1', x: 60, y: 60, w: 20, h: 20 },
      ],
    })
  })

  it('tras guardar, el botón vuelve a estar deshabilitado', async () => {
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled())
  })

  it('«Descartar» devuelve las marcas a su sitio y deshabilita el guardado', () => {
    render(<FloorPlan {...props} />)
    const marca = screen.getByRole('button', { name: /Mesa 01/ })
    arrastrar(marca, 300, 400)
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }))
    expect(marca.style.left).toBe('20%')
    expect(marca.style.top).toBe('20%')
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled()
    expect(moveElementsAction).not.toHaveBeenCalled()
  })

  it('el teclado mueve la mesa seleccionada con las flechas, sin ratón', () => {
    render(<FloorPlan {...props} />)
    const marca = screen.getByRole('button', { name: /Mesa 01/ })
    marca.focus()
    fireEvent.keyDown(marca, { key: 'ArrowRight' })
    fireEvent.keyDown(marca, { key: 'ArrowDown' })
    expect(marca.style.left).toBe('21%')
    expect(marca.style.top).toBe('21%')
  })

  it('el teclado tampoco guarda por su cuenta', () => {
    render(<FloorPlan {...props} />)
    fireEvent.keyDown(screen.getByRole('button', { name: /Mesa 01/ }), { key: 'ArrowRight' })
    expect(moveElementsAction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /guardar cambios/i })).not.toBeDisabled()
  })

  it('el teclado no saca la mesa del plano', () => {
    render(<FloorPlan {...props} tables={[mesa('t1', 'Mesa 01', 0, 0)]} />)
    const marca = screen.getByRole('button', { name: /Mesa 01/ })
    fireEvent.keyDown(marca, { key: 'ArrowLeft' })
    expect(marca.style.left).toBe('0%')
  })

  it('con cambios pendientes, salir de la vista abre el modal propio y no navega', () => {
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al evento' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('«Cancelar» en el modal deja todo como estaba y no navega', () => {
    render(<FloorPlan {...props} />)
    const marca = screen.getByRole('button', { name: /Mesa 01/ })
    arrastrar(marca, 300, 400)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al evento' }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(marca.style.left).toBe('50%')
    expect(moveElementsAction).not.toHaveBeenCalled()
  })

  it('«Guardar» desde el modal persiste y luego navega', async () => {
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al evento' }))
    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }))

    await waitFor(() => expect(moveElementsAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/panel/eventos/boda'))
  })

  it('«Descartar» desde el modal navega sin guardar', async () => {
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al evento' }))
    fireEvent.click(screen.getByRole('button', { name: /descartar y salir/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/panel/eventos/boda'))
    expect(moveElementsAction).not.toHaveBeenCalled()
  })

  it('sin cambios pendientes, el enlace navega sin preguntar nada', () => {
    render(<FloorPlan {...props} />)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al evento' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(push).toHaveBeenCalledWith('/panel/eventos/boda')
  })

  it('registra beforeunload solo mientras hay cambios y lo quita al guardar', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')

    render(<FloorPlan {...props} />)
    expect(add.mock.calls.some(([tipo]) => tipo === 'beforeunload')).toBe(false)

    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    expect(add.mock.calls.some(([tipo]) => tipo === 'beforeunload')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))
    await waitFor(() => expect(remove.mock.calls.some(([tipo]) => tipo === 'beforeunload')).toBe(true))
  })

  it('quita beforeunload al descartar', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    render(<FloorPlan {...props} />)
    arrastrar(screen.getByRole('button', { name: /Mesa 01/ }), 300, 400)
    fireEvent.click(screen.getByRole('button', { name: /descartar/i }))
    expect(remove.mock.calls.some(([tipo]) => tipo === 'beforeunload')).toBe(true)
  })

  it('con movimiento reducido las marcas no llevan transición', () => {
    stubReducedMotion(true)
    render(<FloorPlan {...props} />)
    expect(screen.getByRole('button', { name: /Mesa 01/ }).style.transition).toBe('none')
  })

  it('enseña el error del servidor sin perder los cambios locales', async () => {
    moveElementsAction.mockResolvedValueOnce({ ok: false, kind: 'wrong_event', message: 'de otro evento' } as never)
    render(<FloorPlan {...props} />)
    const marca = screen.getByRole('button', { name: /Mesa 01/ })
    arrastrar(marca, 300, 400)
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('de otro evento')
    expect(marca.style.left).toBe('50%')
    expect(screen.getByRole('button', { name: /guardar cambios/i })).not.toBeDisabled()
  })
})

describe('FloorPlan · redimensionar zonas', () => {
  it('con Mayúsculas, las flechas cambian el tamaño de la zona en vez de moverla', () => {
    const zona = { id: 'z1', eventId: 'e1', kind: 'dance' as const, label: 'Pista', x: 40, y: 40, w: 20, h: 15 }
    render(<FloorPlan eventId="e1" eventSlug="boda" exits={[]} tables={[]} zones={[zona]} />)

    const marca = screen.getByRole('button', { name: /Pista/ })
    const anchoAntes = marca.style.width
    fireEvent.keyDown(marca, { key: 'ArrowRight', shiftKey: true })

    expect(marca.style.width).not.toBe(anchoAntes)
    // Y no se ha movido: redimensionar no es mover.
    expect(marca.style.left).toBe('40%')
  })

  it('una zona no se puede encoger hasta desaparecer', () => {
    const zona = { id: 'z1', eventId: 'e1', kind: 'dance' as const, label: 'Pista', x: 40, y: 40, w: 7, h: 7 }
    render(<FloorPlan eventId="e1" eventSlug="boda" exits={[]} tables={[]} zones={[zona]} />)

    const marca = screen.getByRole('button', { name: /Pista/ })
    for (let i = 0; i < 10; i += 1) fireEvent.keyDown(marca, { key: 'ArrowLeft', shiftKey: true })

    expect(Number.parseFloat(marca.style.width)).toBeGreaterThanOrEqual(6)
  })

  it('cambiar el tamaño cuenta como cambio sin guardar', () => {
    const zona = { id: 'z1', eventId: 'e1', kind: 'dance' as const, label: 'Pista', x: 40, y: 40, w: 20, h: 15 }
    render(<FloorPlan eventId="e1" eventSlug="boda" exits={[]} tables={[]} zones={[zona]} />)

    fireEvent.keyDown(screen.getByRole('button', { name: /Pista/ }), { key: 'ArrowDown', shiftKey: true })
    expect(screen.getByLabelText('Estado del plano')).toHaveTextContent(/sin guardar/i)
  })
})
