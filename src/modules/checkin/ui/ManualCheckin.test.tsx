import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ManualCheckin } from './ManualCheckin'

// Sin `mockReset` entre casos a propósito: con vitest 4, resetear este mock de módulo
// hace que el rechazo del caso de error se reporte como error del propio test aunque el
// componente lo capture. Cada caso fija su implementación y con eso basta.
const registrar = vi.hoisted(() => vi.fn())
vi.mock('../actions', () => ({ checkInByGroupAction: registrar }))

const groups = [
  { id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false },
  { id: 'g2', label: 'Ana Lucía Vega', seats: 2, attending: 2, revoked: false },
  { id: 'g3', label: 'Zulema Castro', seats: 1, attending: null, revoked: true },
]

function pintar(arrivedIds: string[] = []) {
  render(<ManualCheckin arrivedIds={arrivedIds} eventId="e1" eventSlug="boda" groups={groups} />)
}

describe('ManualCheckin', () => {
  it('lista los grupos en orden alfabético', () => {
    pintar()
    const filas = screen.getAllByRole('listitem')
    expect(filas[0]).toHaveTextContent('Ana Lucía Vega')
    expect(filas[1]).toHaveTextContent('Familia Rojas Peña')
  })

  it('filtra por nombre y encuentra también a quien tenía la invitación revocada', () => {
    pintar()
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'zulema' } })
    expect(screen.getByText('Zulema Castro')).toBeInTheDocument()
    expect(screen.getByText(/invitación revocada/i)).toBeInTheDocument()
    expect(screen.queryByText('Ana Lucía Vega')).not.toBeInTheDocument()
  })

  it('a quien ya llegó lo dice con texto y no ofrece registrarlo otra vez', () => {
    pintar(['g1'])
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'rojas' } })
    expect(screen.getByText(/ya está dentro/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar/i })).not.toBeInTheDocument()
  })

  it('si el servidor rechaza, lo dice en la pantalla y no da la llegada por buena', async () => {
    // Un fallo que solo va a `console.error` deja a quien está en la puerta creyendo que
    // registró a una familia que la base no tiene.
    registrar.mockImplementation(async () => {
      throw new Error('storage_failure')
    })
    pintar()
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'ana' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /registrar/i }))
    })

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo registrar/i))
    expect(screen.queryByText(/ya está dentro/i)).not.toBeInTheDocument()
  })
  it('registrar llama a la acción con el grupo y luego lo da por dentro', async () => {
    registrar.mockResolvedValue({ kind: 'welcome' })
    pintar()
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }))

    await waitFor(() => expect(screen.getByText(/ya está dentro/i)).toBeInTheDocument())
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1', eventSlug: 'boda', groupId: 'g2' }))
  })

})
