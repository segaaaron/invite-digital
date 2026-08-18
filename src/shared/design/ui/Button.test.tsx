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
    const link = screen.getByRole('link', { name: 'Escribir' })
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
