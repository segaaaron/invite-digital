import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ControlDeIngreso } from './ControlDeIngreso'

const registrar = vi.hoisted(() => vi.fn(async () => ({})))
vi.mock('@/app/_acciones/checkin/actions', () => ({ checkInByGroupAction: registrar }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

const filas = [
  { clave: 'ana', invitacionId: 'fam', personaId: 'ana', nombre: 'Ana Rojas', invitacion: 'Familia Rojas', estado: 'dentro' as const, hora: '19:40', mesa: 'Mesa 3' },
  { clave: 'luis', invitacionId: 'fam', personaId: 'luis', nombre: 'Luis Rojas', invitacion: 'Familia Rojas', estado: 'por_llegar' as const, hora: null, mesa: 'Mesa 3' },
  { clave: 'tio', invitacionId: 'tio', personaId: 'tio', nombre: 'Luis Peña', invitacion: 'Luis Peña', estado: 'no_viene' as const, hora: null, mesa: null },
]

const pinta = () => render(<ControlDeIngreso escanerHref="/puerta" eventId="e1" eventSlug="xv" filas={filas} recepcionHref="/equipo" />)

beforeEach(() => vi.clearAllMocks())

describe('ControlDeIngreso', () => {
  it('arriba cuántos entraron de los esperados; la lista empieza por quien falta', () => {
    pinta()
    expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('1de 2 personas dentro')
    const lista = screen.getByRole('region', { name: 'Invitados' })
    expect(within(lista).getAllByRole('listitem').map((l) => l.getAttribute('aria-label'))).toEqual(['Luis Rojas'])
    expect(screen.getByRole('button', { name: 'Escanear QR' })).toBeInTheDocument()
  })

  it('buscar encuentra en todas las listas', () => {
    pinta()
    fireEvent.change(screen.getByLabelText('Buscar invitado'), { target: { value: 'rojas' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('listitem', { name: 'Ana Rojas' })).toHaveTextContent('Entró 19:40')
  })

  it('registrar el ingreso manda solo a esa persona de la invitación y la da por dentro', async () => {
    pinta()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar el ingreso de Luis Rojas' }))
    await waitFor(() => expect(registrar).toHaveBeenCalled())
    expect((registrar.mock.calls[0] as unknown as [{ groupId: string; personIds: string[] }])[0]).toMatchObject({ groupId: 'fam', personIds: ['luis'] })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('2de 2 personas dentro'))
  })
})
