import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClasicoTheme } from './ClasicoTheme'
import { eventoDePrueba as evento, propsDePrueba } from './test-props'

describe('ClasicoTheme', () => {
  it('coloca las cinco ranuras', () => {
    // Un tema que se olvide de slots.rsvp es una invitación en la que nadie puede
    // confirmar, y todo lo demás se ve perfecto.
    render(<ClasicoTheme {...propsDePrueba()} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura)).toBeInTheDocument()
    }
  })

  it('dice dónde es cuando el evento tiene lugar', () => {
    render(
      <ClasicoTheme {...propsDePrueba({ event: evento({ venue: 'Hacienda Los Encinos, Cochabamba' }) })} />,
    )
    // Sin esto la invitación decía cuándo y de quién, pero no dónde.
    expect(screen.getByText('Hacienda Los Encinos, Cochabamba')).toBeInTheDocument()
  })

  it('sin lugar no pinta un hueco vacío', () => {
    const { container } = render(
      <ClasicoTheme {...propsDePrueba()} />,
    )
    expect(container.textContent).not.toContain('null')
  })

  it('la fecha se lee como día de calendario, no como instante', () => {
    render(
      <ClasicoTheme {...propsDePrueba()} />,
    )
    // Sin fijar la zona, un huso al oeste enseñaría el 17.
    expect(screen.getByText(/18 de octubre de 2026/i)).toBeInTheDocument()
  })
})
