import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './xv-valeria.content'
import { XvValeriaView } from './xv-valeria.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

describe('el tema Gala Real', () => {
  it('coloca las cinco ranuras', () => {
    render(<XvValeriaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('pinta el nombre de la quinceañera desde el contenido', () => {
    render(<XvValeriaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Valeria')
  })

  it('pinta el cronograma entero', () => {
    render(<XvValeriaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const fila of CONTENIDO_DE_MUESTRA.itinerary ?? []) {
      expect(screen.getByText(fila.label), fila.label).toBeInTheDocument()
    }
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<XvValeriaView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<XvValeriaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
