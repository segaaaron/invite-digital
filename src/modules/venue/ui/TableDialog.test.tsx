import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TableDialog } from './TableDialog'

const { addTableAction, push } = vi.hoisted(() => ({
  addTableAction: vi.fn<(input: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>>(async () => ({
    ok: true,
  })),
  push: vi.fn(),
}))
vi.mock('../actions', () => ({ addTableAction }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }))

// jsdom no implementa `showModal`; el componente lo llama al montar.
beforeEach(() => {
  addTableAction.mockClear()
  push.mockClear()
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })
})

const props = { eventId: 'e1', eventSlug: 'boda', closeHref: '/panel/eventos/boda/mesas' }

describe('TableDialog', () => {
  it('es el diálogo de la maqueta: nombre, capacidad, forma y notas', () => {
    render(<TableDialog {...props} />)

    expect(screen.getByLabelText('Nombre de la mesa')).toBeInTheDocument()
    expect(screen.getByLabelText('Capacidad (asientos)')).toBeInTheDocument()
    expect(screen.getByLabelText('Forma')).toBeInTheDocument()
    expect(screen.getByLabelText('Notas (opcional)')).toBeInTheDocument()
  })

  it('se abre como modal, que es lo que deja inerte el fondo', () => {
    render(<TableDialog {...props} />)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it('guarda con lo escrito, notas incluidas', async () => {
    render(<TableDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Nombre de la mesa'), { target: { value: 'Mesa 14' } })
    fireEvent.change(screen.getByLabelText('Capacidad (asientos)'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Forma'), { target: { value: 'imperial' } })
    fireEvent.change(screen.getByLabelText('Notas (opcional)'), { target: { value: 'Cerca del baño' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(addTableAction).toHaveBeenCalledWith({
        eventId: 'e1',
        eventSlug: 'boda',
        label: 'Mesa 14',
        capacity: 10,
        shape: 'imperial',
        notes: 'Cerca del baño',
      }),
    )
  })

  it('una nota en blanco viaja como null, no como cadena vacía', async () => {
    render(<TableDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Nombre de la mesa'), { target: { value: 'Mesa 15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(addTableAction.mock.calls[0]?.[0]).toMatchObject({ notes: null }))
  })

  it('una capacidad que no es un número no llama a la acción', () => {
    render(<TableDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Capacidad (asientos)'), { target: { value: 'muchos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(addTableAction).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('el error del servidor se ve y el diálogo se queda abierto para corregir', async () => {
    addTableAction.mockResolvedValueOnce({ ok: false, message: 'Ya hay una «Mesa 01»' })
    render(<TableDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Nombre de la mesa'), { target: { value: 'Mesa 01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una «Mesa 01»')
    expect(push).not.toHaveBeenCalled()
  })

  it('cancelar cierra sin crear nada', () => {
    render(<TableDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(addTableAction).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/panel/eventos/boda/mesas')
  })
})
