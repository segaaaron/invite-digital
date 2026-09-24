import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './xv-natalia.content'
import { XvNataliaView } from './xv-natalia.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

describe('el tema Encanto Musical', () => {
  it('coloca las cinco ranuras', () => {
    render(<XvNataliaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('es la misma composición que Bajo el Mar con otra piel, no una copia', () => {
    // Comparten esqueleto a propósito: en la maqueta también son el mismo diseño con otros
    // colores. Lo que cambia es el nombre y el contenido.
    render(<XvNataliaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Natalia')
    expect(screen.getByText('Lluvia de Sobres')).toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<XvNataliaView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<XvNataliaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
