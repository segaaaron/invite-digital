import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import type { Plan } from '../domain/plan'
import { PlanCard } from './PlanCard'

const plan: Plan = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'firma-3d',
  price: { cents: 145000, currency: 'BOB' },
  highlighted: true,
  sortOrder: 2,
  name: 'Firma 3D',
  tagline: 'La experiencia completa',
  description: 'Unboxing 3D completo.',
  features: ['Todo lo de Atelier', 'Dominio propio 12 meses'],
}

describe('PlanCard', () => {
  it('muestra el precio formateado en bolivianos', () => {
    render(<PlanCard plan={plan} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.getByText('Bs 1.450')).toBeDefined()
  })

  it('muestra la insignia solo cuando el plan está destacado', () => {
    const { rerender } = render(<PlanCard plan={plan} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.getByText(es.pricing.mostChosen)).toBeDefined()

    rerender(<PlanCard plan={{ ...plan, highlighted: false }} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.queryByText(es.pricing.mostChosen)).toBeNull()
  })

  it('lista todas las características', () => {
    render(<PlanCard plan={plan} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(plan.features.length)
  })
})
