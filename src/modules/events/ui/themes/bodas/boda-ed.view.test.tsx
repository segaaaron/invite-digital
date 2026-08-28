import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './boda-ed.content'
import { BodaEdView } from './boda-ed.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Editorial', () => {
  it('coloca las cinco ranuras', () => {
    render(<BodaEdView {...conMuestra()} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('separa la cita destacada de la columna con capitular', () => {
    // El primer párrafo va entre filetes en grande; el resto, en columna. Es la convención
    // que evita inventar un bloque de contenido solo para este diseño.
    render(<BodaEdView {...conMuestra()} />)
    expect(screen.getByText(/promesa cumplida/)).toBeInTheDocument()
    expect(screen.getByText(/librería de viejo/)).toBeInTheDocument()
  })

  it('el sumario lista solo las secciones que la invitación trae', () => {
    // Un índice que anuncia «P.06 Código de vestimenta» en una boda que no lo cargó promete
    // una página que no está. La maqueta lo tenía clavado.
    render(<BodaEdView {...propsDePrueba({ content: { hero: { nameA: 'María' } } })} />)

    expect(screen.queryByText('P.06')).not.toBeInTheDocument()
    expect(screen.queryByText('P.04')).not.toBeInTheDocument()
    // El RSVP siempre está: es lo único que la invitación pide de vuelta.
    expect(screen.getByText('P.10')).toBeInTheDocument()
  })

  it('pinta la carta de color con su nombre y su hexadecimal', () => {
    // El hexadecimal a la vista es lo que hace que se lea como una página de moda y no como
    // cinco cuadrados de colores.
    render(<BodaEdView {...conMuestra()} />)
    expect(screen.getByText('TERRA')).toBeInTheDocument()
    expect(screen.getByText('#aa6e4e')).toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<BodaEdView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<BodaEdView {...conMuestra()} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
