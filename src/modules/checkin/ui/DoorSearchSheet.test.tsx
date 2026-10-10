import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { DoorSearchSheet } from './DoorSearchSheet'

const groups = [
  {
    id: 'g1',
    label: 'Familia Rojas Peña',
    seats: 3,
    attending: 3,
    revoked: false,
    tableLabel: 'Mesa 03',
    leadName: null,
    tokenHashHex: 'aa',
    people: [
      { id: 'p1', fullName: 'Juan Rojas' },
      { id: 'p2', fullName: 'Ana Peña' },
      { id: 'p3', fullName: 'Lucía Rojas' },
    ],
  },
  { id: 'g2', label: 'Ana Lucía Vega', seats: 2, attending: 2, revoked: false, tableLabel: null, leadName: null, tokenHashHex: 'bb', people: [] },
  { id: 'g3', label: 'Zulema Castro', seats: 1, attending: null, revoked: true, tableLabel: null, leadName: null, tokenHashHex: 'cc', people: [] },
  { id: 'g4', label: 'Pedro Gil', seats: 1, attending: 0, revoked: false, tableLabel: 'Mesa 05', leadName: null, tokenHashHex: 'dd', people: [] },
]
const nadie = () => ({})
const pintar = (props: Partial<Parameters<typeof DoorSearchSheet>[0]> = {}) =>
  render(<DoorSearchSheet arrivedIds={new Set()} dentro={nadie} groups={groups} onClose={() => {}} onPick={() => {}} open {...props} />)

describe('la lista de la puerta (9 oct: el portero ve quién falta y quién entró, sin poder editar nada)', () => {
  it('por defecto, quién falta por llegar, en orden alfabético y con su mesa; sin revocados ni quien dijo que no', () => {
    pintar()
    const filas = screen.getAllByRole('button', { name: /registrar/i })
    expect(filas.map((f) => f.textContent)).toEqual([expect.stringContaining('Ana Lucía Vega'), expect.stringContaining('Familia Rojas Peña')])
    expect(filas[1]).toHaveTextContent('Mesa 03')
    expect(screen.getByRole('tab', { name: /Por llegar · 2/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('«Dentro» dice cuántos de la familia entraron y a qué hora, y deja registrar al resto', () => {
    const onPick = vi.fn()
    pintar({ arrivedIds: new Set(['g1']), dentro: (id) => (id === 'g1' ? { p1: new Date('2026-12-12T20:14:00-04:00'), p2: new Date('2026-12-12T20:14:00-04:00') } : {}), onPick })
    fireEvent.click(screen.getByRole('tab', { name: /Dentro · 1/ }))
    const fila = screen.getByRole('button', { name: /Familia Rojas Peña/ })
    expect(fila).toHaveTextContent('2 de 3 dentro')
    expect(fila).toHaveTextContent('20:14')
    fireEvent.click(fila)
    expect(onPick).toHaveBeenCalledWith('g1')
    // Mientras falte alguien, la familia sigue también en «Por llegar».
    fireEvent.click(screen.getByRole('tab', { name: /Por llegar · 2/ }))
  })

  it('una invitación que entró entera no se vuelve a registrar', () => {
    pintar({ arrivedIds: new Set(['g2']) })
    fireEvent.click(screen.getByRole('tab', { name: /Dentro · 1/ }))
    expect(screen.getByRole('button', { name: /Ana Lucía Vega/ })).toBeDisabled()
  })

  it('una llegada sin personas anotadas (puertas antiguas) cuenta a todos dentro, no «0 de 3» (QA 9 oct)', () => {
    pintar({ arrivedIds: new Set(['g1']) })
    expect(screen.getByRole('tab', { name: /Por llegar · 1/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Dentro · 1/ }))
    const fila = screen.getByRole('button', { name: /Familia Rojas Peña/ })
    expect(fila).toHaveTextContent('3 de 3 dentro')
    expect(fila).toBeDisabled()
  })

  it('«No vienen» enseña a quien respondió que no', () => {
    pintar()
    fireEvent.click(screen.getByRole('tab', { name: /No vienen · 1/ }))
    expect(within(screen.getByRole('tabpanel')).getByText('Pedro Gil')).toBeInTheDocument()
  })

  it('buscar mira a todos —también revocados y por el nombre de cada persona— y dice su estado', () => {
    pintar()
    fireEvent.change(screen.getByPlaceholderText(/nombre del invitado/i), { target: { value: 'zulema' } })
    expect(screen.getByText('Zulema Castro')).toBeInTheDocument()
    expect(screen.getByText(/invitación revocada/i)).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/nombre del invitado/i), { target: { value: 'lucia rojas' } })
    expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument()
  })

  it('elegir una invitación avisa hacia arriba con su id', () => {
    const onPick = vi.fn()
    pintar({ onPick })
    fireEvent.click(screen.getByRole('button', { name: /Ana Lucía Vega/ }))
    expect(onPick).toHaveBeenCalledWith('g2')
  })
})
