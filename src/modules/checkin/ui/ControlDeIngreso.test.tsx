import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ControlDeIngreso, type FilaDeIngreso } from './ControlDeIngreso'

const registrar = vi.hoisted(() => vi.fn(async (): Promise<Record<string, unknown>> => ({ kind: 'welcome' })))
const deshacer = vi.hoisted(() => vi.fn(async () => ({ status: 'success' })))
vi.mock('@/app/_acciones/checkin/actions', () => ({ checkInByGroupAction: registrar, undoCheckInAction: deshacer }))
const refrescar = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar, push: vi.fn() }) }))

const fila = (over: Partial<FilaDeIngreso> & Pick<FilaDeIngreso, 'clave' | 'personaId' | 'nombre' | 'estado'>): FilaDeIngreso => ({ invitacion: 'Familia Rojas', invitacionId: 'fam', hora: null, mesa: 'Mesa 3', vip: false, codigo: 'K7P3X', ...over })
const filas = [
  fila({ clave: 'ana', personaId: 'ana', nombre: 'Ana Rojas', estado: 'dentro' as const, hora: '19:40', vip: true }),
  fila({ clave: 'luis', personaId: 'luis', nombre: 'Luis Rojas', estado: 'por_llegar' as const }),
  fila({ clave: 'sofi', personaId: 'sofi', nombre: 'Sofía Rojas', estado: 'por_llegar' as const }),
  fila({ clave: 'tio', invitacionId: 'tio', personaId: 'tio', nombre: 'Luis Peña', invitacion: 'Luis Peña', estado: 'no_viene' as const, mesa: null, codigo: 'TPENA' }),
]

const pinta = () => render(<ControlDeIngreso escanerHref="/puerta" eventId="e1" eventSlug="xv" filas={filas} recepcion={{ gestionarHref: '/equipo', personas: [{ id: 'p1', nombre: 'Carla Mena', puerta: 'Puerta norte', registradas: 4 }] }} />)
const personas = () => within(screen.getByRole('table', { name: 'Ingresos' })).getAllByRole('row').filter((l) => l.hasAttribute('aria-label')).map((l) => l.getAttribute('aria-label'))
/** Una invitación de varias personas nace plegada: se despliega para llegar a cada persona. */
const desplegar = () => fireEvent.click(screen.getByRole('button', { expanded: false }))

beforeEach(() => vi.clearAllMocks())

describe('ControlDeIngreso', () => {
  it('arriba cuántos entraron de los esperados; la lista empieza por quien falta', () => {
    pinta()
    expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('1de 3 personas dentro')
    // Plegada, la familia es una línea: su nombre, cuántos son y cómo va.
    expect(personas()).toEqual([])
    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Familia Rojas')
    expect(screen.getByText('3 personas')).toBeInTheDocument()
    desplegar()
    expect(personas()).toEqual(['Luis Rojas', 'Sofía Rojas'])
    expect(screen.getByRole('button', { name: 'Escanear QR' })).toBeInTheDocument()
  })

  it('la recepción se ve: quién tiene acceso y cuántos registró, y dónde sumar más', () => {
    pinta()
    const recepcion = screen.getByRole('region', { name: 'Recepción' })
    expect(recepcion).toHaveTextContent('Carla Mena')
    expect(recepcion).toHaveTextContent('Puerta norte · 4 ingresos registrados')
    expect(within(recepcion).getByRole('link', { name: 'Sumar o quitar personal' })).toHaveAttribute('href', '/equipo')
  })

  it('buscar encuentra en todas las listas, y el VIP se ve', () => {
    pinta()
    fireEvent.change(screen.getByLabelText('Buscar invitado'), { target: { value: 'ana' } })
    const ana = screen.getByRole('row', { name: 'Ana Rojas' })
    expect(ana).toHaveTextContent('Entró 19:40')
    expect(within(ana).getByText('VIP')).toBeInTheDocument()
  })

  it('se entra con el código del pase: muestra la familia, deja elegir quién entra y registra', async () => {
    pinta()
    fireEvent.change(screen.getByLabelText('Código del pase'), { target: { value: 'k7p-3x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    const hallazgo = screen.getByRole('status')
    expect(hallazgo).toHaveTextContent('Familia Rojas')
    expect(hallazgo).toHaveTextContent('Entró 19:40')
    const sofia = within(hallazgo).getByRole('checkbox', { name: 'Sofía Rojas' })
    fireEvent.click(sofia)
    expect(sofia).not.toBeChecked()
    fireEvent.click(within(hallazgo).getByRole('button', { name: 'Registrar ingreso' }))
    await waitFor(() => expect(registrar).toHaveBeenCalled())
    expect((registrar.mock.calls[0] as unknown as [{ groupId: string; personIds: string[] }])[0]).toMatchObject({ groupId: 'fam', personIds: ['luis'] })
  })

  it('un código que no es del evento lo dice', () => {
    pinta()
    fireEvent.change(screen.getByLabelText('Código del pase'), { target: { value: 'ZZZZZ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('no es de este evento')
  })

  it('sin pase es el último recurso: pide confirmar y registra solo a esa persona', async () => {
    pinta()
    desplegar()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sin pase a Luis Rojas' }))
    expect(registrar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    await waitFor(() => expect(registrar).toHaveBeenCalled())
    expect((registrar.mock.calls[0] as unknown as [{ groupId: string; personIds: string[] }])[0]).toMatchObject({ groupId: 'fam', personIds: ['luis'] })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('2de 3 personas dentro'))
  })

  it('la familia sin pase entra de un toque: los que faltan, en un solo registro', async () => {
    pinta()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sin pase a los 2 de Familia Rojas' }))
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1))
    expect((registrar.mock.calls[0] as unknown as [{ personIds: string[] }])[0].personIds).toEqual(['luis', 'sofi'])
  })

  it('deshacer un ingreso pide confirmar y lo devuelve a por llegar', async () => {
    pinta()
    fireEvent.click(screen.getByRole('tab', { name: 'Dentro 1' }))
    desplegar()
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer el ingreso de Ana Rojas' }))
    expect(deshacer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    await waitFor(() => expect(deshacer).toHaveBeenCalledWith({ eventId: 'e1', eventSlug: 'xv', groupId: 'fam', personId: 'ana' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Cómo va el ingreso' })).toHaveTextContent('0de 3 personas dentro'))
  })
})

/** Nada se refresca solo: quien mira decide cuándo traer lo que registró la recepción. */
describe('ControlDeIngreso · actualizar', () => {
  it('el botón trae lo del servidor, y sin él no se recarga nada', () => {
    vi.useFakeTimers()
    pinta()
    vi.advanceTimersByTime(120_000)
    expect(refrescar).not.toHaveBeenCalled()
    vi.useRealTimers()

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(refrescar).toHaveBeenCalled()
  })
})

/** La verdad la tiene el servidor: si otra puerta ya lo registró, lo dice y la pantalla lo repite. */
describe('ControlDeIngreso · alguien ya lo registró', () => {
  it('lo dice con su hora, en vez de fingir que acaba de entrar', async () => {
    registrar.mockResolvedValueOnce({ kind: 'already', arrivedAt: new Date('2026-10-18T23:40:00Z'), arrivedCount: 3 })
    pinta()
    desplegar()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sin pase a Luis Rojas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Luis Rojas ya estaba dentro desde las 19:40'))
  })
})
