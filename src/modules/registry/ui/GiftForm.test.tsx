import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GiftForm } from './GiftForm'

type ActionResult = { ok: true; message?: string } | { ok: false; kind: string; message: string }

const addGiftAction = vi.fn<(input: Record<string, unknown>) => Promise<ActionResult>>(async () => ({ ok: true }))

vi.mock('../actions', () => ({
  addGiftAction: (...args: unknown[]) => addGiftAction(...(args as [Record<string, unknown>])),
}))

const props = { eventId: 'e1', eventSlug: 'boda' }

const rellena = (campos: { nombre?: string; precio?: string; tienda?: string; url?: string }) => {
  if (campos.nombre !== undefined) fireEvent.change(screen.getByLabelText('Regalo'), { target: { value: campos.nombre } })
  if (campos.precio !== undefined) fireEvent.change(screen.getByLabelText('Precio'), { target: { value: campos.precio } })
  if (campos.tienda !== undefined) fireEvent.change(screen.getByLabelText('Tienda'), { target: { value: campos.tienda } })
  if (campos.url !== undefined) fireEvent.change(screen.getByLabelText('Enlace a la tienda'), { target: { value: campos.url } })
}

beforeEach(() => {
  addGiftAction.mockClear()
})

describe('GiftForm', () => {
  it('manda el importe ya convertido a centavos enteros', () => {
    render(<GiftForm {...props} />)
    rellena({ nombre: 'Cafetera italiana', precio: '450,50', tienda: 'Casa Ideal', url: 'https://casaideal.bo/x' })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir regalo' }))

    expect(addGiftAction).toHaveBeenCalledWith({
      eventId: 'e1',
      eventSlug: 'boda',
      name: 'Cafetera italiana',
      priceCents: 45_050,
      store: 'Casa Ideal',
      url: 'https://casaideal.bo/x',
    })
  })

  it('acepta el importe escrito con punto decimal', () => {
    render(<GiftForm {...props} />)
    rellena({ nombre: 'Cafetera', precio: '1234.50' })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir regalo' }))
    expect(addGiftAction.mock.calls[0]?.[0]).toMatchObject({ priceCents: 123_450 })
  })

  it('el importe con texto se rechaza sin llamar a la acción', () => {
    render(<GiftForm {...props} />)
    rellena({ nombre: 'Cafetera', precio: 'mucho dinero' })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir regalo' }))

    expect(addGiftAction).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('el importe de cero se rechaza sin llamar a la acción', () => {
    render(<GiftForm {...props} />)
    rellena({ nombre: 'Cafetera', precio: '0' })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir regalo' }))
    expect(addGiftAction).not.toHaveBeenCalled()
  })

  it('la tienda y el enlace vacíos viajan como null, no como cadena vacía', () => {
    render(<GiftForm {...props} />)
    rellena({ nombre: 'Cafetera', precio: '100' })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir regalo' }))
    expect(addGiftAction.mock.calls[0]?.[0]).toMatchObject({ store: null, url: null })
  })

  it('enseña el error que devuelve el servidor', async () => {
    addGiftAction.mockResolvedValueOnce({ ok: false, kind: 'invalid_url', message: 'Solo http o https' })
    render(<GiftForm {...props} />)
    rellena({ nombre: 'Cafetera', precio: '100', url: 'javascript:alert(1)' })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir regalo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo http o https')
  })
})
