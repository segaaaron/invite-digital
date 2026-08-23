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

const slides = [
  make('perla', 'Perla'),
  make('marmol', 'Mármol'),
  make('laurel', 'Laurel'),
  make('carmesi', 'Carmesí'),
  make('onix', 'Ónix'),
]

describe('CollectionsCarousel en 3D', () => {
  it('la escena activa va de frente y las de al lado, giradas', () => {
    // La maqueta es un carrusel con perspectiva: la del centro mira al frente y las
    // vecinas se giran hacia dentro. Una tira plana no es lo mismo.
    render(<CollectionsCarousel dictionary={es} slides={slides} />)

    const activa = screen.getByRole('group', { current: true })
    expect(activa.style.transform).toContain('rotateY(0deg)')

    const [, segunda] = screen.getAllByRole('group')
    expect(segunda!.style.transform).toMatch(/rotateY\(-?\d+deg\)/)
    expect(segunda!.style.transform).not.toContain('rotateY(0deg)')
  })

  it('las de más allá del tercer puesto se apartan de la vista', () => {
    // Con nueve escenas, apilarlas todas en el centro emborrona el fondo y cuesta pintar.
    const muchas = Array.from({ length: 9 }, (_, i) => make(`e${i}`, `Escena ${i}`))
    render(<CollectionsCarousel dictionary={es} slides={muchas} />)

    const grupos = screen.getAllByRole('group')
    expect(grupos[0]!.style.opacity).toBe('0')
    expect(grupos[grupos.length - 1]!.style.opacity).toBe('0')
  })
})

describe('CollectionsCarousel', () => {
  it('expone controles accesibles de navegación', () => {
    render(<CollectionsCarousel slides={slides} dictionary={es} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDefined()
  })

  it('arranca por el medio y avanza al siguiente', () => {
    // Empezar por el borde deja media escena vacía: con perspectiva, el carrusel se lee
    // cuando hay escenas a los dos lados.
    render(<CollectionsCarousel slides={slides} dictionary={es} />)
    expect(screen.getByRole('group', { current: true }).textContent).toContain('Laurel')

    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    expect(screen.getByRole('group', { current: true }).textContent).toContain('Carmesí')
  })

  it('no avanza más allá del último elemento', () => {
    render(<CollectionsCarousel slides={slides} dictionary={es} />)
    const next = screen.getByRole('button', { name: /siguiente/i })
    for (let i = 0; i < 10; i += 1) fireEvent.click(next)

    expect(screen.getByRole('group', { current: true }).textContent).toContain('Ónix')
    expect(next).toBeDisabled()
  })
})
