import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListaDeLlegadas } from './ListaDeLlegadas'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const filas = [
  { clave: 'ana', nombre: 'Ana Rojas', invitacion: 'Familia Rojas', estado: 'dentro' as const, hora: '19:40' },
  { clave: 'luis', nombre: 'Luis Rojas', invitacion: 'Familia Rojas', estado: 'por_llegar' as const, hora: null },
  { clave: 'tio', nombre: 'Luis Peña', invitacion: 'Luis Peña', estado: 'no_viene' as const, hora: null },
]

describe('ListaDeLlegadas', () => {
  it('cada persona con su estado en palabras, y la hora de quien entró', () => {
    render(<ListaDeLlegadas filas={filas} />)
    expect(screen.getByRole('listitem', { name: 'Ana Rojas' })).toHaveTextContent('Entró 19:40')
    expect(screen.getByRole('listitem', { name: 'Luis Rojas' })).toHaveTextContent('Por llegar')
    // Su invitación es la suya: no se repite el nombre.
    expect(within(screen.getByRole('listitem', { name: 'Luis Peña' })).queryByText('Luis Peña', { selector: 'span.text-ink-mute' })).toBeNull()
  })

  it('filtra por estado y busca por nombre o invitación', () => {
    render(<ListaDeLlegadas filas={filas} />)
    fireEvent.click(screen.getByRole('button', { name: 'Por llegar 1' }))
    expect(screen.getAllByRole('listitem').map((l) => l.getAttribute('aria-label'))).toEqual(['Luis Rojas'])
    fireEvent.click(screen.getByRole('button', { name: 'Todos 3' }))
    fireEvent.change(screen.getByLabelText('Buscar invitado'), { target: { value: 'rojas' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
