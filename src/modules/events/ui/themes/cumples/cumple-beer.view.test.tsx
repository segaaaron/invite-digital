import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './cumple-beer.content'
import { cumpleBeerDefinition } from './cumple-beer'
import { CumpleBeerView } from './cumple-beer.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

afterEach(() => vi.restoreAllMocks())

describe('el tema Cervecería Vintage', () => {
  it('coloca las cinco ranuras', () => {
    // Un diseño que se olvide de slots.rsvp es una invitación en la que nadie puede
    // confirmar, y todo lo demás se ve perfecto.
    render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('pinta los dos avisos en su sitio: la bienvenida arriba y el karaoke con el micrófono', () => {
    // Se leen por índice porque en la maqueta son dos bloques distintos del diseño. Con los
    // dos cambiados, la frase caligráfica de la bienvenida saldría junto al micrófono.
    render(
      <CumpleBeerView
        {...propsDePrueba({
          content: {
            ...CONTENIDO_DE_MUESTRA,
            notes: [
              { title: 'Frase de arriba', text: 'Párrafo de arriba' },
              { title: 'Karaoke propio', text: 'Trae tu voz' },
            ],
          },
        })}
      />,
    )
    expect(screen.getByText('Frase de arriba')).toBeInTheDocument()
    expect(screen.getByText('Karaoke propio')).toBeInTheDocument()
  })

  it('pinta la fecha del contenido, no una escrita dentro', () => {
    // La maqueta lleva «SÁBADO · 26 · SEPTIEMBRE 2026» escrito a mano: aquí sale de
    // `schedule.startsAt`, así que cambiar la fecha cambia la invitación entera.
    render(
      <CumpleBeerView
        {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, schedule: { startsAt: '2027-03-05T21:00:00' } } })}
      />,
    )
    expect(screen.getByText('5')).toBeInTheDocument()
    // «marzo 2027», sin el «de» que mete `Intl` al pedir mes y año juntos en español.
    expect(screen.getByText('marzo 2027')).toBeInTheDocument()
    expect(screen.getByText('viernes')).toBeInTheDocument()
  })

  it('el botón de ubicación lleva a Google Maps, no a ninguna parte', () => {
    // En la maqueta es un `<button>` sin acción. Aquí abre el mapa con el enlace que pegó
    // el atelier, sus coordenadas o la dirección de la recepción.
    render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    const boton = screen.getByRole('link', { name: 'VER UBICACIÓN' })
    expect(boton).toHaveAttribute('target', '_blank')
    expect(boton.getAttribute('href')).toContain('google.com/maps')
  })

  it('el reproductor solo sale con una canción detrás', () => {
    // La maqueta de este diseño **no lleva reproductor**: es el único de la colección que
    // no lo pinta. Con el contenido de muestra se ve como ella; con el MP3 subido, el
    // bloque del karaoke gana su reproductor.
    const { unmount } = render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.queryByText('LA CANCIÓN DE LA NOCHE')).toBeNull()
    unmount()

    // jsdom no reproduce: `play()` devuelve `undefined` y el reproductor busca su promesa.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} audioSrc="/modelos/musica/cumple-beer" />)
    expect(screen.getByText('LA CANCIÓN DE LA NOCHE')).toBeInTheDocument()
    expect(screen.getByText('Karaoke de la casa')).toBeInTheDocument()
  })

  it('no pide nada de la portada: el arte lo trae todo rotulado', () => {
    // Esta invitación **no tiene fotografía en ninguna parte** —ni portada, ni retrato, ni
    // galería— y tampoco nombres ni línea sobre ellos: el arte de portada los lleva dentro.
    // Pedirlos en el editor es trabajo que el cliente hace para nadie, y lo descubre el día
    // que reparte el enlace.
    expect(cumpleBeerDefinition.sections).not.toContain('hero')
    expect(cumpleBeerDefinition.pinta.fotos.casillas).toBe(0)
    expect(cumpleBeerDefinition.pinta.fotos.portada ?? false).toBe(false)
    expect(cumpleBeerDefinition.pinta.fotos.retrato ?? false).toBe(false)
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    // Un evento recién creado sin sembrar, o uno cuyo contenido borró la retención.
    const { container } = render(<CumpleBeerView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })
})
