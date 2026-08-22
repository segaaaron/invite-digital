import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DoorSearchSheet } from './DoorSearchSheet'

const groups = [
  { id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, tableLabel: 'Mesa 03', tokenHashHex: 'aa' },
  { id: 'g2', label: 'Ana Lucía Vega', seats: 2, attending: 2, revoked: false, tableLabel: null, tokenHashHex: 'bb' },
  { id: 'g3', label: 'Zulema Castro', seats: 1, attending: null, revoked: true, tableLabel: null, tokenHashHex: 'cc' },
]

describe('DoorSearchSheet', () => {
  it('lista los grupos que faltan por llegar, en orden alfabético', () => {
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={() => {}} onClose={() => {}} />)
    const filas = screen.getAllByRole('button', { name: /cupo/i })
    expect(filas[0]).toHaveTextContent('Ana Lucía Vega')
    expect(filas[1]).toHaveTextContent('Familia Rojas Peña')
  })

  it('filtra por nombre', () => {
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'rojas' } })
    expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument()
    expect(screen.queryByText('Ana Lucía Vega')).not.toBeInTheDocument()
  })

  it('encuentra también a quien tenía la invitación revocada', () => {
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'zulema' } })
    expect(screen.getByText('Zulema Castro')).toBeInTheDocument()
    expect(screen.getByText(/invitación revocada/i)).toBeInTheDocument()
  })

  it('marca a quien ya llegó y no deja registrarlo otra vez desde aquí', () => {
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set(['g1'])} open onPick={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'rojas' } })
    expect(screen.getByText(/ya llegó/i)).toBeInTheDocument()
  })

  it('elegir un grupo avisa hacia arriba con su id', () => {
    const onPick = vi.fn()
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={onPick} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: /Ana Lucía Vega/ }))
    expect(onPick).toHaveBeenCalledWith('g2')
  })
})
