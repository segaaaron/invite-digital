import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { RsvpPareja } from './RsvpPareja'

const respondByPersonAction = vi.fn()
vi.mock('@/app/_acciones/rsvp/actions', () => ({ respondByPersonAction: (...args: unknown[]) => respondByPersonAction(...args) }))

const invitation = getDictionary('es').invitation

const pinta = () => render(<RsvpPareja confirmarHref="/i/tok/confirmar" dictionary={invitation} paseHref="/i/tok/pase" token="tok" />)

describe('RsvpPareja', () => {
  it('al confirmar que vienen, entrega el pase y dice que se confirma una sola vez', async () => {
    respondByPersonAction.mockResolvedValue({ status: 'success', attending: 2, responderName: 'Ana' })
    pinta()
    fireEvent.click(screen.getByRole('button', { name: invitation.bothComing }))

    expect(await screen.findByRole('link', { name: invitation.passOpen })).toHaveAttribute('href', '/i/tok/pase')
    expect(screen.getByText(invitation.confirmedLocked)).toBeInTheDocument()
  })

  it('si no vienen, no hay pase', async () => {
    respondByPersonAction.mockResolvedValue({ status: 'success', attending: 0, responderName: null })
    pinta()
    fireEvent.click(screen.getByRole('button', { name: invitation.goingNoShort }))

    expect(await screen.findByText(invitation.confirmedLocked)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: invitation.passOpen })).not.toBeInTheDocument()
  })
})
