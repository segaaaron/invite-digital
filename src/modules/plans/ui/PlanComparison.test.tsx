import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import type { Allowance } from '../domain/allowance'
import { PlanComparison } from './PlanComparison'

const base: Allowance = {
  planSlug: 'atelier',
  maxGuestGroups: 30,
  seating: true,
  registry: false,
  checkin: false,
  maxDoorPorters: 0,
  maxGalleryPhotos: 8,
  guestPhotos: false,
  eventPassword: false,
  csvImport: false,
  onlineDays: 60,
  designChange: 'ninguno',
}

describe('PlanComparison', () => {
  it('una columna por plan y una fila por límite, con lo que dice la base', () => {
    render(
      <PlanComparison
        planes={[
          { nombre: 'Atelier', limites: base },
          { nombre: 'Alta Costura', limites: { ...base, planSlug: 'alta', maxDoorPorters: 10, checkin: true } },
        ]}
        textos={es.pricing.comparison}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Alta Costura' })).toBeInTheDocument()
    const porteros = screen.getByRole('row', { name: /porteros/i })
    expect(within(porteros).getAllByRole('cell').map((c) => c.textContent)).toEqual(['No', 'Hasta 10'])
  })
})
