import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './eng.content'
import { EngView } from './eng.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

describe('el tema Compromiso', () => {
  it('coloca las cinco ranuras', () => {
    // Un diseño que se olvide de slots.rsvp es una invitación en la que nadie puede
    // confirmar, y todo lo demás se ve perfecto.
    render(<EngView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('pinta el titular del contenido, no uno escrito dentro', () => {
    render(
      <EngView {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, hero: { nameA: 'Prueba', nameB: 'Nombre' } } })} />,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Prueba')
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    // Un evento recién creado sin sembrar, o uno cuyo contenido borró la retención.
    const { container } = render(<EngView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('en vista previa no pinta el RSVP de verdad, y lo dice', () => {
    render(<EngView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA, preview: true })} />)
    expect(screen.queryByText('ranura-rsvp')).not.toBeInTheDocument()
    expect(screen.getByText(/nada de lo que escribas/i)).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<EngView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
