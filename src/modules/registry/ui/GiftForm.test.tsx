import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GiftRow } from '../application/ports'
import { GiftForm } from './GiftForm'

type ActionResult = { ok: true; message?: string } | { ok: false; kind: string; message: string }

const addGiftAction = vi.fn<(input: Record<string, unknown>) => Promise<ActionResult>>(async () => ({ ok: true }))
const updateGiftAction = vi.fn<(input: Record<string, unknown>) => Promise<ActionResult>>(async () => ({ ok: true }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/app/_acciones/registry/actions', () => ({
  addGiftAction: (...args: unknown[]) => addGiftAction(...(args as [Record<string, unknown>])),
  updateGiftAction: (...args: unknown[]) => updateGiftAction(...(args as [Record<string, unknown>])),
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
  updateGiftAction.mockClear()
})

const reservado: GiftRow = {
  id: 'g2',
  eventId: 'e1',
  name: 'Juego de sábanas',
  priceCents: 45_000,
  store: 'Casa Ideal',
  url: 'https://casaideal.bo/sabanas',
  status: 'reserved',
  claimedByGroupId: 'grupo-ana',
  claimedAt: new Date('2026-08-21T12:00:00.000Z'),
  claimedByLabel: 'Familia Rojas',
}

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

describe('GiftForm en modo edición', () => {
  it('llega relleno con los valores actuales del regalo', () => {
    render(<GiftForm {...props} gift={reservado} />)

    expect(screen.getByLabelText('Regalo')).toHaveValue('Juego de sábanas')
    expect(screen.getByLabelText('Precio')).toHaveValue('450.00')
    expect(screen.getByLabelText('Tienda')).toHaveValue('Casa Ideal')
    expect(screen.getByLabelText('Enlace a la tienda')).toHaveValue('https://casaideal.bo/sabanas')
  })

  it('un regalo sin tienda ni enlace llega con esos campos vacíos, no con «null» escrito', () => {
    render(<GiftForm {...props} gift={{ ...reservado, store: null, url: null }} />)
    expect(screen.getByLabelText('Tienda')).toHaveValue('')
    expect(screen.getByLabelText('Enlace a la tienda')).toHaveValue('')
  })

  it('guardar llama a updateGiftAction con el id y los campos cambiados', () => {
    render(<GiftForm {...props} gift={reservado} />)
    rellena({ precio: '520,00' })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateGiftAction).toHaveBeenCalledWith({
      id: 'g2',
      eventId: 'e1',
      eventSlug: 'boda',
      name: 'Juego de sábanas',
      priceCents: 52_000,
      store: 'Casa Ideal',
      url: 'https://casaideal.bo/sabanas',
    })
    expect(addGiftAction).not.toHaveBeenCalled()
  })

  it('editar un regalo reservado no manda nada sobre la reserva: corregir el precio no la suelta', () => {
    render(<GiftForm {...props} gift={reservado} />)
    rellena({ precio: '520,00' })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const enviado = updateGiftAction.mock.calls[0]?.[0] ?? {}
    expect(enviado).not.toHaveProperty('status')
    expect(enviado).not.toHaveProperty('claimedByGroupId')
    expect(enviado).not.toHaveProperty('claimedAt')
  })

  it('un importe inválido no llama a la acción', () => {
    render(<GiftForm {...props} gift={reservado} />)
    rellena({ precio: 'lo que sea' })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateGiftAction).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('cancelar no llama a nada y avisa de que se terminó', () => {
    const alTerminar = vi.fn()
    render(<GiftForm {...props} gift={reservado} onDone={alTerminar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(updateGiftAction).not.toHaveBeenCalled()
    expect(addGiftAction).not.toHaveBeenCalled()
    expect(alTerminar).toHaveBeenCalledTimes(1)
  })

  it('guardar bien cierra la edición; un error del servidor la deja abierta con el aviso', async () => {
    const alTerminar = vi.fn()
    updateGiftAction.mockResolvedValueOnce({ ok: false, kind: 'invalid_url', message: 'Solo http o https' })
    render(<GiftForm {...props} gift={reservado} onDone={alTerminar} />)

    // Mientras guarda, el botón se llama «Guardando…»: hay que esperar a que vuelva a su
    // nombre antes de volver a pulsarlo, o la prueba falla de vez en cuando por carrera.
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo http o https')
    expect(alTerminar).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(alTerminar).toHaveBeenCalledTimes(1))
  })

  it('el modo alta no ofrece cancelar: no hay nada de lo que volver', () => {
    render(<GiftForm {...props} />)
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })
})
