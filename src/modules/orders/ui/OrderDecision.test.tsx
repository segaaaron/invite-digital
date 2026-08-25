import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DecideOrderState } from '../actions'
import { OrderDecision } from './OrderDecision'

const decidir = vi.hoisted(() => vi.fn<(previo: DecideOrderState, datos: FormData) => Promise<DecideOrderState>>())
vi.mock('../actions', () => ({ decideOrderAction: decidir }))

describe('OrderDecision', () => {
  it('la decisión viaja en el botón pulsado, no en un campo que se actualiza tarde', async () => {
    decidir.mockResolvedValue({ status: 'success' })
    render(<OrderDecision orderId="o1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))

    await waitFor(() => expect(decidir).toHaveBeenCalled())
    const datos = decidir.mock.calls[0]![1]
    // Si esto dijera «approved», rechazar estaría aprobando el pedido.
    expect(datos.get('decision')).toBe('rejected')
    expect(datos.get('orderId')).toBe('o1')
  })

  it('aprobar manda «approved»', async () => {
    decidir.mockResolvedValue({ status: 'success' })
    render(<OrderDecision orderId="o1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar pago' }))

    await waitFor(() => expect(decidir).toHaveBeenCalled())
    expect(decidir.mock.calls.at(-1)![1].get('decision')).toBe('approved')
  })

  it('enseña el motivo cuando el servidor rechaza la decisión', async () => {
    decidir.mockResolvedValue({ status: 'error', message: 'Un rechazo sin motivo obliga al cliente a llamar.' })
    render(<OrderDecision orderId="o1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/sin motivo/i))
  })
})
