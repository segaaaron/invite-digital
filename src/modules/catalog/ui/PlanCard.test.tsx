import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import type { Plan } from '../domain/plan'
import { PlanCard } from './PlanCard'

const dictionary = es

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

describe('PlanCard contra la maqueta', () => {
  it('el plan destacado se pinta en oscuro, no solo con un borde dorado', () => {
    // En la maqueta el plan más elegido es una tarjeta negra elevada: es lo que separa
    // «recomendado» de «uno más de la fila». Un borde dorado no se ve a un metro.
    const { container } = render(
      <PlanCard
        ctaHref="#contacto"
        dictionary={dictionary}
        locale="es"
        plan={{ ...plan, highlighted: true }}
      />,
    )

    expect(container.querySelector('article')?.className).toContain('bg-ink')
  })

  it('el nombre del plan es el encabezado grande, no un rótulo pequeño', () => {
    render(<PlanCard ctaHref="#contacto" dictionary={dictionary} locale="es" plan={plan} />)

    const encabezado = screen.getByRole('heading', { level: 3 })
    expect(encabezado.className).toContain('font-display')
  })
})

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
