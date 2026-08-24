import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PeopleTable, type PersonRowView } from './PeopleTable'

vi.mock('../actions', () => ({
  updatePersonAction: vi.fn(async () => ({ status: 'success' })),
  removePersonAction: vi.fn(async () => ({ status: 'success' })),
}))

const filas: PersonRowView[] = [
  {
    id: 'p1',
    fullName: 'Ana Lucía Vega',
    groupLabel: 'Familia Rojas Peña',
    isCompanion: false,
    dietaryNote: 'Sin gluten',
    vip: true,
    attending: 'yes',
    tableLabel: 'Mesa 01',
  },
  {
    id: 'p2',
    fullName: 'Acompañante de Ana',
    groupLabel: 'Familia Rojas Peña',
    isCompanion: true,
    dietaryNote: null,
    vip: false,
    attending: 'maybe',
    tableLabel: 'Mesa 01',
  },
  {
    id: 'p3',
    fullName: 'Roberto Núñez',
    groupLabel: 'Roberto Núñez',
    isCompanion: false,
    dietaryNote: null,
    vip: false,
    attending: null,
    tableLabel: null,
  },
]

describe('PeopleTable', () => {
  it('enseña las columnas de la maqueta', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    for (const columna of ['Nombre', 'Grupo', 'RSVP', 'Acomp.', 'Restricciones', 'Mesa']) {
      expect(screen.getByRole('columnheader', { name: columna })).toBeInTheDocument()
    }
  })

  it('el estado se lee en texto, no solo por color', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    expect(screen.getByText('Confirmado')).toBeInTheDocument()
    expect(screen.getByText('Tal vez')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('filtra por «tal vez» y por VIP, que es lo que la maqueta añade', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)

    fireEvent.click(screen.getByRole('button', { name: /tal vez 1/i }))
    expect(screen.getByText('Acompañante de Ana')).toBeInTheDocument()
    expect(screen.queryByText('Roberto Núñez')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /vip 1/i }))
    expect(screen.getByText('Ana Lucía Vega')).toBeInTheDocument()
    expect(screen.queryByText('Acompañante de Ana')).not.toBeInTheDocument()
  })

  it('busca por nombre y por grupo', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'roberto' } })
    // Su nombre y el de su grupo son el mismo: aparece en dos celdas de la misma fila.
    expect(screen.getAllByText('Roberto Núñez')).toHaveLength(2)
    expect(screen.queryByText('Ana Lucía Vega')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'rojas' } })
    expect(screen.getByText('Ana Lucía Vega')).toBeInTheDocument()
  })

  it('quitar a una persona pide confirmación antes de borrarla', () => {
    // Borrar es inmediato y no hay deshacer: un clic de más se lleva a alguien de la
    // lista y nadie se entera hasta el día del evento.
    render(<PeopleTable eventSlug="boda" rows={filas} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar' })[0]!)

    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('sin mesa lo dice, en vez de dejar la celda muda', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    expect(screen.getAllByText('Sin mesa').length).toBeGreaterThan(0)
  })
})

describe('PeopleTable · piel de la maqueta', () => {
  const muchas: PersonRowView[] = Array.from({ length: 23 }, (_, i) => ({
    id: `x${i}`,
    fullName: `Invitado ${i}`,
    groupLabel: 'Grupo',
    isCompanion: false,
    dietaryNote: null,
    vip: false,
    attending: 'yes' as const,
    tableLabel: null,
  }))

  it('pagina de diez en diez, como la maqueta', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas} />)
    expect(screen.getByText('Invitado 0')).toBeInTheDocument()
    expect(screen.queryByText('Invitado 10')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(screen.getByText('Invitado 10')).toBeInTheDocument()
    expect(screen.queryByText('Invitado 0')).not.toBeInTheDocument()
  })

  it('al filtrar vuelve a la primera página: si no, la lista se ve vacía sin estarlo', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas} />)
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }))
    fireEvent.change(screen.getByLabelText('Buscar invitado o grupo'), { target: { value: 'Invitado 1' } })
    expect(screen.getByText('Invitado 1')).toBeInTheDocument()
  })

  it('con una sola página no pinta paginación', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas.slice(0, 4)} />)
    expect(screen.queryByRole('button', { name: 'Página 2' })).not.toBeInTheDocument()
  })
})
