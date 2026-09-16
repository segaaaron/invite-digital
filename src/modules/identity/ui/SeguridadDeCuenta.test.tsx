import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SesionesAbiertas } from './SeguridadDeCuenta'

vi.mock('@/app/_acciones/identity/actions', () => ({
  changePasswordWithCodeAction: vi.fn(),
  closeOtherSessionsAction: vi.fn(),
  requestAccountCodeAction: vi.fn(),
}))

const sesion = (i: number) => ({ id: `s${i}`, dispositivo: `iPhone · Safari ${i}`, ultimoUso: '16 de septiembre · 19:30', esta: i === 0 })

describe('SesionesAbiertas', () => {
  it('marca la de este dispositivo y cierra las demás con el código del correo', () => {
    render(<SesionesAbiertas sesiones={[sesion(0), sesion(1)]} />)
    expect(screen.getByText('Este dispositivo')).toBeInTheDocument()
    expect(screen.getByLabelText('Código del correo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar las demás sesiones' })).toBeInTheDocument()
  })

  it('con muchas, enseña las recientes y resume el resto', () => {
    render(<SesionesAbiertas sesiones={Array.from({ length: 12 }, (_, i) => sesion(i))} />)
    expect(screen.getAllByText(/iPhone · Safari/)).toHaveLength(5)
    expect(screen.getByText('y 7 sesiones más, de antes')).toBeInTheDocument()
  })

  it('sola la propia, no ofrece cerrar nada', () => {
    render(<SesionesAbiertas sesiones={[sesion(0)]} />)
    expect(screen.queryByRole('button', { name: 'Cerrar las demás sesiones' })).not.toBeInTheDocument()
  })
})
