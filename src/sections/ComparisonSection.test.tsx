import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { ComparisonSection } from './ComparisonSection'

describe('ComparisonSection', () => {
  it('muestra las cinco ventajas LUXE y las cinco tradicionales', () => {
    render(<ComparisonSection dictionary={es} />)
    for (const item of es.comparison.luxe) expect(screen.getByText(item)).toBeDefined()
    for (const item of es.comparison.traditional) expect(screen.getByText(item)).toBeDefined()
  })

  it('rotula las dos columnas de forma accesible', () => {
    render(<ComparisonSection dictionary={es} />)
    expect(screen.getByRole('region', { name: es.comparison.title })).toBeDefined()
  })
})
