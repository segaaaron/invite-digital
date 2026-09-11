import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './civil.content'
import { CivilView } from './civil.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

describe('el tema Civil', () => {
  it('coloca las cinco ranuras', () => {
    // Un diseño que se olvide de slots.rsvp es una invitación en la que nadie puede
    // confirmar, y todo lo demás se ve perfecto.
    render(<CivilView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('pinta el titular del contenido, no uno escrito dentro', () => {
    render(
      <CivilView {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, hero: { nameA: 'Prueba', nameB: 'Nombre' } } })} />,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Prueba')
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    // Un evento recién creado sin sembrar, o uno cuyo contenido borró la retención.
    const { container } = render(<CivilView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('coloca el RSVP también en la vista previa: es un tercio de lo que el cliente viene a ver', () => {
    // Estuvo tapado con un aviso de texto, y en el escaparate faltaban el formulario, la
    // mesa de regalos y el libro de firmas. Ahora la pieza va entera y **inerte**, que es
    // lo que la maqueta enseña; el aviso lo pone la propia ranura, debajo.
    render(<CivilView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<CivilView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
