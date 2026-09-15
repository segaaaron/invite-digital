import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FundView } from '../application/list-registry'
import { FundCard } from './FundCard'

const removeFundAction = vi.fn(async () => ({ ok: true as const }))
const recordContributionAction = vi.fn(async () => ({ ok: true as const }))

const addFundAction = vi.fn(async () => ({ ok: true as const }))
const updateFundAction = vi.fn(async () => ({ ok: true as const }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/app/_acciones/registry/actions', () => ({
  removeFundAction: (...args: unknown[]) => removeFundAction(...(args as [])),
  recordContributionAction: (...args: unknown[]) => recordContributionAction(...(args as [])),
  addFundAction: (...args: unknown[]) => addFundAction(...(args as [])),
  updateFundAction: (...args: unknown[]) => updateFundAction(...(args as [])),
}))

const AHORA = new Date('2026-08-21T12:00:00.000Z')

const vista = (raisedCents: number, goalCents = 100_000): FundView => ({
  fund: { id: 'f1', eventId: 'e1', name: 'Luna de miel', description: 'Pasajes y hotel.', goalCents },
  progress: {
    raisedCents,
    goalCents,
    percent: Math.min(100, Math.floor((raisedCents / goalCents) * 100)),
    exceeded: raisedCents > goalCents,
  },
  contributions:
    raisedCents === 0
      ? []
      : [
          {
            id: 'c1',
            fundId: 'f1',
            guestGroupId: null,
            displayName: 'Abuela Rosa',
            amountCents: raisedCents,
            method: 'envelope',
            message: 'Que sean muy felices.',
            createdAt: AHORA,
          },
        ],
})

const props = { eventId: 'e1', eventSlug: 'boda', currency: 'BOB' }

const anchoDeLaBarra = (): number => {
  const barra = screen.getByRole('progressbar')
  return Number.parseFloat((barra.getAttribute('style') ?? '').replace(/[^\d.]/g, '') || '0')
}

beforeEach(() => {
  removeFundAction.mockClear()
  recordContributionAction.mockClear()
  addFundAction.mockClear()
  updateFundAction.mockClear()
})

describe('FundCard', () => {
  it('muestra el nombre, la descripción y lo recaudado frente a la meta', () => {
    render(<FundCard {...props} view={vista(50_000)} />)
    expect(screen.getByText('Luna de miel')).toBeInTheDocument()
    expect(screen.getByText('Pasajes y hotel.')).toBeInTheDocument()
    // El importe aparece dos veces —en el titular y en la fila de la aportación—, y las
    // dos veces tiene que ser el mismo número.
    expect(screen.getAllByText(/500,00/).length).toBeGreaterThan(0)
    expect(screen.getByText(/de .*1\.000,00/)).toBeInTheDocument()
  })

  it('la barra refleja el porcentaje', () => {
    render(<FundCard {...props} view={vista(50_000)} />)
    expect(anchoDeLaBarra()).toBe(50)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  })

  it('sin aportaciones la barra está a cero y lo dice', () => {
    render(<FundCard {...props} view={vista(0)} />)
    expect(anchoDeLaBarra()).toBe(0)
    expect(screen.getByText(/todavía no hay aportaciones/i)).toBeInTheDocument()
  })

  it('con la meta superada la barra no pasa del 100 % y aparece el aviso', () => {
    // Una barra al 140 % se sale del contenedor: el exceso se dice con palabras.
    render(<FundCard {...props} view={vista(140_000)} />)
    expect(anchoDeLaBarra()).toBe(100)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText(/meta superada/i)).toBeInTheDocument()
  })

  it('justo en la meta no dice que se superó', () => {
    render(<FundCard {...props} view={vista(100_000)} />)
    expect(anchoDeLaBarra()).toBe(100)
    expect(screen.queryByText(/meta superada/i)).not.toBeInTheDocument()
  })

  it('lista quién aportó y cuánto', () => {
    render(<FundCard {...props} view={vista(50_000)} />)
    const fila = screen.getByText('Abuela Rosa').closest('li')
    expect(fila).not.toBeNull()
    expect(fila?.textContent).toMatch(/500,00/)
  })

  it('borrar el fondo avisa de cuántas aportaciones se lleva por delante', async () => {
    removeFundAction.mockResolvedValueOnce({ ok: true, message: 'Fondo eliminado junto a 3 aportaciones.' } as never)
    render(<FundCard {...props} view={vista(50_000)} />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar fondo/i }))

    expect(removeFundAction).toHaveBeenCalledWith({ id: 'f1', eventId: 'e1', eventSlug: 'boda' })
    expect(await screen.findByRole('status')).toHaveTextContent('3 aportaciones')
  })
})

describe('FundCard · editar un fondo', () => {
  it('abre el formulario relleno con los datos del fondo', () => {
    render(<FundCard {...props} view={vista(50_000)} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar fondo$/i }))

    expect(screen.getByLabelText('Fondo')).toHaveValue('Luna de miel')
    expect(screen.getByLabelText('Meta')).toHaveValue('1000.00')
  })

  it('bajar la meta por debajo de lo recaudado se permite: la pareja ajusta su objetivo', () => {
    render(<FundCard {...props} view={vista(140_000)} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar fondo$/i }))
    fireEvent.change(screen.getByLabelText('Meta'), { target: { value: '600' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateFundAction).toHaveBeenCalledWith({
      id: 'f1',
      eventId: 'e1',
      eventSlug: 'boda',
      name: 'Luna de miel',
      description: 'Pasajes y hotel.',
      goalCents: 60_000,
    })
  })

  it('con la meta por debajo de lo recaudado la barra sigue recortada al 100 % y avisa', () => {
    // Mientras se corrige, el progreso tiene que seguir a la vista: es lo que explica
    // por qué la meta se está bajando.
    render(<FundCard {...props} view={vista(140_000)} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar fondo$/i }))

    expect(anchoDeLaBarra()).toBe(100)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText(/meta superada/i)).toBeInTheDocument()
  })

  it('cancelar cierra el formulario sin llamar a nada', () => {
    render(<FundCard {...props} view={vista(50_000)} />)
    fireEvent.click(screen.getByRole('button', { name: /^editar fondo$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(updateFundAction).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Meta')).not.toBeInTheDocument()
  })
})
