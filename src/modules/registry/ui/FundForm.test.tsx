import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FundForm } from './FundForm'

type ActionResult = { ok: true; message?: string } | { ok: false; kind: string; message: string }

const addFundAction = vi.fn<(input: Record<string, unknown>) => Promise<ActionResult>>(async () => ({ ok: true }))

vi.mock('../actions', () => ({
  addFundAction: (...args: unknown[]) => addFundAction(...(args as [Record<string, unknown>])),
}))

const props = { eventId: 'e1', eventSlug: 'boda' }

const rellena = (campos: { nombre?: string; meta?: string; descripcion?: string }) => {
  if (campos.nombre !== undefined) fireEvent.change(screen.getByLabelText('Fondo'), { target: { value: campos.nombre } })
  if (campos.meta !== undefined) fireEvent.change(screen.getByLabelText('Meta'), { target: { value: campos.meta } })
  if (campos.descripcion !== undefined)
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: campos.descripcion } })
}

beforeEach(() => {
  addFundAction.mockClear()
})

describe('FundForm', () => {
  it('manda la meta ya convertida a centavos enteros', () => {
    render(<FundForm {...props} />)
    rellena({ nombre: 'Luna de miel', meta: '5.000,00', descripcion: 'Pasajes y hotel.' })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fondo' }))

    expect(addFundAction).toHaveBeenCalledWith({
      eventId: 'e1',
      eventSlug: 'boda',
      name: 'Luna de miel',
      description: 'Pasajes y hotel.',
      goalCents: 500_000,
    })
  })

  it('una meta con texto se rechaza sin llamar a la acción', () => {
    render(<FundForm {...props} />)
    rellena({ nombre: 'Luna de miel', meta: 'lo que se pueda' })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fondo' }))

    expect(addFundAction).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('una meta de cero se rechaza: un fondo sin meta no tiene barra que llenar', () => {
    render(<FundForm {...props} />)
    rellena({ nombre: 'Luna de miel', meta: '0' })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fondo' }))
    expect(addFundAction).not.toHaveBeenCalled()
  })

  it('la descripción vacía viaja como null', () => {
    render(<FundForm {...props} />)
    rellena({ nombre: 'Luna de miel', meta: '100' })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fondo' }))
    expect(addFundAction.mock.calls[0]?.[0]).toMatchObject({ description: null })
  })

  it('enseña el error del servidor', async () => {
    addFundAction.mockResolvedValueOnce({ ok: false, kind: 'invalid_name', message: 'El nombre va de 1 a 160' })
    render(<FundForm {...props} />)
    rellena({ nombre: '', meta: '100' })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fondo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre va de 1 a 160')
  })
})
