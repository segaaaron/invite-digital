import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SeatingToolbar } from './SeatingToolbar'

const addTableAction = vi.fn(async () => ({ ok: true as const }))

vi.mock('../actions', () => ({
  addTableAction: (...args: unknown[]) => addTableAction(...(args as [])),
}))

const props = { eventId: 'e1', eventSlug: 'boda' }

beforeEach(() => {
  addTableAction.mockClear()
})

describe('SeatingToolbar', () => {
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

})
