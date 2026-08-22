import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AllowanceNotice } from './AllowanceNotice'

const pintar = (props: { maxGuestGroups: number | null; currentGroups: number }) =>
  render(<AllowanceNotice currentGroups={props.currentGroups} eventSlug="boda-rojas" maxGuestGroups={props.maxGuestGroups} />)

describe('AllowanceNotice', () => {
  it('con margen amplio no aparece ningún aviso', () => {
    // Avisar desde el primer grupo convierte el aviso en ruido, y el ruido se ignora
    // justo cuando deja de serlo.
    const { container } = pintar({ maxGuestGroups: 30, currentGroups: 10 })

    expect(container).toBeEmptyDOMElement()
  })

  it('justo por debajo del 80 % todavía no aparece', () => {
    const { container } = pintar({ maxGuestGroups: 30, currentGroups: 23 })

    expect(container).toBeEmptyDOMElement()
  })

  it('justo al 80 % aparece y dice cuántos quedan', () => {
    pintar({ maxGuestGroups: 30, currentGroups: 24 })

    expect(screen.getByRole('status')).toHaveTextContent(/6/)
  })

  it('al llegar al límite cambia de tono y ofrece solicitar el cambio', () => {
    pintar({ maxGuestGroups: 30, currentGroups: 30 })

    const aviso = screen.getByRole('alert')
    expect(aviso).toHaveTextContent(/no admite más grupos/i)
    expect(screen.getByRole('link', { name: /plan/i })).toHaveAttribute('href', '/panel/eventos/boda-rojas/plan')
  })

  it('pasado el límite sigue siendo el aviso de tope, no un número negativo', () => {
    // Un plan puede bajar de límite con el evento ya cargado.
    pintar({ maxGuestGroups: 30, currentGroups: 35 })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/-5/)).not.toBeInTheDocument()
  })

  it('sin límite no aparece nunca, ni con miles de grupos', () => {
    const { container } = pintar({ maxGuestGroups: null, currentGroups: 9999 })

    expect(container).toBeEmptyDOMElement()
  })
})
