import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './xv-fantasia.content'
import { XvFantasiaView } from './xv-fantasia.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

describe('el tema Noche Estrellada', () => {
  it('coloca las cinco ranuras', () => {
    render(<XvFantasiaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('pinta el nombre de la quinceañera desde el contenido', () => {
    render(<XvFantasiaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Alicia')
  })

  it('pinta el cronograma entero', () => {
    render(<XvFantasiaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const fila of CONTENIDO_DE_MUESTRA.itinerary ?? []) {
      expect(screen.getByText(fila.label), fila.label).toBeInTheDocument()
    }
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<XvFantasiaView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<XvFantasiaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('la fotografía de la portada de Noche Estrellada', () => {
  // Su portada **es** una fotografía, así que el tema la declara (`fotos.portada`) y el
  // panel la pide. Sin esta conexión, lo que se subía ahí no salía en ninguna parte y la
  // invitación abría para siempre con la foto del modelo.
  it('usa la del evento cuando la subieron', () => {
    const { container } = render(
      <XvFantasiaView {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, hero: { ...CONTENIDO_DE_MUESTRA.hero, coverImageId: 'foto-1' } } })} />,
    )
    expect(container.querySelector('img[src="/media/foto-1"]')).toBeInTheDocument()
  })

  it('sin fotografía del evento se queda la del modelo', () => {
    const { container } = render(<XvFantasiaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(container.querySelector('img[src="/media/foto-1"]')).not.toBeInTheDocument()
  })
})
