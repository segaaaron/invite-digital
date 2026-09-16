import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EditPersonDialog } from './EditPersonDialog'

const updatePersonAction = vi.fn(async () => ({ status: 'success' as const }))
const setGroupPhoneAction = vi.fn(async () => ({ status: 'success' as const }))
const addPersonAction = vi.fn(async () => ({ status: 'success' as const }))
const reopenRsvpAction = vi.fn(async () => ({ status: 'success' as const }))
const replace = vi.fn()

vi.mock('@/app/_acciones/guests/actions', () => ({
  updatePersonAction: (...args: unknown[]) => updatePersonAction(...(args as [])),
  setGroupPhoneAction: (...args: unknown[]) => setGroupPhoneAction(...(args as [])),
  addPersonAction: (...args: unknown[]) => addPersonAction(...(args as [])),
  reopenRsvpAction: (...args: unknown[]) => reopenRsvpAction(...(args as [])),
  revokeInvitationAction: vi.fn(async () => ({ status: 'success' })),
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
  { id: 'g1', label: 'Familia Rojas Peña' },
  { id: 'g2', label: 'Padrinos' },
]

const invitacion = { id: 'g1', label: 'Familia Rojas Peña', revocada: false, respondida: true }

const props = { closeHref: '/panel/eventos/boda/invitados', eventSlug: 'boda', groups: grupos, person: persona, invitacion }

beforeEach(() => {
  updatePersonAction.mockClear()
  addPersonAction.mockClear()
  reopenRsvpAction.mockClear()
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
    expect(screen.getByLabelText('Invitación')).toHaveValue('g1')
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
    fireEvent.change(screen.getByLabelText('Invitación'), { target: { value: 'g2' } })
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

  it('principal o acompañante no se elige a mano: lo decide la invitación', () => {
    // Elegirlo dejaba invitaciones con dos principales o con ninguno.
    render(<EditPersonDialog {...props} />)
    expect(screen.queryByLabelText('Acompañante')).toBeNull()
  })

  it('añade un acompañante a su invitación con solo el nombre', async () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.change(screen.getByLabelText('Nombre del acompañante nuevo'), { target: { value: 'Carlos Nieto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir acompañante' }))

    await vi.waitFor(() =>
      expect(addPersonAction).toHaveBeenCalledWith({ eventSlug: 'boda', guestGroupId: 'g1', fullName: 'Carlos Nieto' }),
    )
  })

  it('si su invitación ya respondió, deja reabrir la confirmación', async () => {
    render(<EditPersonDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir confirmación' }))

    await vi.waitFor(() => expect(reopenRsvpAction).toHaveBeenCalledWith({ eventSlug: 'boda', id: 'g1' }))
  })

  it('sin respuesta no hay nada que reabrir', () => {
    render(<EditPersonDialog {...props} invitacion={{ ...invitacion, respondida: false }} />)
    expect(screen.queryByRole('button', { name: 'Reabrir confirmación' })).toBeNull()
  })

  it('se puede revocar su enlace, y una revocada lo dice en vez de ofrecerlo', () => {
    const { unmount } = render(<EditPersonDialog {...props} />)
    expect(screen.getByRole('button', { name: 'Revocar enlace' })).toBeInTheDocument()
    unmount()

    render(<EditPersonDialog {...props} invitacion={{ ...invitacion, revocada: true }} />)
    expect(screen.queryByRole('button', { name: 'Revocar enlace' })).toBeNull()
    expect(screen.getByText(/enlace revocado/i)).toBeInTheDocument()
  })
})
