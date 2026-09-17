import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ControlDeIngreso, type FilaDeIngreso } from './ControlDeIngreso'

const registrar = vi.hoisted(() => vi.fn(async () => ({})))
const deshacer = vi.hoisted(() => vi.fn(async () => ({ status: 'success' })))
vi.mock('@/app/_acciones/checkin/actions', () => ({ checkInByGroupAction: registrar, undoCheckInAction: deshacer }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

const fila = (over: Partial<FilaDeIngreso> & Pick<FilaDeIngreso, 'clave' | 'personaId' | 'nombre' | 'estado'>): FilaDeIngreso => ({ invitacion: 'Familia Rojas', invitacionId: 'fam', hora: null, mesa: 'Mesa 3', vip: false, ...over })
const filas = [
  fila({ clave: 'ana', personaId: 'ana', nombre: 'Ana Rojas', estado: 'dentro' as const, hora: '19:40', vip: true }),
  fila({ clave: 'luis', personaId: 'luis', nombre: 'Luis Rojas', estado: 'por_llegar' as const }),
  fila({ clave: 'sofi', personaId: 'sofi', nombre: 'Sofía Rojas', estado: 'por_llegar' as const }),
  fila({ clave: 'tio', invitacionId: 'tio', personaId: 'tio', nombre: 'Luis Peña', invitacion: 'Luis Peña', estado: 'no_viene' as const, mesa: null }),
]

const pinta = () => render(<ControlDeIngreso escanerHref="/puerta" eventId="e1" eventSlug="xv" filas={filas} recepcionHref="/equipo" />)
const personas = () => screen.getAllByRole('listitem').filter((l) => l.hasAttribute('aria-label')).map((l) => l.getAttribute('aria-label'))

beforeEach(() => vi.clearAllMocks())

describe('ControlDeIngreso', () => {
  it('arriba cuántos entraron de los esperados; la lista empieza por quien falta', () => {
    pinta()
    expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('1de 3 personas dentro')
    expect(personas()).toEqual(['Luis Rojas', 'Sofía Rojas'])
    expect(screen.getByRole('button', { name: 'Escanear QR' })).toBeInTheDocument()
  })

  it('buscar encuentra en todas las listas, y el VIP se ve', () => {
    pinta()
    fireEvent.change(screen.getByLabelText('Buscar invitado'), { target: { value: 'ana' } })
    const ana = screen.getByRole('listitem', { name: 'Ana Rojas' })
    expect(ana).toHaveTextContent('Entró 19:40')
    expect(within(ana).getByText('VIP')).toBeInTheDocument()
  })

  it('registrar el ingreso manda solo a esa persona de la invitación y la da por dentro', async () => {
    pinta()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar el ingreso de Luis Rojas' }))
    await waitFor(() => expect(registrar).toHaveBeenCalled())
    expect((registrar.mock.calls[0] as unknown as [{ groupId: string; personIds: string[] }])[0]).toMatchObject({ groupId: 'fam', personIds: ['luis'] })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('2de 3 personas dentro'))
  })

  it('la familia entra de un toque: los que faltan, en un solo registro', async () => {
    pinta()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar a los 2 de Familia Rojas' }))
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1))
    expect((registrar.mock.calls[0] as unknown as [{ personIds: string[] }])[0].personIds).toEqual(['luis', 'sofi'])
  })

  it('deshacer un ingreso pide confirmar y lo devuelve a por llegar', async () => {
    pinta()
    fireEvent.click(screen.getByRole('tab', { name: 'Dentro (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer el ingreso de Ana Rojas' }))
    expect(deshacer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))
    await waitFor(() => expect(deshacer).toHaveBeenCalledWith({ eventId: 'e1', eventSlug: 'xv', groupId: 'fam', personId: 'ana' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('0de 3 personas dentro'))
  })
})
