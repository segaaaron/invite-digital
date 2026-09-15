import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RevokeInvitationState } from '@/app/_acciones/guests/actions'
import { RevokeInvitationForm } from './RevokeInvitationForm'

/**
 * La mitad que de verdad importa: que el fallo **llegue a la pantalla**. Una acción que
 * devuelve el error y una pantalla que no lo pinta dejan al atelier exactamente igual de
 * engañado que antes.
 */
const estado = vi.fn<() => RevokeInvitationState>(() => ({ status: 'idle' }))

vi.mock('react', async () => {
  const react = await vi.importActual<typeof import('react')>('react')
  return {
    ...react,
    useActionState: () => [estado(), vi.fn(), false] as const,
  }
})

vi.mock('@/app/_acciones/guests/actions', () => ({ revokeInvitationAction: vi.fn() }))

const props = { groupId: 'g1', eventSlug: 'boda' }

describe('RevokeInvitationForm', () => {
  it('ofrece revocar', () => {
    render(<RevokeInvitationForm {...props} />)
    expect(screen.getByRole('button', { name: /revocar/i })).toBeInTheDocument()
  })

  it('en reposo no grita nada', () => {
    render(<RevokeInvitationForm {...props} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cuando la revocación falla, la pantalla lo dice', () => {
    estado.mockReturnValue({ status: 'error', message: 'storage_failure' })
    render(<RevokeInvitationForm {...props} />)

    const aviso = screen.getByRole('alert')
    expect(aviso).toHaveTextContent(/no pudimos revocar/i)
  })

  it('un grupo que ya no existe también se dice, y en español', () => {
    estado.mockReturnValue({ status: 'error', message: 'not_found' })
    render(<RevokeInvitationForm {...props} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/ya no existe/i)
  })

  it('revocada de verdad, no hay alerta', () => {
    estado.mockReturnValue({ status: 'success' })
    render(<RevokeInvitationForm {...props} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
