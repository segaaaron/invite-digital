import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientSharePanel } from './ClientSharePanel'

/**
 * El panel tiene dos acciones —crear y revocar— y por tanto dos estados. El doble de
 * `useActionState` reparte por la acción que recibe, no por el orden de las llamadas:
 * atarlo al orden convertiría cualquier reordenación del componente en un falso verde.
 */
const createClientShareAction = vi.fn()
const revokeClientShareAction = vi.fn()

const estados = new Map<unknown, unknown>()

vi.mock('react', async () => {
  const react = await vi.importActual<typeof import('react')>('react')
  return {
    ...react,
    useActionState: (action: unknown, initial: unknown) => [estados.get(action) ?? initial, vi.fn(), false],
  }
})

vi.mock('@/app/_acciones/events/actions', () => ({
  createClientShareAction: (...args: unknown[]) => createClientShareAction(...args),
  revokeClientShareAction: (...args: unknown[]) => revokeClientShareAction(...args),
}))

const props = { eventId: 'e1', eventSlug: 'boda', live: { id: 's1', expiresAt: '2026-09-30' } }

beforeEach(() => {
  estados.clear()
})

describe('ClientSharePanel', () => {
  it('con un enlace vivo ofrece revocarlo', () => {
    render(<ClientSharePanel {...props} />)
    expect(screen.getByRole('button', { name: /revocar enlace/i })).toBeInTheDocument()
  })

  it('en reposo no hay alerta', () => {
    render(<ClientSharePanel {...props} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cuando la revocación falla, la pantalla dice que el enlace sigue activo', async () => {
    const actions = await import('@/app/_acciones/events/actions')
    estados.set(actions.revokeClientShareAction, { status: 'error' })

    render(<ClientSharePanel {...props} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos revocar el enlace\. sigue activo/i)
  })

  it('revocado de verdad no deja ninguna alerta', async () => {
    const actions = await import('@/app/_acciones/events/actions')
    estados.set(actions.revokeClientShareAction, { status: 'success' })

    render(<ClientSharePanel {...props} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sin enlace vivo no se ofrece revocar nada', () => {
    render(<ClientSharePanel {...props} live={null} />)
    expect(screen.queryByRole('button', { name: /revocar enlace/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear enlace/i })).toBeInTheDocument()
  })
})
