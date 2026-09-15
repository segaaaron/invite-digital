import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza un botón cuando no hay href', () => {
    render(<Button>Crear invitación</Button>)
    expect(screen.getByRole('button', { name: 'Crear invitación' })).toBeDefined()
  })

  it('renderiza un enlace cuando hay href', () => {
    render(<Button href="/es/planes">Ver planes</Button>)
    const link = screen.getByRole('link', { name: 'Ver planes' })
    expect(link.getAttribute('href')).toBe('/es/planes')
  })

  it('marca los enlaces externos con rel seguro', () => {
    render(<Button href="https://wa.me/59170012345" external>Escribir</Button>)
    // Avisa de que abre otra pestaña: quien usa lector de pantalla pierde el «atrás».
    const link = screen.getByRole('link', { name: 'Escribir (se abre en una pestaña nueva)' })
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('aplica la variante ghost y conserva el className propio', () => {
    render(
      <Button variant="ghost" className="mi-clase-propia">
        Reservar
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Reservar' })
    expect(button.className).toContain('mi-clase-propia')
    expect(button.className).toContain('border')
    expect(button.className).toContain('bg-bg-raised/70')
  })
})
