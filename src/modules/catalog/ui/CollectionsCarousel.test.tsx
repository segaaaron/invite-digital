import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import type { Template } from '../domain/template'
import { CollectionsCarousel } from './CollectionsCarousel'

const make = (slug: string, name: string, order: number): Template => ({
  id: slug, slug, categorySlug: 'boda', categoryName: 'Boda',
  coverImagePath: `/templates/${slug}.avif`, palette: { base: '#fff', accent: '#c19b4a' },
  sortOrder: order, name, description: 'x',
})

const templates = [make('perla', 'Perla', 1), make('marmol', 'Mármol', 2), make('laurel', 'Laurel', 3)]

describe('CollectionsCarousel', () => {
  it('expone controles accesibles de navegación', () => {
    render(<CollectionsCarousel templates={templates} dictionary={es} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDefined()
  })

  it('avanza al siguiente elemento y marca el activo', () => {
    render(<CollectionsCarousel templates={templates} dictionary={es} />)
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    expect(screen.getByRole('group', { current: true }).textContent).toContain('Mármol')
  })

  it('no avanza más allá del último elemento', () => {
    render(<CollectionsCarousel templates={templates} dictionary={es} />)
    const next = screen.getByRole('button', { name: /siguiente/i })
    fireEvent.click(next)
    fireEvent.click(next)
    fireEvent.click(next)
    expect(screen.getByRole('group', { current: true }).textContent).toContain('Laurel')
  })
})
