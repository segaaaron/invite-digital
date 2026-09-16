import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './boda-bot.content'
import { BodaBotView } from './boda-bot.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Botánica', () => {
  it('el collage y la fotografía grande caen al arte del diseño cuando no hay foto propia', () => {
    // Tres huecos grises donde la maqueta enseña anillos, flores y pastel es lo que hace
    // que un modelo terminado parezca a medias. Las fotografías del diseño están en el
    // repositorio desde que se portó: lo que faltaba era usarlas de respaldo.
    const { container } = render(<BodaBotView {...conMuestra()} />)
    const fuentes = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '')
    for (const archivo of ['boda-01-pareja', 'boda-03-anillos', 'boda-02-arreglo', 'boda-04-pastel']) {
      expect(fuentes.some((fuente) => fuente.includes(archivo)), archivo).toBe(true)
    }
  })

  it('cuenta la historia del diseño bajo su rótulo', () => {
    render(<BodaBotView {...conMuestra()} />)
    expect(screen.getByText('2019 — 2026')).toBeInTheDocument()
    expect(screen.getByText(/un domingo de café/)).toBeInTheDocument()
  })

  it('coloca las cinco ranuras', () => {
    render(<BodaBotView {...conMuestra()} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('compone la fecha en piezas, como una hoja de calendario', () => {
    // El diseño la pinta en cuatro partes —día de la semana, mes, número grande, año—, no
    // como una línea de texto. Se calcula de la hora del evento y no se copia: la maqueta
    // tenía «SÁBADO» escrito a mano sobre un 18 de octubre de 2026 que cae en **domingo**.
    // Copiarlo habría heredado el error en todas las bodas que usen este diseño.
    render(<BodaBotView {...conMuestra()} />)
    // Coincidencia exacta y no `/domingo/i`: la historia del diseño habla de «un domingo
    // de café», así que la expresión regular casaba con dos elementos y la prueba fallaba
    // por un texto de muestra.
    expect(screen.getByText('domingo')).toBeInTheDocument()
    expect(screen.getByText('octubre')).toBeInTheDocument()
    // El «18» aparece dos veces: el día del calendario y las horas de la cuenta atrás. Se
    // busca el del calendario por su tamaño, que es lo que lo distingue en el diseño.
    const dias = screen.getAllByText('18')
    expect(dias.some((nodo) => nodo.style.fontSize === '90px')).toBe(true)
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('pinta el itinerario con sus seis hitos', () => {
    render(<BodaBotView {...conMuestra()} />)
    // `getAllByText`: «Ceremonia Religiosa» y «Recepción Social» salen dos veces —en su
    // tarjeta y en la fila del itinerario—, que es lo que hace el diseño.
    for (const fila of CONTENIDO_DE_MUESTRA.itinerary ?? []) {
      expect(screen.getAllByText(fila.label).length, fila.label).toBeGreaterThan(0)
    }
  })

  it('parte la frase por sus saltos de línea, como el diseño la compone', () => {
    render(<BodaBotView {...conMuestra()} />)
    // La frase lleva sus comillas, como en el diseño.
    expect(screen.getByText('"and they lived')).toBeInTheDocument()
    expect(screen.getByText('happily ever after"')).toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<BodaBotView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<BodaBotView {...conMuestra()} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('los padres de cada novio salen de su papel, aunque falte alguno, y los padrinos aparte', () => {
    render(
      <BodaBotView
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
