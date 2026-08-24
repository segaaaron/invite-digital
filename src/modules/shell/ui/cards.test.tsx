import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DonutChart, PanelCard, StatCard } from './cards'

describe('StatCard', () => {
  it('pinta la cifra en la tipografía de titulares, como la maqueta', () => {
    render(<StatCard label="Invitados" value={20} />)
    const cifra = screen.getByText('20')
    expect(cifra.className).toContain('font-display')
    // Cormorant trae números de estilo antiguo: sin esto el 1 se lee como I.
    expect(cifra.className).toContain('lining-nums')
  })

  it('el carril de progreso se recorta a su carril', () => {
    const { container } = render(<StatCard label="Confirmados" value={7} progress={1.4} />)
    const barra = container.querySelector('[data-barra]') as HTMLElement
    expect(barra.style.width).toBe('100%')
  })

  it('marca la variación al alza y a la baja con texto, no solo con color', () => {
    render(<StatCard label="Pendientes" value={5} change={{ direction: 'down', text: '1 esta semana' }} />)
    const cambio = screen.getByText(/1 esta semana/)
    expect(cambio.textContent).toContain('↓')
  })
})

describe('PanelCard', () => {
  it('lleva borde neutro, no el dorado de la web pública', () => {
    const { container } = render(<PanelCard title="Estado de RSVPs">contenido</PanelCard>)
    const tarjeta = container.querySelector('section') as HTMLElement
    expect(tarjeta.className).toContain('border-line-panel')
    expect(tarjeta.className).not.toContain('border-line ')
  })
})

describe('DonutChart', () => {
  it('la cifra del centro va en la tipografía de titulares', () => {
    render(<DonutChart slices={[{ label: 'Asisten', value: 3, color: '#5a705c' }]} big="60%" caption="confirmados" />)
    expect(screen.getByText('60%').className).toContain('font-display')
  })
})
