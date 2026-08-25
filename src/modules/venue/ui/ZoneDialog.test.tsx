import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZoneDialog } from './ZoneDialog'

const { addZoneAction, push } = vi.hoisted(() => ({
  addZoneAction: vi.fn<(input: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>>(async () => ({
    ok: true,
  })),
  push: vi.fn(),
}))
vi.mock('../actions', () => ({ addZoneAction }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => {
  addZoneAction.mockClear()
  push.mockClear()
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })
})

const props = { eventId: 'e1', eventSlug: 'boda', closeHref: '/panel/eventos/boda/mesas' }

describe('ZoneDialog', () => {
  it('ofrece los ocho elementos del salón de la maqueta', () => {
    render(<ZoneDialog {...props} />)
    expect(screen.getAllByRole('option')).toHaveLength(8)
  })

  it('el nombre libre solo aparece con «Otro (personalizado)»', () => {
    render(<ZoneDialog {...props} />)
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'custom' } })
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })

  it('un tipo con nombre propio se guarda con ese nombre, sin preguntarlo', async () => {
    render(<ZoneDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'music' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(addZoneAction).toHaveBeenCalledWith({ eventId: 'e1', eventSlug: 'boda', kind: 'music', label: 'Banda / DJ' }),
    )
  })

  it('un personalizado sin nombre no se guarda: sería un elemento sin identificar en el plano', () => {
    render(<ZoneDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'custom' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(addZoneAction).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('el error del servidor se ve y el diálogo se queda abierto', async () => {
    addZoneAction.mockResolvedValueOnce({ ok: false, message: 'La base no responde' })
    render(<ZoneDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La base no responde')
    expect(push).not.toHaveBeenCalled()
  })

  it('cancelar cierra sin crear nada', () => {
    render(<ZoneDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(addZoneAction).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/panel/eventos/boda/mesas')
  })
})
