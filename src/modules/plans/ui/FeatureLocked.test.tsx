import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeatureLocked } from './FeatureLocked'

describe('FeatureLocked', () => {
  it('dice qué plan sí trae la función', () => {
    render(
      <FeatureLocked
        eventSlug="boda-rojas"
        reason="El plan atelier no incluye la mesa de regalos; lo trae el plan firma-3d."
        title="Regalos"
      />,
    )

    expect(screen.getByText(/firma-3d/)).toBeInTheDocument()
  })

  it('lleva a los planes del evento, no a una pantalla sin salida', () => {
    render(<FeatureLocked eventSlug="boda-rojas" reason="El plan atelier no incluye el modo puerta." title="Modo puerta" />)

    expect(screen.getByRole('link', { name: /ver planes/i })).toHaveAttribute('href', '/panel/eventos/boda-rojas/plan')
  })
})
