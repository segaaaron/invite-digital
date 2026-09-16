import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestDialog } from './GuestDialog'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }))
vi.mock('@/app/_acciones/guests/actions', () => ({ addGuestAction: vi.fn(async () => ({ status: 'idle', message: '' })) }))

beforeEach(() => {
  push.mockClear()
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })
})

const props = {
  eventId: 'e1',
  eventSlug: 'boda',
  closeHref: '/panel/eventos/boda/invitados',
  groups: [{ id: 'g1', label: 'Familia Rojas', free: 2 }],
}

describe('GuestDialog', () => {
  it('trae los campos de la maqueta', () => {
    render(<GuestDialog {...props} />)

    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByLabelText(/Invitación propia/)).toBeInTheDocument()
    expect(screen.getByLabelText('Acompañantes')).toBeInTheDocument()
    expect(screen.getByLabelText('RSVP')).toBeInTheDocument()
    expect(screen.getByLabelText('Restricciones')).toBeInTheDocument()
    expect(screen.getByLabelText('WhatsApp / Teléfono')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText(/Invitado VIP/)).toBeInTheDocument()
  })

  it('se abre como modal: el fondo queda inerte', () => {
    render(<GuestDialog {...props} />)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it('empieza en «invitación propia»: dar de alta a alguien no exige elegir el grupo de otro', () => {
    render(<GuestDialog {...props} />)

    // El desplegable de grupos ya creados no se ve hasta que se pide sumarse a uno, y el
    // nombre de la invitación es opcional: sin escribirlo se llama como el invitado.
    expect(screen.queryByLabelText('A qué invitación se suma')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombre de la invitación')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Se suma a una invitación ya creada/))
    expect(screen.getByLabelText('A qué invitación se suma')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre de la invitación')).not.toBeInTheDocument()
  })

  it('sin invitaciones creadas no ofrece sumarse a ninguna', () => {
    render(<GuestDialog {...props} groups={[]} />)
    expect(screen.queryByLabelText(/Se suma a una invitación ya creada/)).not.toBeInTheDocument()
  })

  it('con el tope del plan alcanzado empieza por sumarse a una que ya existe', () => {
    // Crear otra no lo permite el servidor: arrancar ahí sería ofrecer lo único imposible.
    render(<GuestDialog {...props} atLimit />)
    expect(screen.getByLabelText('A qué invitación se suma')).toBeInTheDocument()
  })

  it('cancelar cierra el diálogo y vuelve a la lista', () => {
    render(<GuestDialog {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Cerrar **y** navegar: solo navegar deja el modal encima de la lista, y con él la
    // página bloqueada hasta que Next termina la transición.
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/panel/eventos/boda/invitados')
  })
})

describe('GuestDialog · cerrar con Escape', () => {
  it('Escape cierra el diálogo **y** quita el parámetro de la dirección', () => {
    render(<GuestDialog {...props} />)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))

    // Sin esto, la dirección se queda en `?panel=alta` y el botón «+ Añadir invitado»
    // deja de navegar: no pasa nada al pulsarlo hasta que se recarga a mano.
    expect(push).toHaveBeenCalledWith('/panel/eventos/boda/invitados')
  })
})
