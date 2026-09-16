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

  it('pinta la ceremonia y la recepción, que este diseño sí separa', () => {
    render(<XvIsabelleView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByText('Parroquia Santa Isabel')).toBeInTheDocument()
    expect(screen.getByText('Jardín Las Magnolias')).toBeInTheDocument()
  })

  it('compone la fecha como hoja de calendario', () => {
    render(<XvIsabelleView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByText(/noviembre/i)).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
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
