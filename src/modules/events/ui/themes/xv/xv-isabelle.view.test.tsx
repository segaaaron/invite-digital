import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './xv-isabelle.content'
import { XvIsabelleView } from './xv-isabelle.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

describe('el tema Palacio Griego', () => {
  it('coloca las cinco ranuras', () => {
    render(<XvIsabelleView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('pinta la recepción centrada y el itinerario con una pieza dorada por hito', () => {
    const { container } = render(<XvIsabelleView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByText('Salón de Eventos Elianne')).toBeInTheDocument()
    const piezas = [...container.querySelectorAll('li img')].map((img) => img.getAttribute('src') ?? '')
    expect(piezas.some((src) => src.includes('carrosa-dorada'))).toBe(true)
    expect(screen.getByText('Baile Sorpresa')).toBeInTheDocument()
  })

  it('abre con la foto de portada del evento cuando la hay', () => {
    const { container } = render(
      <XvIsabelleView {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, hero: { ...CONTENIDO_DE_MUESTRA.hero, coverImageId: 'abc' } } })} />,
    )
    expect(container.querySelector('img[src="/media/abc"]')).not.toBeNull()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<XvIsabelleView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<XvIsabelleView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('pinta a los padrinos aparte, bajo su propio rótulo, y a los padres arriba', () => {
    render(
      <XvIsabelleView
        {...propsDePrueba({
          content: { hosts: { label: 'Con la bendición de', names: ['Angel', 'Ivana', 'Luis'], roles: { father: 'Angel', mother: 'Ivana', godparents: ['Luis'] } } },
        })}
      />,
    )
    const rotulo = screen.getByText('PADRINOS')
    expect(screen.getByText('Angel').compareDocumentPosition(rotulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(rotulo.compareDocumentPosition(screen.getByText('Luis')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sin padrinos no pinta su rótulo', () => {
    render(<XvIsabelleView {...propsDePrueba({ content: { hosts: { label: 'Mis padres', names: ['Angel'], roles: { father: 'Angel' } } } })} />)
    expect(screen.queryByText('PADRINOS')).toBeNull()
  })
})
