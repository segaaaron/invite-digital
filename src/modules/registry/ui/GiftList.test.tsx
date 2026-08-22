import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GiftRow } from '../application/ports'
import { GiftList } from './GiftList'

const markPurchasedAction = vi.fn(async () => ({ ok: true as const }))
const releaseGiftAsAtelierAction = vi.fn(async () => ({ ok: true as const }))
const removeGiftAction = vi.fn(async () => ({ ok: true as const }))
const addGiftAction = vi.fn(async () => ({ ok: true as const }))
const updateGiftAction = vi.fn(async () => ({ ok: true as const }))

vi.mock('../actions', () => ({
  markPurchasedAction: (...args: unknown[]) => markPurchasedAction(...(args as [])),
  releaseGiftAsAtelierAction: (...args: unknown[]) => releaseGiftAsAtelierAction(...(args as [])),
  removeGiftAction: (...args: unknown[]) => removeGiftAction(...(args as [])),
  addGiftAction: (...args: unknown[]) => addGiftAction(...(args as [])),
  updateGiftAction: (...args: unknown[]) => updateGiftAction(...(args as [])),
}))

const AHORA = new Date('2026-08-21T12:00:00.000Z')

const regalo = (over: Partial<GiftRow> = {}): GiftRow => ({
  id: 'g1',
  eventId: 'e1',
  name: 'Cafetera italiana',
  priceCents: 45_000,
  store: 'Casa Ideal',
  url: 'https://casaideal.bo/cafetera',
  status: 'available',
  claimedByGroupId: null,
  claimedAt: null,
  claimedByLabel: null,
  ...over,
})

const disponible = regalo()
const reservado = regalo({
  id: 'g2',
  name: 'Juego de sábanas',
  status: 'reserved',
  claimedByGroupId: 'grupo-ana',
  claimedAt: AHORA,
  claimedByLabel: 'Familia Rojas',
})
const comprado = regalo({ id: 'g3', name: 'Batidora', status: 'purchased' })

const props = { eventId: 'e1', eventSlug: 'boda', currency: 'BOB' }

beforeEach(() => {
  markPurchasedAction.mockClear()
  releaseGiftAsAtelierAction.mockClear()
  removeGiftAction.mockClear()
  addGiftAction.mockClear()
  updateGiftAction.mockClear()
})

describe('GiftList', () => {
  it('muestra los tres estados con una etiqueta distinta cada uno', () => {
    render(<GiftList {...props} gifts={[disponible, reservado, comprado]} />)
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Reservado')).toBeInTheDocument()
    expect(screen.getByText('Comprado')).toBeInTheDocument()
  })

  it('muestra el precio en la moneda del evento, con sus dos decimales', () => {
    render(<GiftList {...props} gifts={[disponible]} />)
    expect(screen.getByText(/450,00/)).toBeInTheDocument()
  })

  it('el reservado dice qué grupo lo reservó', () => {
    render(<GiftList {...props} gifts={[reservado]} />)
    expect(screen.getByText(/Familia Rojas/)).toBeInTheDocument()
  })

  it('el comprado no ofrece cambiar de estado: es definitivo', () => {
    render(<GiftList {...props} gifts={[comprado]} />)
    expect(screen.queryByRole('button', { name: /marcar comprado/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /liberar/i })).not.toBeInTheDocument()
  })

  it('el disponible se puede marcar comprado', () => {
    render(<GiftList {...props} gifts={[disponible]} />)
    fireEvent.click(screen.getByRole('button', { name: /marcar comprado/i }))
    expect(markPurchasedAction).toHaveBeenCalledWith({ id: 'g1', eventId: 'e1', eventSlug: 'boda' })
  })

  it('el reservado se puede liberar y también marcar comprado', () => {
    render(<GiftList {...props} gifts={[reservado]} />)
    fireEvent.click(screen.getByRole('button', { name: /liberar reserva/i }))
    expect(releaseGiftAsAtelierAction).toHaveBeenCalledWith({ id: 'g2', eventId: 'e1', eventSlug: 'boda' })
    expect(screen.getByRole('button', { name: /marcar comprado/i })).toBeInTheDocument()
  })

  it('el enlace a la tienda se abre fuera y sin arrastrar la sesión', () => {
    render(<GiftList {...props} gifts={[disponible]} />)
    const enlace = screen.getByRole('link', { name: /casa ideal/i })
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('un regalo sin enlace no pinta un enlace roto', () => {
    render(<GiftList {...props} gifts={[regalo({ url: null, store: null })]} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('borrar el regalo llama a la acción con su id', () => {
    render(<GiftList {...props} gifts={[disponible]} />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }))
    expect(removeGiftAction).toHaveBeenCalledWith({ id: 'g1', eventId: 'e1', eventSlug: 'boda' })
  })

  it('enseña el error del servidor sin recargar la página', async () => {
    markPurchasedAction.mockResolvedValueOnce({ ok: false, kind: 'already_purchased', message: 'Ya está comprado' } as never)
    render(<GiftList {...props} gifts={[disponible]} />)
    fireEvent.click(screen.getByRole('button', { name: /marcar comprado/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya está comprado')
  })

  it('con la lista vacía lo dice en vez de enseñar un hueco', () => {
    render(<GiftList {...props} gifts={[]} />)
    expect(screen.getByText(/todavía no hay regalos/i)).toBeInTheDocument()
  })
})

describe('GiftList · editar un regalo', () => {
  it('abre el formulario relleno con los datos del regalo', () => {
    render(<GiftList {...props} gifts={[disponible]} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }))

    expect(screen.getByLabelText('Regalo')).toHaveValue('Cafetera italiana')
    expect(screen.getByLabelText('Precio')).toHaveValue('450.00')
  })

  it('editar un reservado sigue diciendo quién lo reservó: corregir el precio no borra la reserva', () => {
    render(<GiftList {...props} gifts={[reservado]} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }))

    expect(screen.getByText(/Familia Rojas/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Precio'), { target: { value: '520,00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateGiftAction).toHaveBeenCalledWith({
      id: 'g2',
      eventId: 'e1',
      eventSlug: 'boda',
      name: 'Juego de sábanas',
      priceCents: 52_000,
      store: 'Casa Ideal',
      url: 'https://casaideal.bo/cafetera',
    })
  })

  it('cancelar cierra el formulario sin llamar a nada', () => {
    render(<GiftList {...props} gifts={[disponible]} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(updateGiftAction).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Precio')).not.toBeInTheDocument()
  })

  it('el comprado también se puede corregir: es definitivo su estado, no su ficha', () => {
    render(<GiftList {...props} gifts={[comprado]} />)
    expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument()
  })
})
