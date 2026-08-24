import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TimelineChart } from './TimelineChart'

const serie = [
  { day: '2026-08-21', label: 'V', count: 2 },
  { day: '2026-08-22', label: 'S', count: 4 },
]

describe('TimelineChart', () => {
  it('enuncia los valores para quien no ve el gráfico', () => {
    render(<TimelineChart bars={serie} caption="RSVPs por día" />)
    const grafico = screen.getByRole('img')
    expect(grafico.getAttribute('aria-label')).toContain('4')
  })

  it('la barra más alta llena el carril y las demás van en proporción', () => {
    const { container } = render(<TimelineChart bars={serie} caption="RSVPs por día" />)
    const alturas = [...container.querySelectorAll('[data-barra]')].map((b) => (b as HTMLElement).style.height)
    expect(alturas).toEqual(['50%', '100%'])
  })

  it('una serie sin una sola respuesta no divide por cero', () => {
    const { container } = render(
      <TimelineChart bars={[{ day: '2026-08-22', label: 'S', count: 0 }]} caption="RSVPs por día" />,
    )
    const barra = container.querySelector('[data-barra]') as HTMLElement
    expect(barra.style.height).toBe('0%')
  })

  it('pinta el eje con la inicial de cada día', () => {
    render(<TimelineChart bars={serie} caption="RSVPs por día" />)
    expect(screen.getByText('V')).toBeDefined()
    expect(screen.getByText('S')).toBeDefined()
  })
})
