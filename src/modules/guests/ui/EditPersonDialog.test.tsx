import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EditPersonDialog } from './EditPersonDialog'

const updatePersonAction = vi.fn(async () => ({ status: 'success' as const }))
const setGroupPhoneAction = vi.fn(async () => ({ status: 'success' as const }))
const replace = vi.fn()

vi.mock('../actions', () => ({
  updatePersonAction: (...args: unknown[]) => updatePersonAction(...(args as [])),
  setGroupPhoneAction: (...args: unknown[]) => setGroupPhoneAction(...(args as [])),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

const persona = {
  id: 'p1',
  fullName: 'Ana Lucía Vega',
  groupId: 'g1',
  isCompanion: false,
  dietaryNote: 'Sin gluten',
  vip: true,
  attending: 'yes' as const,
  email: 'ana@ejemplo.com',
  phone: '+59170011122',
}

const grupos = [
  { id: 'g1', label: 'Familia Rojas Peña', free: 2 },
  { id: 'g2', label: 'Padrinos', free: 1 },
]

const props = { closeHref: '/panel/eventos/boda/invitados', eventSlug: 'boda', groups: grupos, person: persona }

beforeEach(() => {
  updatePersonAction.mockClear()
  setGroupPhoneAction.mockClear()
  replace.mockClear()
  // jsdom no implementa `showModal`. El doble hace lo único que estas pruebas necesitan
  // de él: marcar el diálogo como abierto, que es lo que expone su contenido al árbol de
  // accesibilidad. Fingirlo con un `vi.fn()` vacío dejaba el diálogo cerrado y sin nada
  // dentro que consultar.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})

describe('EditPersonDialog', () => {
  it('abre relleno con lo que la persona ya tiene', () => {
    render(<EditPersonDialog {...props} />)

    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Lucía Vega')
    expect(screen.getByLabelText('Grupo')).toHaveValue('g1')
    expect(screen.getByLabelText('RSVP')).toHaveValue('yes')
    expect(screen.getByLabelText('Restricciones')).toHaveValue('Sin gluten')
    expect(screen.getByLabelText('Email')).toHaveValue('ana@ejemplo.com')
    expect(screen.getByLabelText('Invitado VIP')).toBeChecked()
  })

  it('guardar manda lo editado, y solo eso', () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Lucía Vega Rojas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updatePersonAction).toHaveBeenCalledWith({
      eventSlug: 'boda',
      id: 'p1',
      fullName: 'Ana Lucía Vega Rojas',
      guestGroupId: 'g1',
      isCompanion: false,
      attending: 'yes',
      dietaryNote: 'Sin gluten',
      email: 'ana@ejemplo.com',
      vip: true,
    })
  })

  it('un campo vaciado se guarda como nulo, no como cadena en blanco', () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Restricciones'), { target: { value: '  ' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updatePersonAction).toHaveBeenCalledWith(expect.objectContaining({ dietaryNote: null, email: null }))
  })

  it('mover de grupo va en la misma edición', () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: 'g2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updatePersonAction).toHaveBeenCalledWith(expect.objectContaining({ guestGroupId: 'g2' }))
  })

  it('sin tocar el teléfono no se reescribe el del grupo', async () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(updatePersonAction).toHaveBeenCalled())
    expect(setGroupPhoneAction).not.toHaveBeenCalled()
  })

  it('cambiar el teléfono lo guarda en el grupo, que es de quien es', async () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.change(screen.getByLabelText('WhatsApp / Teléfono'), { target: { value: '+59171122333' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() =>
      expect(setGroupPhoneAction).toHaveBeenCalledWith({ eventSlug: 'boda', id: 'g1', phone: '+59171122333' }),
    )
  })

  it('el error del servidor se pinta: sin él, el atelier cree que guardó', async () => {
    updatePersonAction.mockResolvedValueOnce({ status: 'error', message: 'El grupo está lleno' } as never)
    render(<EditPersonDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El grupo está lleno')
  })

  it('cancelar no manda nada', () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(updatePersonAction).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/panel/eventos/boda/invitados')
  })
})
