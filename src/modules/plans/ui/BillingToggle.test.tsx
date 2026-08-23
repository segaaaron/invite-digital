import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BillingToggle } from './BillingToggle'
import { annualSaving } from './PlanCard'

describe('annualSaving', () => {
  it('calcula el ahorro real desde los dos precios, no un número fijo', () => {
    // La maqueta dice «AHORRA 17 %». Ese número tiene que salir de los precios de verdad:
    // si mañana cambia uno, el cartel no puede seguir prometiendo lo mismo.
    expect(annualSaving({ cents: 100_00, annualCents: 1000_00, currency: 'BOB' })).toBe(17)
  })

  it('sin precio anual no hay ahorro que anunciar', () => {
    expect(annualSaving({ cents: 100_00, annualCents: null, currency: 'BOB' })).toBeNull()
  })

  it('si el anual no ahorra nada, no se anuncia un ahorro', () => {
    expect(annualSaving({ cents: 100_00, annualCents: 1200_00, currency: 'BOB' })).toBeNull()
  })
})

const tarjeta = (slug: string, cents: number, annualCents: number | null) => ({
  id: slug,
  current: false,
  allowance: { planSlug: slug, maxGuestGroups: 30, seating: true, registry: true, checkin: true },
  price: { cents, annualCents, currency: 'BOB' },
})

describe('BillingToggle', () => {
  it('sin precio anual no pinta conmutador: nadie vende esa suscripción', () => {
    // Un conmutador de suscripción sin precios detrás haría esperar una factura mensual
    // que no existe: los planes se cobran una vez por evento.
    render(<BillingToggle plans={[tarjeta('atelier', 690_00, null)]} />)

    expect(screen.queryByRole('button', { name: /anual/i })).toBeNull()
    expect(screen.getByText(/por evento/i)).toBeInTheDocument()
  })

  it('con precio anual conmuta, y el ahorro sale de los dos precios', () => {
    render(<BillingToggle plans={[tarjeta('firma-3d', 100_00, 1000_00)]} />)

    const anual = screen.getByRole('button', { name: /anual · ahorra 17/i })
    expect(screen.getByRole('button', { name: /por evento/i })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(anual)
    expect(anual).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/al año/i)).toBeInTheDocument()
  })
})
