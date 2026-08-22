import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ScanResultCard } from './ScanResultCard'

const group = { id: 'g1', label: 'Familia Rojas Peña', seats: 4, tableLabel: 'Mesa 03' }
const noop = () => {}

describe('ScanResultCard', () => {
  it('canta el número de mesa cuando existe', () => {
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 3 }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByLabelText('Mesa asignada')).toHaveTextContent('Mesa 03')
  })

  it('dice mesa por asignar cuando el grupo no tiene', () => {
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group: { ...group, tableLabel: null }, arrivedCount: 3 }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByLabelText('Mesa asignada')).toHaveTextContent(/por asignar/i)
  })

  it('también canta la mesa en un pase repetido: el invitado necesita saber dónde sentarse', () => {
    render(
      <ScanResultCard
        outcome={{
          scanId: 's1',
          kind: 'already',
          group,
          arrivedAt: new Date('2026-10-18T21:05:00Z'),
          arrivedCount: 3,
        }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByLabelText('Mesa asignada')).toHaveTextContent('Mesa 03')
  })

  it('un pase desconocido no habla de mesas', () => {
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'unknown' }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.queryByLabelText('Mesa asignada')).not.toBeInTheDocument()
  })

  it('da la bienvenida y dice cuántos entraron', () => {
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 3 }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByText(/Bienvenid/i)).toBeInTheDocument()
    expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument()
    expect(screen.getByLabelText('Personas que entraron')).toHaveTextContent('3')
  })

  it('avisa del pase repetido con la hora del primero', () => {
    render(
      <ScanResultCard
        outcome={{
          scanId: 's1',
          kind: 'already',
          group,
          arrivedAt: new Date('2026-10-18T21:05:00Z'),
          arrivedCount: 3,
        }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByText(/ya había ingresado/i)).toBeInTheDocument()
  })

  it('el pase desconocido no muestra ningún nombre', () => {
    render(
      <ScanResultCard outcome={{ scanId: 's1', kind: 'unknown' }} onAdjust={noop} onUndo={noop} onDismiss={noop} />,
    )
    expect(screen.getByText(/no es de tu evento/i)).toBeInTheDocument()
    expect(screen.queryByText('Familia Rojas Peña')).not.toBeInTheDocument()
  })

  it('bajar la cantidad avisa hacia arriba', () => {
    const onAdjust = vi.fn()
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 3 }}
        onAdjust={onAdjust}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Una persona menos' }))
    expect(onAdjust).toHaveBeenCalledWith('s1', 2)
  })

  it('no deja bajar de una persona ni pasar de los cupos', () => {
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 1 }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByRole('button', { name: 'Una persona menos' })).toBeDisabled()
  })

  it('deshacer avisa hacia arriba', () => {
    const onUndo = vi.fn()
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 2 }}
        onAdjust={noop}
        onUndo={onUndo}
        onDismiss={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(onUndo).toHaveBeenCalledWith('s1')
  })
})
