import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'
import { TableCard } from './TableCard'

const assignGroupAction = vi.fn(async () => ({ ok: true as const }))
const unassignGroupAction = vi.fn(async () => ({ ok: true as const }))
const removeTableAction = vi.fn(async () => ({ ok: true as const }))
const updateTableAction = vi.fn(async () => ({ ok: true as const }))

vi.mock('../actions', () => ({
  assignGroupAction: (...args: unknown[]) => assignGroupAction(...(args as [])),
  unassignGroupAction: (...args: unknown[]) => unassignGroupAction(...(args as [])),
  removeTableAction: (...args: unknown[]) => removeTableAction(...(args as [])),
  updateTableAction: (...args: unknown[]) => updateTableAction(...(args as [])),
}))

const grupo = (id: string, label: string, seats: number, tableId: string | null): SeatedGroupRow => ({
  id,
  eventId: 'e1',
  label,
  seats,
  tableId,
  revoked: false,
  confirmed: seats,
})

const mesa: SeatedTable = {
  id: 't1',
  eventId: 'e1',
  label: 'Mesa 01',
  capacity: 8,
  shape: 'round',
  x: 50,
  y: 50,
  taken: 6,
  free: 2,
  groups: [grupo('a', 'Familia Rojas', 4, 't1'), grupo('b', 'Camila Vargas', 2, 't1')],
}

const props = { eventId: 'e1', eventSlug: 'boda', table: mesa, unseated: [] as SeatedGroupRow[] }

beforeEach(() => {
  assignGroupAction.mockClear()
  unassignGroupAction.mockClear()
  removeTableAction.mockClear()
  updateTableAction.mockClear()
})

describe('TableCard', () => {
  it('muestra la ocupación como 6 / 8', () => {
    render(<TableCard {...props} />)
    expect(screen.getByText('6 / 8')).toBeInTheDocument()
  })

  it('muestra los grupos sentados en ella', () => {
    render(<TableCard {...props} />)
    expect(screen.getByText('Familia Rojas')).toBeInTheDocument()
    expect(screen.getByText('Camila Vargas')).toBeInTheDocument()
  })

  it('el selector solo ofrece los grupos que caben enteros', () => {
    // Quedan 2 sitios: la pareja entra, la familia de 5 no.
    const unseated = [grupo('c', 'Pareja Nieto', 2, null), grupo('d', 'Familia Grande', 5, null)]
    render(<TableCard {...props} unseated={unseated} />)
    const opciones = screen.getAllByRole('option').map((o) => o.textContent)
    expect(opciones.join(' ')).toContain('Pareja Nieto')
    expect(opciones.join(' ')).not.toContain('Familia Grande')
  })

  it('con la mesa llena no ofrece sentar a nadie', () => {
    const llena = { ...mesa, taken: 8, free: 0 }
    render(<TableCard {...props} table={llena} unseated={[grupo('c', 'Pareja Nieto', 2, null)]} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText(/sin sitios libres/i)).toBeInTheDocument()
  })

  it('sentar a un grupo llama a la acción con la mesa y el grupo', async () => {
    render(<TableCard {...props} unseated={[grupo('c', 'Pareja Nieto', 2, null)]} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c' } })
    fireEvent.click(screen.getByRole('button', { name: /sentar/i }))
    expect(assignGroupAction).toHaveBeenCalledWith({ eventId: 'e1', eventSlug: 'boda', groupId: 'c', tableId: 't1' })
  })

  it('quitar a un grupo lo levanta de la mesa', async () => {
    render(<TableCard {...props} />)
    fireEvent.click(screen.getAllByRole('button', { name: /quitar de la mesa/i })[0]!)
    expect(unassignGroupAction).toHaveBeenCalledWith({ eventId: 'e1', eventSlug: 'boda', groupId: 'a' })
  })

  it('borrar la mesa avisa de que los grupos quedarán sin sitio', async () => {
    removeTableAction.mockResolvedValueOnce({ ok: true, message: '2 grupos quedaron sin mesa.' } as never)
    render(<TableCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar mesa/i }))
    expect(removeTableAction).toHaveBeenCalledWith({ id: 't1', eventId: 'e1', eventSlug: 'boda' })
    expect(await screen.findByRole('status')).toHaveTextContent('2 grupos quedaron sin mesa.')
  })

  it('enseña el error del servidor cuando el grupo no cabe', async () => {
    assignGroupAction.mockResolvedValueOnce({ ok: false, kind: 'does_not_fit', message: 'faltan 3' } as never)
    render(<TableCard {...props} unseated={[grupo('c', 'Pareja Nieto', 2, null)]} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c' } })
    fireEvent.click(screen.getByRole('button', { name: /sentar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('faltan 3')
  })

  it('una mesa vacía lo dice en vez de mostrar una lista en blanco', () => {
    render(<TableCard {...props} table={{ ...mesa, taken: 0, free: 8, groups: [] }} />)
    expect(screen.getByText(/nadie sentado/i)).toBeInTheDocument()
  })
})

/**
 * `updateTableAction` estaba construida y probada sin que ninguna pantalla la
 * alcanzara: para corregir el nombre o la capacidad de una mesa había que borrarla, y
 * con ella se iba el reparto de los grupos que ya estaban sentados.
 */
describe('TableCard · corregir la mesa', () => {
  it('abre el formulario relleno con los datos de la mesa', () => {
    render(<TableCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar mesa$/i }))

    expect(screen.getByLabelText('Nombre de la mesa')).toHaveValue('Mesa 01')
    expect(screen.getByLabelText('Sitios')).toHaveValue(8)
    expect(screen.getByLabelText('Forma')).toHaveValue('round')
  })

  it('guardar llama a updateTableAction con el id y lo cambiado', () => {
    render(<TableCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar mesa$/i }))
    fireEvent.change(screen.getByLabelText('Nombre de la mesa'), { target: { value: 'Mesa de los abuelos' } })
    fireEvent.change(screen.getByLabelText('Sitios'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Forma'), { target: { value: 'rect' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateTableAction).toHaveBeenCalledWith({
      id: 't1',
      eventId: 'e1',
      eventSlug: 'boda',
      label: 'Mesa de los abuelos',
      capacity: 10,
      shape: 'rect',
    })
  })

  it('corregir la mesa no toca a quien ya está sentado', () => {
    render(<TableCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar mesa$/i }))

    expect(screen.getByText('Familia Rojas')).toBeInTheDocument()
    expect(screen.getByText('Camila Vargas')).toBeInTheDocument()

    // Abrir el formulario no manda nada: la corrección no es una excusa para reescribir
    // el reparto.
    expect(updateTableAction).not.toHaveBeenCalled()
  })

  it('una capacidad que no es un número no llama a la acción', () => {
    render(<TableCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar mesa$/i }))
    fireEvent.change(screen.getByLabelText('Sitios'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateTableAction).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('cancelar cierra el formulario sin llamar a nada', () => {
    render(<TableCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar mesa$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(updateTableAction).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Nombre de la mesa')).not.toBeInTheDocument()
  })
})
