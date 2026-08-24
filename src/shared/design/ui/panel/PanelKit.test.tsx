import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarRow, FilterChip, IconButton, PanelButton, Pill, SearchField } from './PanelKit'

describe('PanelButton', () => {
  it('pinta el primario en tinta oscura, no en dorado', () => {
    render(<PanelButton variant="primary">Invitar persona</PanelButton>)
    const boton = screen.getByRole('button', { name: 'Invitar persona' })
    expect(boton.className).toContain('to-shell-deep')
    expect(boton.className).not.toContain('bg-gold')
  })

  it('pinta el secundario blanco con borde, como la maqueta', () => {
    render(<PanelButton>Exportar lista</PanelButton>)
    const boton = screen.getByRole('button', { name: 'Exportar lista' })
    expect(boton.className).toContain('bg-white')
    expect(boton.className).toContain('border')
  })

  it('renderiza un enlace cuando hay href', () => {
    render(<PanelButton href="/panel/eventos/boda/mesas">Ver mesas</PanelButton>)
    expect(screen.getByRole('link', { name: 'Ver mesas' }).getAttribute('href')).toBe('/panel/eventos/boda/mesas')
  })

  it('la variante peligrosa no se confunde con las demás', () => {
    render(<PanelButton variant="danger">Eliminar evento</PanelButton>)
    expect(screen.getByRole('button', { name: 'Eliminar evento' }).className).toContain('danger')
  })
})

describe('Pill', () => {
  it('da fondo de color al estado, no solo texto', () => {
    render(<Pill tone="ok">Asistirá</Pill>)
    expect(screen.getByText('Asistirá').className).toContain('bg-pill-ok')
  })

  it('distingue los cuatro tonos de la maqueta', () => {
    const { container } = render(
      <>
        <Pill tone="ok">Asistirá</Pill>
        <Pill tone="no">No podrá</Pill>
        <Pill tone="pending">Pendiente</Pill>
        <Pill tone="maybe">Tal vez</Pill>
      </>,
    )
    const clases = [...container.querySelectorAll('span')].map((s) => s.className)
    expect(new Set(clases).size).toBe(4)
  })
})

describe('FilterChip', () => {
  it('el activo va en tinta sólida y lo anuncia', () => {
    render(<FilterChip active>Confirmados</FilterChip>)
    const chip = screen.getByRole('button', { name: 'Confirmados' })
    expect(chip.className).toContain('bg-ink')
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })

  it('el inactivo va blanco', () => {
    render(<FilterChip>Pendientes</FilterChip>)
    const chip = screen.getByRole('button', { name: 'Pendientes' })
    expect(chip.className).toContain('bg-white')
    expect(chip.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('SearchField', () => {
  it('lleva etiqueta accesible aunque solo se vea el marcador', () => {
    render(<SearchField label="Buscar invitado" placeholder="Buscar invitado o grupo..." />)
    expect(screen.getByLabelText('Buscar invitado')).toBeDefined()
  })
})

describe('IconButton', () => {
  it('exige nombre accesible: un icono suelto no lo tiene', () => {
    render(<IconButton label="Copiar enlace">⧉</IconButton>)
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeDefined()
  })
})

describe('BarRow', () => {
  it('pinta etiqueta, barra y cifra en la misma fila', () => {
    render(<BarRow label="Vegetariano" value="1" ratio={0.25} />)
    expect(screen.getByText('Vegetariano')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()
  })

  it('recorta la proporción: una barra al 140 % se sale del carril', () => {
    const { container } = render(<BarRow label="Sin gluten" value="9" ratio={1.4} />)
    const barra = container.querySelector('[data-barra]') as HTMLElement
    expect(barra.style.width).toBe('100%')
  })

  it('nunca pinta ancho negativo', () => {
    const { container } = render(<BarRow label="Vegano" value="0" ratio={-1} />)
    const barra = container.querySelector('[data-barra]') as HTMLElement
    expect(barra.style.width).toBe('0%')
  })
})
