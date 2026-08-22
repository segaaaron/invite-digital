import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'
import { SeatingToolbar } from './SeatingToolbar'

const addTableAction = vi.fn(async () => ({ ok: true as const }))
const autoAssignAction = vi.fn(async () => ({ ok: true as const }))

vi.mock('../actions', () => ({
  addTableAction: (...args: unknown[]) => addTableAction(...(args as [])),
  autoAssignAction: (...args: unknown[]) => autoAssignAction(...(args as [])),
}))

const grupo = (id: string, label: string, tableId: string | null): SeatedGroupRow => ({
  id,
  eventId: 'e1',
  label,
  seats: 2,
  tableId,
  revoked: false,
  confirmed: 2,
})

const mesa: SeatedTable = {
  id: 't1',
  eventId: 'e1',
  label: 'Mesa 01',
  capacity: 8,
  shape: 'round',
  x: 50,
  y: 50,
  taken: 2,
  free: 6,
  groups: [grupo('a', 'Familia Rojas', 't1')],
}

const props = {
  eventId: 'e1',
  eventSlug: 'boda',
  tables: [mesa],
  unseated: [grupo('b', 'Camila Vargas', null)],
  totalSeats: 8,
  totalConfirmed: 4,
}

beforeEach(() => {
  addTableAction.mockClear()
  autoAssignAction.mockClear()
})

describe('SeatingToolbar', () => {
  it('resume los sitios del salón frente a los comensales confirmados', () => {
    render(<SeatingToolbar {...props} />)
    expect(screen.getByLabelText('Sitios del salón')).toHaveTextContent('8')
    expect(screen.getByLabelText('Comensales confirmados')).toHaveTextContent('4')
  })

  it('crea una mesa con su etiqueta, cupo y forma', () => {
    render(<SeatingToolbar {...props} />)
    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: 'Mesa 02' } })
    fireEvent.change(screen.getByLabelText('Cupo'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Forma'), { target: { value: 'imperial' } })
    fireEvent.click(screen.getByRole('button', { name: /añadir mesa/i }))
    expect(addTableAction).toHaveBeenCalledWith({
      eventId: 'e1',
      eventSlug: 'boda',
      label: 'Mesa 02',
      capacity: 10,
      shape: 'imperial',
    })
  })

  it('enseña el error del servidor cuando la etiqueta ya existe', async () => {
    addTableAction.mockResolvedValueOnce({ ok: false, kind: 'duplicate_label', message: 'Ya hay una «Mesa 01»' } as never)
    render(<SeatingToolbar {...props} />)
    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: 'Mesa 01' } })
    fireEvent.click(screen.getByRole('button', { name: /añadir mesa/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una «Mesa 01»')
  })

  it('reparte lo que falta y cuenta lo que quedó fuera', async () => {
    autoAssignAction.mockResolvedValueOnce({ ok: true, message: '1 repartido. Sin sitio: Los Nieto.' } as never)
    render(<SeatingToolbar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /repartir/i }))
    expect(autoAssignAction).toHaveBeenCalledWith({ eventId: 'e1', eventSlug: 'boda' })
    expect(await screen.findByRole('status')).toHaveTextContent('Sin sitio: Los Nieto.')
  })

  it('no ofrece repartir cuando no queda nadie sin mesa', () => {
    render(<SeatingToolbar {...props} unseated={[]} />)
    expect(screen.queryByRole('button', { name: /repartir/i })).not.toBeInTheDocument()
  })

  it('el buscador dice en qué mesa se sienta un grupo', () => {
    render(<SeatingToolbar {...props} />)
    fireEvent.change(screen.getByLabelText('Buscar grupo'), { target: { value: 'rojas' } })
    expect(screen.getByRole('status')).toHaveTextContent('Mesa 01')
  })

  it('el buscador avisa cuando el grupo aún no tiene mesa', () => {
    render(<SeatingToolbar {...props} />)
    fireEvent.change(screen.getByLabelText('Buscar grupo'), { target: { value: 'camila' } })
    expect(screen.getByRole('status')).toHaveTextContent(/sin mesa/i)
  })

  it('el buscador avisa cuando no encuentra a nadie con ese nombre', () => {
    render(<SeatingToolbar {...props} />)
    fireEvent.change(screen.getByLabelText('Buscar grupo'), { target: { value: 'zulema' } })
    expect(screen.getByRole('status')).toHaveTextContent(/no encontramos/i)
  })
})
