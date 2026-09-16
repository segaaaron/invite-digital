import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeatureLocked } from './FeatureLocked'

describe('FeatureLocked', () => {
  it('dice qué plan sí trae la función', () => {
    render(
      <FeatureLocked
        eventSlug="boda-rojas"
        mejorar={{ href: '/panel/eventos/boda-rojas/plan', label: 'Ver planes' }}
        reason="El plan atelier no incluye la mesa de regalos; lo trae el plan firma-3d."
        title="Regalos"
      />,
    )

    expect(screen.getByText(/firma-3d/)).toBeInTheDocument()
  })

  it('lleva adonde quien mira puede mejorar el plan', () => {
    render(<FeatureLocked eventSlug="boda-rojas" mejorar={{ href: '/panel/eventos/boda-rojas/extras', label: 'Ver extras' }} reason="No incluido." title="Día D" />)

    expect(screen.getByRole('link', { name: 'Ver extras' })).toHaveAttribute('href', '/panel/eventos/boda-rojas/extras')
  })

  // El cliente no abre «Plan»: un enlace ahí era una página en blanco (404).
  it('sin adónde ir, no enseña un enlace que da 404: dice con quién hablar', () => {
    render(<FeatureLocked eventSlug="boda-rojas" mejorar={null} reason="No incluido." title="Día D" />)

    expect(screen.queryByRole('link', { name: /ver planes/i })).not.toBeInTheDocument()
    expect(screen.getByText(/habla con quien organiza/i)).toBeInTheDocument()
  })
})
