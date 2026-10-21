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
  maxCohosts: 1,
  maxHiredPlanners: 0,
  maxGalleryPhotos: 8,
  guestPhotos: false,
  eventPassword: false,
  csvImport: false,
  onlineDays: 60,
  designChange: 'ninguno',
  plannerSuite: 'esencial',
}

const otro: Allowance = { ...base, planSlug: 'alta', maxDoorPorters: 10, checkin: true, maxGalleryPhotos: 20, guestPhotos: true }

describe('PlanComparison', () => {
  it('una columna por plan y una fila por límite, con lo que dice la base', () => {
    render(<PlanComparison planes={[{ nombre: 'Atelier', limites: base }, { nombre: 'Alta Costura', limites: otro }]} textos={es.pricing.comparison} />)

    expect(screen.getByRole('columnheader', { name: /Alta Costura/ })).toBeInTheDocument()
    const fotos = screen.getByRole('row', { name: /galería de fotos/i })
    expect(within(fotos).getAllByRole('cell').map((c) => c.textContent)).toEqual(['8', '20'])
    const qr = screen.getByRole('row', { name: /qr de acceso/i })
    expect(within(qr).getAllByRole('cell').map((c) => c.textContent)).toEqual(['–', '✓'])
  })

  /**
   * Lo que traen todos **no se repite fila a fila**: sube al recuadro de arriba. Una tabla con tres
   * columnas de ✓ idénticos no compara nada, y es lo que hacía que la diferencia real se perdiera.
   */
  it('lo que traen todos igual sube al recuadro y no sale como fila', () => {
    render(<PlanComparison planes={[{ nombre: 'Atelier', limites: base }, { nombre: 'Alta Costura', limites: otro }]} textos={es.pricing.comparison} />)

    const recuadro = screen.getByText(es.pricing.comparison.todosIncluyen).parentElement
    expect(recuadro).toHaveTextContent(es.pricing.comparison.filas.confirmacion!)
    expect(screen.queryByRole('row', { name: new RegExp(es.pricing.comparison.filas.confirmacion!, 'i') })).toBeNull()
  })

  it('las filas van agrupadas por lo que son', () => {
    render(<PlanComparison planes={[{ nombre: 'Atelier', limites: base }, { nombre: 'Alta Costura', limites: otro }]} textos={es.pricing.comparison} />)

    for (const rotulo of Object.values(es.pricing.comparison.grupos)) {
      if (rotulo === es.pricing.comparison.grupos.entrega) continue
      expect(screen.getAllByText(rotulo).length).toBeGreaterThan(0)
    }
  })

  /**
   * El adicional se enseña **en la celda del plan que no lo trae**: «+Bs 150» dice a la vez que no viene
   * incluido y cuánto cuesta sumarlo, que es justo lo que se pregunta al ver una raya.
   */
  it('un adicional pone su precio en la celda del plan que no lo incluye', () => {
    render(
      <PlanComparison
        extras={[{ name: 'Álbum compartido', precio: '+Bs 150,00', fila: 'album' }]}
        planes={[{ nombre: 'Atelier', limites: base }, { nombre: 'Alta Costura', limites: otro }]}
        textos={es.pricing.comparison}
      />,
    )

    const album = screen.getByRole('row', { name: new RegExp(es.pricing.comparison.filas.album!, 'i') })
    expect(within(album).getAllByRole('cell').map((c) => c.textContent)).toEqual(['+Bs 150,00', '✓'])
  })

  it('el precio va bajo el nombre del plan, en su columna', () => {
    render(<PlanComparison planes={[{ nombre: 'Atelier', limites: base, precio: 'Bs 490' }, { nombre: 'Alta Costura', limites: otro, precio: 'Bs 690' }]} textos={es.pricing.comparison} />)

    expect(screen.getByRole('columnheader', { name: /Atelier\s*Bs 490/ })).toBeInTheDocument()
  })
})
