import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { ComparisonSection } from './ComparisonSection'

describe('ComparisonSection', () => {
  it('muestra las cinco ventajas de Luxury Atelier y las cinco tradicionales, en teléfono y en escritorio', () => {
    // Dos composiciones —tarjetas apiladas en el teléfono, deslizador desde la tableta—, y
    // las dos llevan las diez líneas.
    render(<ComparisonSection dictionary={es} />)
    for (const item of es.comparison.luxe) expect(screen.getAllByText(item)).toHaveLength(2)
    for (const item of es.comparison.traditional) expect(screen.getAllByText(item)).toHaveLength(2)
  })

  it('rotula las dos columnas de forma accesible', () => {
    render(<ComparisonSection dictionary={es} />)
    expect(screen.getByRole('region', { name: es.comparison.title })).toBeDefined()
  })
})
