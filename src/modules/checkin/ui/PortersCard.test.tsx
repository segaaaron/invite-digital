import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PortersCard } from './PortersCard'

const estado = { valor: { status: 'idle' } as Record<string, unknown> }
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>()
  return { ...react, useActionState: (_accion: unknown, inicial: unknown) => [estado.valor.status === 'idle' ? inicial : estado.valor, vi.fn(), false] }
})
vi.mock('../porter-actions', () => ({ addPorterAction: vi.fn(), removePorterAction: vi.fn() }))

const base = { eventId: 'e1', eventSlug: 'xv-valeria', limite: 3 }
const portero = { id: 'p1', name: 'Carlos', gate: 'Puerta 1', phone: '+59170012345', createdAt: '14 sep 2026', registradas: 0, ultima: null }

beforeEach(() => {
  estado.valor = { status: 'idle' }
})

describe('PortersCard', () => {
  it('sin porteros lo dice y enseña el cupo del plan', () => {
    render(<PortersCard {...base} porteros={[]} />)
    expect(screen.getByText(/todavía no sumaste porteros/i)).toBeInTheDocument()
    expect(screen.getByText('0 de 3')).toBeInTheDocument()
  })

  it('con el cupo lleno el botón se apaga y dice por qué', () => {
    render(<PortersCard {...base} limite={1} porteros={[portero]} />)
    expect(screen.getByRole('button', { name: /agregar portero/i })).toBeDisabled()
    expect(screen.getByText(/tu plan admite hasta 1/i)).toBeInTheDocument()
  })

  it('lista a cada portero con su puerta y un botón para quitarlo', () => {
    render(<PortersCard {...base} porteros={[portero]} />)
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText(/Puerta 1/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar a Carlos' })).toBeInTheDocument()
  })

  it('tras sumar enseña enlace y PIN una sola vez, con WhatsApp', () => {
    estado.valor = { status: 'created', nombre: 'Carlos', enlace: 'https://luxuryatelier.net/p/TOKEN', pin: '123456', whatsapp: 'https://wa.me/59170012345?text=x' }
    render(<PortersCard {...base} porteros={[portero]} />)
    expect(screen.getByText('123456')).toBeInTheDocument()
    expect(screen.getByText('https://luxuryatelier.net/p/TOKEN')).toBeInTheDocument()
    expect(screen.getByText(/no se vuelve a mostrar/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /enviar por whatsapp/i })).toHaveAttribute('href', 'https://wa.me/59170012345?text=x')
  })

  it('quitar pide confirmación antes de cortar el acceso', () => {
    render(<PortersCard {...base} porteros={[portero]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar a Carlos' }))
    expect(screen.getByRole('button', { name: /sí, quitar/i })).toBeInTheDocument()
  })

  it('dice cuántos grupos registró cada portero y a qué hora el último', () => {
    render(<PortersCard {...base} porteros={[{ ...portero, registradas: 12, ultima: '23:40' }]} />)
    expect(screen.getByText(/12 grupos registrados · el último a las 23:40/)).toBeInTheDocument()
  })
})
