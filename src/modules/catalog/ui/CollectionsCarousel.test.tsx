import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { CollectionsCarousel, type CarouselSlide } from './CollectionsCarousel'

const make = (key: string, name: string): CarouselSlide => ({
  key,
  tag: 'Boda',
  name,
  alt: `Escena ${name}`,
  src: `/site/colecciones/${key}.avif`,
})

const slides = [make('perla', 'Perla'), make('marmol', 'Mármol'), make('laurel', 'Laurel')]

describe('CollectionsCarousel', () => {
  it('expone controles accesibles de navegación', () => {
    render(<CollectionsCarousel slides={slides} dictionary={es} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDefined()
  })

  it('avanza al siguiente elemento y marca el activo', () => {
    render(<CollectionsCarousel slides={slides} dictionary={es} />)
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    expect(screen.getByRole('group', { current: true }).textContent).toContain('Mármol')
  })

  it('no avanza más allá del último elemento', () => {
    render(<CollectionsCarousel slides={slides} dictionary={es} />)
    const next = screen.getByRole('button', { name: /siguiente/i })
    fireEvent.click(next)
    fireEvent.click(next)
    fireEvent.click(next)
    expect(screen.getByRole('group', { current: true }).textContent).toContain('Laurel')
  })
})
