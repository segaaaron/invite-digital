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

  it('parte la cita en titular, firma y columna con capitular', () => {
    // El diseño la compone en tres piezas y en ese orden; es un solo bloque de contenido
    // porque en la maqueta es un solo texto.
    render(<BodaEdView {...conMuestra()} />)
    // La última línea del titular va aparte, en oro.
    expect(screen.getByText(/lo que iba a querer/)).toBeInTheDocument()
    expect(screen.getByText('— ALEX, 28')).toBeInTheDocument()
    expect(screen.getByText(/librería de viejo/)).toBeInTheDocument()
  })

  it('el itinerario es un camino que va de un lado al otro, con la hora hacia dentro', () => {
    render(<BodaEdView {...conMuestra()} />)
    const primera = screen.getByText('13:45').parentElement
    const segunda = screen.getByText('16:00').parentElement
    expect(primera?.style.textAlign).toBe('left')
    expect(segunda?.style.textAlign).toBe('right')
  })

  it('pinta el muestrario de color del código de vestimenta', () => {
    render(<BodaEdView {...conMuestra()} />)
    expect(screen.getByText('DORADO')).toBeInTheDocument()
    expect(screen.getByText('VERDE SALVIA')).toBeInTheDocument()
  })

  it('enseña los avisos del diseño: solo adultos y las fotos de los invitados', () => {
    render(<BodaEdView {...conMuestra()} />)
    expect(screen.getByText('CELEBRACIÓN SOLO PARA ADULTOS')).toBeInTheDocument()
    expect(screen.getByText('Comparte tus fotos')).toBeInTheDocument()
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

  it('los padres de cada novio salen de su papel, aunque falte alguno, y los padrinos aparte', () => {
    render(
      <BodaEdView
        {...propsDePrueba({
          content: { hosts: { names: ['Rosa', 'Pedro', 'Luis'], roles: { brideMother: 'Rosa', groomFather: 'Pedro', godparents: ['Luis'] } } },
        })}
      />,
    )
    // Por posición, «Pedro» habría caído entre los padres de la novia.
    const novio = screen.getByText('Pedro')
    const rotuloNovio = screen.getByText(/padres del novio/i)
    expect(rotuloNovio.compareDocumentPosition(novio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText(/padres de la novia/i).compareDocumentPosition(rotuloNovio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('PADRINOS')).toBeInTheDocument()
  })
})
