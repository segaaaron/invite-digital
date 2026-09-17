import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LibroDeFirmas } from './LibroDeFirmas'

const responder = vi.hoisted(() => vi.fn(async () => ({ ok: true })))
vi.mock('@/app/_acciones/guestbook/actions', () => ({ replyAction: responder }))

const firma = (over: object) => ({
  responseId: 'r1',
  guestGroupId: 'g1',
  groupLabel: 'Familia Rojas Peña',
  responderName: 'Ana Rojas',
  body: 'Qué ganas de celebrar con ustedes.',
  writtenAt: new Date('2026-09-10T12:00:00Z'),
  readAt: null,
  featuredAt: null,
  reply: null,
  repliedAt: null,
  ...over,
})

describe('LibroDeFirmas', () => {
  it('cada firma con sus palabras y quién la dejó, sin leído ni destacado', () => {
    render(<LibroDeFirmas eventId="e1" eventSlug="xv" messages={[firma({})]} />)
    expect(screen.getByText('Qué ganas de celebrar con ustedes.')).toBeInTheDocument()
    expect(screen.getByText('Ana Rojas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /leído|destacar/i })).toBeNull()
    expect(screen.queryByText(/sin leer/i)).toBeNull()
  })

  it('agradecer guarda la respuesta que el invitado verá', async () => {
    render(<LibroDeFirmas eventId="e1" eventSlug="xv" messages={[firma({})]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agradecer' }))
    fireEvent.change(screen.getByLabelText('Agradecer a Ana Rojas'), { target: { value: 'Gracias, te esperamos.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(responder).toHaveBeenCalledWith({ responseId: 'r1', eventId: 'e1', eventSlug: 'xv', text: 'Gracias, te esperamos.' }))
  })

  it('sin firmas, lo explica con elegancia', () => {
    render(<LibroDeFirmas eventId="e1" eventSlug="xv" messages={[]} />)
    expect(screen.getByText('Tu libro de firmas espera sus primeras palabras')).toBeInTheDocument()
  })
})
