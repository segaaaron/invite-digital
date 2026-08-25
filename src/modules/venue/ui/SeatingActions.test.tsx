import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SeatingActions } from './SeatingActions'

const { autoAssignAction } = vi.hoisted(() => ({ autoAssignAction: vi.fn(async () => ({ ok: true })) }))
vi.mock('../actions', () => ({ autoAssignAction }))

beforeEach(() => autoAssignAction.mockClear())

const props = { addHref: '/panel/eventos/boda/mesas?panel=mesa', eventId: 'e1', eventSlug: 'boda', unseatedCount: 2 }

describe('SeatingActions', () => {
  it('reparte lo que falta y cuenta lo que quedó fuera', async () => {
    autoAssignAction.mockResolvedValueOnce({ ok: true, message: '1 repartido. Sin sitio: Los Nieto.' } as never)
    render(<SeatingActions {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /auto-asignar/i }))
    expect(autoAssignAction).toHaveBeenCalledWith({ eventId: 'e1', eventSlug: 'boda' })
    expect(await screen.findByRole('status')).toHaveTextContent('Sin sitio: Los Nieto.')
  })

  it('no ofrece repartir cuando no queda nadie sin mesa', () => {
    render(<SeatingActions {...props} unseatedCount={0} />)
    expect(screen.queryByRole('button', { name: /auto-asignar/i })).not.toBeInTheDocument()
  })

  it('un fallo del servidor se ve en pantalla, no solo en el registro', async () => {
    autoAssignAction.mockResolvedValueOnce({ ok: false, message: 'La base no responde' } as never)
    render(<SeatingActions {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /auto-asignar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La base no responde')
  })

  it('lleva a imprimir el plan del banquete', () => {
    render(<SeatingActions {...props} />)
    expect(screen.getByRole('link', { name: /imprimir plan/i }).getAttribute('href')).toBe(
      '/panel/eventos/boda/mesas/imprimir',
    )
  })
})
