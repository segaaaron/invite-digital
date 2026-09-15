import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GuestMessage } from '../domain/inbox'
import { MessageCard } from './MessageCard'

const markReadAction = vi.fn(async () => ({ ok: true as const }))
const toggleFeaturedAction = vi.fn(async () => ({ ok: true as const }))
const replyAction = vi.fn(async () => ({ ok: true as const }))

vi.mock('@/app/_acciones/guestbook/actions', () => ({
  markReadAction: (...args: unknown[]) => markReadAction(...(args as [])),
  toggleFeaturedAction: (...args: unknown[]) => toggleFeaturedAction(...(args as [])),
  replyAction: (...args: unknown[]) => replyAction(...(args as [])),
}))

const mensaje = (over: Partial<GuestMessage> = {}): GuestMessage => ({
  responseId: 'r1',
  guestGroupId: 'g1',
  groupLabel: 'Familia Rojas',
  responderName: null,
  body: 'Qué ganas de celebrar con ustedes.',
  writtenAt: new Date('2026-08-20T15:30:00.000Z'),
  readAt: null,
  featuredAt: null,
  reply: null,
  repliedAt: null,
  ...over,
})

const props = { eventId: 'e1', eventSlug: 'boda' }

beforeEach(() => {
  markReadAction.mockClear()
  toggleFeaturedAction.mockClear()
  replyAction.mockClear()
})

describe('MessageCard', () => {
  it('muestra el autor, el texto y la hora', () => {
    render(<MessageCard {...props} message={mensaje()} />)

    expect(screen.getByText('Familia Rojas')).toBeInTheDocument()
    expect(screen.getByText('Qué ganas de celebrar con ustedes.')).toBeInTheDocument()
    expect(screen.getByText(/20 de agosto|20 ago/i)).toBeInTheDocument()
  })

  it('el sin leer se distingue por TEXTO, no solo por color', () => {
    // Quien no distingue el borde dorado del gris tiene que poder saberlo igual.
    render(<MessageCard {...props} message={mensaje()} />)
    expect(screen.getByText('Sin leer')).toBeInTheDocument()
  })

  it('el leído no lleva la marca de sin leer ni el botón de marcarlo', () => {
    render(<MessageCard {...props} message={mensaje({ readAt: new Date('2026-08-21T09:00:00.000Z') })} />)

    expect(screen.queryByText('Sin leer')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar leído' })).not.toBeInTheDocument()
  })

  it('marcar leído llama a la acción con el mensaje y su evento', async () => {
    render(<MessageCard {...props} message={mensaje()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar leído' }))
    await waitFor(() =>
      expect(markReadAction).toHaveBeenCalledWith({ responseId: 'r1', eventId: 'e1', eventSlug: 'boda' }),
    )
  })

  it('destacar cambia el estado del botón y lo anuncia', () => {
    const { rerender } = render(<MessageCard {...props} message={mensaje()} />)
    expect(screen.getByRole('button', { name: 'Destacar' })).toHaveAttribute('aria-pressed', 'false')

    rerender(<MessageCard {...props} message={mensaje({ featuredAt: new Date('2026-08-21T09:00:00.000Z') })} />)
    expect(screen.getByRole('button', { name: 'Quitar destacado' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('destacar llama a la acción', async () => {
    render(<MessageCard {...props} message={mensaje()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Destacar' }))
    await waitFor(() =>
      expect(toggleFeaturedAction).toHaveBeenCalledWith({ responseId: 'r1', eventId: 'e1', eventSlug: 'boda' }),
    )
  })

  it('la respuesta aparece bajo el mensaje', () => {
    render(
      <MessageCard
        {...props}
        message={mensaje({ reply: 'Gracias, nos vemos.', repliedAt: new Date('2026-08-21T10:00:00.000Z') })}
      />,
    )

    expect(screen.getByText('Gracias, nos vemos.')).toBeInTheDocument()
  })

  it('sin respuesta no aparece ningún hueco de respuesta', () => {
    render(<MessageCard {...props} message={mensaje()} />)
    expect(screen.queryByText('Tu respuesta')).not.toBeInTheDocument()
  })

  it('el formulario de respuesta no envía vacío', async () => {
    render(<MessageCard {...props} message={mensaje()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Responder' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/vacía/i))
    expect(replyAction).not.toHaveBeenCalled()
  })

  it('el formulario tampoco envía solo espacios', async () => {
    render(<MessageCard {...props} message={mensaje()} />)

    fireEvent.change(screen.getByLabelText('Responder a Familia Rojas'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(replyAction).not.toHaveBeenCalled()
  })

  it('responder envía el texto escrito', async () => {
    render(<MessageCard {...props} message={mensaje()} />)

    fireEvent.change(screen.getByLabelText('Responder a Familia Rojas'), { target: { value: '¡Gracias!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }))

    await waitFor(() =>
      expect(replyAction).toHaveBeenCalledWith({
        responseId: 'r1',
        eventId: 'e1',
        eventSlug: 'boda',
        text: '¡Gracias!',
      }),
    )
  })

  it('un rechazo del servidor se muestra en pantalla', async () => {
    replyAction.mockResolvedValueOnce({ ok: false, kind: 'invalid_reply', message: 'Se pasó de mil' } as never)
    render(<MessageCard {...props} message={mensaje()} />)

    fireEvent.change(screen.getByLabelText('Responder a Familia Rojas'), { target: { value: 'hola' } })
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Se pasó de mil'))
  })
})
