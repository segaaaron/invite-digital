import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanDecisionForms } from './PlanDecisionForms'

const applyPlanChangeAction = vi.fn()
const rejectPlanChangeAction = vi.fn()

/** Reparte por la acción, no por el orden de las llamadas a `useActionState`. */
const estados = new Map<unknown, unknown>()

vi.mock('react', async () => {
  const react = await vi.importActual<typeof import('react')>('react')
  return {
    ...react,
    useActionState: (action: unknown, initial: unknown) => [estados.get(action) ?? initial, vi.fn(), false],
  }
})

vi.mock('../actions', () => ({
  applyPlanChangeAction: (...args: unknown[]) => applyPlanChangeAction(...args),
  rejectPlanChangeAction: (...args: unknown[]) => rejectPlanChangeAction(...args),
}))

const props = { requestId: 'r1', eventSlug: 'boda' }

beforeEach(() => {
  estados.clear()
})

describe('PlanDecisionForms', () => {
  it('ofrece aplicar y descartar', () => {
    render(<PlanDecisionForms {...props} />)
    expect(screen.getByRole('button', { name: /aplicar el cambio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /descartar/i })).toBeInTheDocument()
  })

  it('en reposo no hay alerta', () => {
    render(<PlanDecisionForms {...props} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('si aplicar el cambio falla, la pantalla lo dice y no lo da por hecho', async () => {
    const actions = await import('../actions')
    estados.set(actions.applyPlanChangeAction, { status: 'error', kind: 'already_resolved' })

    render(<PlanDecisionForms {...props} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/ya estaba resuelta/i)
  })

  it('si descartar falla, también se dice', async () => {
    const actions = await import('../actions')
    estados.set(actions.rejectPlanChangeAction, { status: 'error', kind: 'storage_failure' })

    render(<PlanDecisionForms {...props} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos/i)
  })

  it('aplicado de verdad, ninguna alerta', async () => {
    const actions = await import('../actions')
    estados.set(actions.applyPlanChangeAction, { status: 'success' })

    render(<PlanDecisionForms {...props} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
