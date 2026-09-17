import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PassDialog } from './PassDialog'
import type { ResendState } from '@/app/_acciones/guests/actions'

const resendInvitationAction = vi.fn<(previous: unknown, formData: FormData) => Promise<ResendState>>(async () => ({
  status: 'success' as const,
  groupId: 'g1',
  label: 'Familia Rojas Peña',
  url: 'http://localhost:3000/i/AAAAAAAAAAAAAAAAAAAAAA',
}))
const replace = vi.fn()

vi.mock('@/app/_acciones/guests/actions', () => ({
  resendInvitationAction: (previous: unknown, formData: FormData) => resendInvitationAction(previous, formData),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

const props = {
  closeHref: '/panel/eventos/boda/invitados',
  eventSlug: 'boda',
  eventTitle: 'Marcia & Ricardo',
  eventMeta: '18 de octubre de 2026',
  venue: 'Hacienda Los Álamos',
  group: { id: 'g1', label: 'Familia Rojas Peña', revoked: false },
  personName: 'Ana Lucía Vega',
  tableLabel: 'Mesa 03',
}

beforeEach(() => {
  resendInvitationAction.mockClear()
  replace.mockClear()
  // jsdom no implementa `showModal`. El doble hace lo único que estas pruebas necesitan
  // de él: marcar el diálogo como abierto, que es lo que expone su contenido al árbol de
  // accesibilidad. Fingirlo con un `vi.fn()` vacío dejaba el diálogo cerrado y sin nada
  // dentro que consultar.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})

describe('PassDialog', () => {
  it('con el enlace guardado enseña el pase que ya tiene, sin generar otro', () => {
    render(<PassDialog {...props} url="http://localhost:3000/i/GUARDADO" />)

    expect(screen.getByText('http://localhost:3000/i/GUARDADO')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generar pase' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Generar un pase nuevo/ }))
    expect(screen.getByRole('alert')).toHaveTextContent(/dejarán de servir/)
    expect(resendInvitationAction).not.toHaveBeenCalled()
  })

  it('avisa antes de generar nada: el pase anterior deja de servir', () => {
    render(<PassDialog {...props} />)

    expect(screen.getByText(/deja de servir/i)).toBeInTheDocument()
    expect(resendInvitationAction).not.toHaveBeenCalled()
  })

  it('generar el pase pide uno nuevo para el grupo de la persona', async () => {
    render(<PassDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generar pase' }))

    await vi.waitFor(() => expect(resendInvitationAction).toHaveBeenCalled())
    const formData = resendInvitationAction.mock.calls[0]?.[1]
    expect(formData?.get('groupId')).toBe('g1')
    expect(formData?.get('eventSlug')).toBe('boda')
  })

  it('con el pase generado enseña la tarjeta de la maqueta', async () => {
    render(<PassDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generar pase' }))

    // El QR es lo único que la puerta lee: sin él la tarjeta no es un pase.
    expect(await screen.findByRole('img', { name: /pase de familia rojas peña/i })).toBeInTheDocument()
    expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument()
    expect(screen.getByText(/Mesa 03 · Hacienda Los Álamos/)).toBeInTheDocument()
    expect(screen.getByText(/Marcia & Ricardo · 18 de octubre de 2026/)).toBeInTheDocument()
  })

  it('sin mesa asignada lo dice, en vez de dejar el hueco', async () => {
    render(<PassDialog {...props} tableLabel={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generar pase' }))

    expect(await screen.findByText(/Mesa por asignar/)).toBeInTheDocument()
  })

  it('un grupo revocado no genera pases: revocar se deshace a propósito', () => {
    render(<PassDialog {...props} group={{ id: 'g1', label: 'Familia Rojas Peña', revoked: true }} />)

    expect(screen.queryByRole('button', { name: 'Generar pase' })).not.toBeInTheDocument()
    expect(screen.getByText(/revocada/i)).toBeInTheDocument()
  })

  it('el error del servidor se pinta', async () => {
    resendInvitationAction.mockResolvedValueOnce({ status: 'error', message: 'No se pudo rotar el enlace' } as never)
    render(<PassDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Generar pase' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo rotar el enlace')
  })

  it('cerrar vuelve a la lista', () => {
    render(<PassDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(replace).toHaveBeenCalledWith('/panel/eventos/boda/invitados')
  })
})
