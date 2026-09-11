import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './boda.content'
import { BodaView } from './boda.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  // Sin movimiento reducido los `Reveal` arrancan en opacity 0 y el contenido sigue en el
  // marcado, así que las pruebas leerían igual. Se pide reducido para leer lo que un
  // invitado ve de verdad al abrir.
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Étoile', () => {
  it('coloca las cinco ranuras', () => {
    // Un diseño que se olvide de `slots.rsvp` es una invitación en la que nadie puede
    // confirmar, y todo lo demás se ve perfecto. Es el fallo que más caro sale.
    render(<BodaView {...conMuestra()} />)

    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('pinta los dos nombres y el rótulo de la cabecera', () => {
    render(<BodaView {...conMuestra()} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Camila')
    expect(screen.getByText('Mateo')).toBeInTheDocument()
    expect(screen.getByText('SAVE THE DATE')).toBeInTheDocument()
  })

  it('pinta la ceremonia y la recepción con sus dos direcciones', () => {
    render(<BodaView {...conMuestra()} />)

    expect(screen.getByText('Iglesia San Esteban')).toBeInTheDocument()
    expect(screen.getByText('Calle Real 24, Centro')).toBeInTheDocument()
    expect(screen.getByText('Viñedo La Aurora')).toBeInTheDocument()
    expect(screen.getByText('Km 12, Ruta del Vino')).toBeInTheDocument()
  })

  it('pinta el itinerario entero', () => {
    render(<BodaView {...conMuestra()} />)

    for (const fila of CONTENIDO_DE_MUESTRA.itinerary ?? []) {
      expect(screen.getByText(fila.label), fila.label).toBeInTheDocument()
    }
  })

  it('sin contenido no revienta ni pinta huecos con «undefined»', () => {
    // Un evento recién creado al que todavía no se le sembró nada, o uno cuyo contenido se
    // borró al vencer la retención. Tiene que abrirse igual.
    const { container } = render(<BodaView {...propsDePrueba({ content: {} })} />)

    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('en vista previa SÍ pinta la portada: es la primera pantalla del modelo', () => {
    // Estuvo escondida, y con ella se escondían diez imágenes —los sobres, las tiaras, las
    // máscaras, los fondos a sangre— y la composición entera de cada portada, que nadie
    // pudo comparar contra la maqueta porque no se veía. El escaparate enseña lo que el
    // invitado va a recibir, y lo primero que recibe es la portada.
    render(<BodaView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)

    expect(screen.getByRole('button', { name: /abrir la invitación/i })).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    // El nombre de la pareja es el título de la página. Dos h1 dejan la invitación con dos
    // títulos para quien la recorre con lector de pantalla.
    render(<BodaView {...conMuestra()} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
