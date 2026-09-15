import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContributionForm } from './ContributionForm'

type ActionResult = { ok: true; message?: string } | { ok: false; kind: string; message: string }

const recordContributionAction = vi.fn<(input: Record<string, unknown>) => Promise<ActionResult>>(async () => ({ ok: true }))

vi.mock('@/app/_acciones/registry/actions', () => ({
  recordContributionAction: (...args: unknown[]) => recordContributionAction(...(args as [Record<string, unknown>])),
}))

const props = { eventId: 'e1', eventSlug: 'boda', fundId: 'f1' }

const rellena = (campos: { nombre?: string; importe?: string; mensaje?: string }) => {
  if (campos.nombre !== undefined) fireEvent.change(screen.getByLabelText('De parte de'), { target: { value: campos.nombre } })
  if (campos.importe !== undefined) fireEvent.change(screen.getByLabelText('Importe'), { target: { value: campos.importe } })
  if (campos.mensaje !== undefined) fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: campos.mensaje } })
}

beforeEach(() => {
  recordContributionAction.mockClear()
})

describe('ContributionForm', () => {
  it('registra la aportación con el importe ya en centavos enteros', () => {
    render(<ContributionForm {...props} />)
    rellena({ nombre: 'Abuela Rosa', importe: '150,50', mensaje: 'Que sean felices.' })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(recordContributionAction).toHaveBeenCalledWith({
      eventId: 'e1',
      eventSlug: 'boda',
      fundId: 'f1',
      guestGroupId: null,
      displayName: 'Abuela Rosa',
      amountCents: 15_050,
      method: 'transfer',
      message: 'Que sean felices.',
    })
  })

  it('deja elegir la forma de pago', () => {
    render(<ContributionForm {...props} />)
    rellena({ nombre: 'Abuela Rosa', importe: '100' })
    fireEvent.change(screen.getByLabelText('Forma de pago'), { target: { value: 'envelope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(recordContributionAction.mock.calls[0]?.[0]).toMatchObject({ method: 'envelope' })
  })

  it('el importe con texto se rechaza sin llamar a la acción', () => {
    render(<ContributionForm {...props} />)
    rellena({ nombre: 'Abuela Rosa', importe: 'un montón' })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(recordContributionAction).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('el importe de cero se rechaza sin llamar a la acción', () => {
    render(<ContributionForm {...props} />)
    rellena({ nombre: 'Abuela Rosa', importe: '0' })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(recordContributionAction).not.toHaveBeenCalled()
  })

  it('el mensaje vacío viaja como null', () => {
    render(<ContributionForm {...props} />)
    rellena({ nombre: 'Abuela Rosa', importe: '100' })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(recordContributionAction.mock.calls[0]?.[0]).toMatchObject({ message: null })
  })

  it('enseña el error del servidor', async () => {
    recordContributionAction.mockResolvedValueOnce({ ok: false, kind: 'wrong_event', message: 'Otro evento' })
    render(<ContributionForm {...props} />)
    rellena({ nombre: 'Abuela Rosa', importe: '100' })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Otro evento')
  })
})
