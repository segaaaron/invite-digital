import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BillingToggle } from './BillingToggle'
import { hasAnnual } from './PlanCard'

describe('hasAnnual', () => {
  it('dice si el plan tiene precio anual, sin prometer ningún ahorro', () => {
    // El «ahorra 17 %» de la maqueta comparaba el precio por evento × 12 con el anual:
    // solo sería cierto para quien celebre doce bodas al año. Un cartel que promete un
    // ahorro que nadie va a tener es publicidad engañosa, así que no se pinta.
    expect(hasAnnual({ cents: 690_00, annualCents: 4_900_00, currency: 'BOB' })).toBe(true)
    expect(hasAnnual({ cents: 690_00, annualCents: null, currency: 'BOB' })).toBe(false)
  })
})

const tarjeta = (slug: string, cents: number, annualCents: number | null) => ({
  id: slug,
  name: 'Firma 3D', current: false,
  allowance: { planSlug: slug, maxGuestGroups: 30, seating: true, registry: true, checkin: true, maxDoorPorters: 3, maxCohosts: 1, maxHiredPlanners: 0, maxGalleryPhotos: 20, guestPhotos: true, eventPassword: true, csvImport: true, onlineDays: 180, designChange: 'antes_de_repartir' as const, plannerSuite: 'completo' as const },
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

    const anual = screen.getByRole('button', { name: /^anual$/i })
    expect(screen.getByRole('button', { name: /por evento/i })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(anual)
    expect(anual).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/al año/i)).toBeInTheDocument()
  })
})
