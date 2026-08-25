import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuestDialog } from './GuestDialog'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }) }))
vi.mock('../actions', () => ({ addGuestAction: vi.fn(async () => ({ status: 'idle', message: '' })) }))

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
  it('trae los nueve campos de la maqueta', () => {
    render(<GuestDialog {...props} />)

    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByLabelText('Grupo')).toBeInTheDocument()
    expect(screen.getByLabelText('Acompañantes')).toBeInTheDocument()
    expect(screen.getByLabelText('RSVP')).toBeInTheDocument()
    expect(screen.getByLabelText('Restricciones')).toBeInTheDocument()
    expect(screen.getByLabelText('WhatsApp / Teléfono')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Invitado VIP')).toBeInTheDocument()
  })

  it('se abre como modal: el fondo queda inerte', () => {
    render(<GuestDialog {...props} />)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it('el nombre del grupo nuevo solo aparece al elegir «Grupo nuevo…»', () => {
    render(<GuestDialog {...props} />)
    expect(screen.queryByLabelText('Nombre del grupo nuevo')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: '' } })
    expect(screen.getByLabelText('Nombre del grupo nuevo')).toBeInTheDocument()
  })

  it('sin grupos creados arranca en «grupo nuevo», que es lo único posible', () => {
    render(<GuestDialog {...props} groups={[]} />)
    expect(screen.getByLabelText('Nombre del grupo nuevo')).toBeInTheDocument()
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
