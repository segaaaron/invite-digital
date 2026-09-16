import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EquipoCard } from './EquipoCard'

/** El estado que devuelve cada acción, por su nombre. */
const estados = vi.hoisted(() => ({ porteros: { status: 'idle' } as Record<string, unknown>, equipo: { status: 'idle' } as Record<string, unknown> }))
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>()
  return {
    ...react,
    useActionState: (accion: { quien?: 'porteros' | 'equipo' }, inicial: unknown) => {
      const valor = accion.quien === undefined ? { status: 'idle' } : estados[accion.quien]
      return [valor.status === 'idle' ? inicial : valor, vi.fn(), false]
    },
  }
})
vi.mock('@/app/_acciones/checkin/porter-actions', () => ({ addPorterAction: Object.assign(vi.fn(), { quien: 'porteros' }), removePorterAction: vi.fn() }))
vi.mock('@/app/_acciones/events/team-actions', () => ({ addTeamMemberAction: Object.assign(vi.fn(), { quien: 'equipo' }), removeTeamMemberAction: vi.fn() }))

const portero = { id: 'p1', name: 'Carlos', gate: 'Puerta 1', phone: '+59170012345', createdAt: '14 sep 2026', registradas: 0, ultima: null }
const base = {
  eventId: 'e1',
  eventSlug: 'xv-valeria',
  sumaEquipo: true,
  miembros: [
    { userId: 'u1', email: 'mama@correo.bo', nombre: 'María Rojas', telefono: '+591 700 12345', papel: 'anfitrion' as const },
    { userId: 'u2', email: 'tia@correo.bo', nombre: null, telefono: null, papel: 'coanfitrion' as const },
  ],
  topes: { planners: 1 },
  porteros: { lista: [portero], limite: 3 },
}

beforeEach(() => {
  estados.porteros = { status: 'idle' }
  estados.equipo = { status: 'idle' }
})

describe('EquipoCard', () => {
  it('una sola lista con cada persona y lo que hace', () => {
    render(<EquipoCard {...base} />)
    expect(screen.getByRole('listitem', { name: 'tia@correo.bo' })).toHaveTextContent('Co-anfitrión')
    expect(screen.getByRole('listitem', { name: 'Carlos' })).toHaveTextContent('Recepción')
    // Quien compró, con nombre, correo y teléfono: a quién llamar.
    const compro = screen.getByRole('listitem', { name: 'María Rojas' })
    expect(compro).toHaveTextContent('quien compró')
    expect(compro).toHaveTextContent('mama@correo.bo')
    expect(compro).toHaveTextContent('+591 700 12345')
  })

  // La familia entra con la cuenta del cliente: ya no se suman co-anfitriones.
  it('no ofrece co-anfitrión', () => {
    render(<EquipoCard {...base} />)
    expect(screen.queryByRole('radio', { name: /Co-anfitrión/ })).not.toBeInTheDocument()
  })

  it('un solo formulario: recepción pide nombre; la planner, correo', () => {
    render(<EquipoCard {...base} />)
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /Recepción/ }))
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sumar al equipo' })).toBeInTheDocument()
  })

  it('cada papel dice su cupo, y el plan sin puerta no ofrece porteros', () => {
    const { rerender } = render(<EquipoCard {...base} />)
    expect(screen.getByRole('radio', { name: /Recepción/ }).closest('label')).toHaveTextContent('1 de 3')

    rerender(<EquipoCard {...base} porteros={null} />)
    expect(screen.getByRole('radio', { name: /Recepción/ })).toBeDisabled()
    expect(screen.getByText(/no incluye pases con QR ni personal de recepción/)).toBeInTheDocument()
  })

  // Su planner suma recepción, pero no da acceso al panel a nadie.
  it('quien solo suma recepción no ve las opciones de cuenta', () => {
    render(<EquipoCard {...base} sumaEquipo={false} />)
    expect(screen.queryByRole('radio', { name: /Planner/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })

  it('tras sumar un portero enseña enlace y PIN una sola vez, con WhatsApp', () => {
    estados.porteros = { status: 'created', nombre: 'Carlos', enlace: 'https://luxuryatelier.net/p/TOKEN', pin: '123456', whatsapp: 'https://wa.me/59170012345?text=x' }
    render(<EquipoCard {...base} />)
    expect(screen.getByText('123456')).toBeInTheDocument()
    expect(screen.getByText(/no se vuelve a mostrar/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /enviar por whatsapp/i })).toHaveAttribute('href', 'https://wa.me/59170012345?text=x')
  })

  it('quitar a un portero pide confirmación', () => {
    render(<EquipoCard {...base} />)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar a Carlos' }))
    expect(screen.getByRole('button', { name: /sí, quitar/i })).toBeInTheDocument()
  })
})
