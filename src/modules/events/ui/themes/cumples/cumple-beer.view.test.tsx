import { fireEvent, render, screen } from '@testing-library/react'
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
  it('coloca sus tres ranuras, y ni la del invitado ni la del pase', () => {
    // Un diseño que se olvide de slots.rsvp es una invitación en la que nadie puede
    // confirmar, y todo lo demás se ve perfecto.
    render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-rsvp', 'ranura-regalos', 'ranura-firmas']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
    // Un cumpleaños no controla la entrada con un QR: ni pase ni «Nombre · Cupos
    // reservados». A quién va dirigida lo dice el saludo de «La Celebración».
    expect(screen.queryByText('ranura-invitado')).not.toBeInTheDocument()
    expect(screen.queryByText('ranura-pase')).not.toBeInTheDocument()
  })

  it('saluda por su nombre a quien recibe el enlace, delante del titular', () => {
    // Es lo único que este diseño dice del invitado: el rótulo «Nombre · Cupos reservados»
    // no lo pinta, y sin saludo la invitación no nombra a quien la recibe en ninguna parte.
    render(
      <CumpleBeerView
        {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA, guestInfo: { label: 'Edson y Vania', seats: 2 } })}
      />,
    )
    expect(screen.getByText('Edson y Vania')).toBeInTheDocument()
    expect(screen.getByText(/Llega el gran día/)).toBeInTheDocument()
  })

  it('sin invitado —el escaparate— el titular se queda solo', () => {
    render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA, guestInfo: { label: '   ', seats: 1 } })} />)
    expect(screen.queryByText(/Llega el gran día/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('La Celebración')
  })

  it('la portada enseña la llamada a abrirla, y al tocarla entra', () => {
    // Sin una llamada visible la portada parece una estampa: se miraba el arte y nadie
    // tocaba. Y el primer toque es además lo que deja sonar la música, que ningún navegador
    // arranca sin un gesto.
    render(<CumpleBeerView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    const portada = screen.getByRole('button', { name: /abrir/i })
    expect(screen.getByText('TOCA PARA ABRIR')).toBeInTheDocument()

    fireEvent.click(portada)
    expect(screen.queryByText('TOCA PARA ABRIR')).not.toBeInTheDocument()
  })

  it('quien ya respondió ve solo las gracias: ni la invitación ni la música', () => {
    // Volver al enlace después de contestar es comprobar que la respuesta llegó, no leer la
    // fiesta otra vez —y con la canción arrancando de nuevo, esa confirmación se perdía—.
    const { container } = render(
      <CumpleBeerView
        {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA, guestInfo: { label: 'Edson y Vania', seats: 2 }, respondida: true, asistira: true })}
      />,
    )
    expect(screen.getByText('¡Gracias por confirmar!')).toBeInTheDocument()
    expect(screen.getByText('Edson y Vania')).toBeInTheDocument()
    for (const ranura of ['ranura-rsvp', 'ranura-regalos', 'ranura-firmas']) {
      expect(screen.queryByText(ranura), ranura).not.toBeInTheDocument()
    }
    expect(screen.queryByText('La Celebración')).not.toBeInTheDocument()
    expect(container.querySelector('audio')).toBeNull()
    // Y la dirección, que el día de la fiesta es lo único que va a buscar: la invitación ya
    // no se abre.
    expect(screen.getByText(/Guarda la dirección/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CÓMO LLEGAR' })).toBeInTheDocument()
  })

  it('quien dijo que no tiene su propia despedida', () => {
    render(
      <CumpleBeerView
        {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA, guestInfo: { label: 'Pamela', seats: 1 }, respondida: true, asistira: false })}
      />,
    )
    expect(screen.getByText('Gracias por avisar')).toBeInTheDocument()
    // Y se despide igual de bien que quien viene: nadie se queda con un «gracias» a secas.
    expect(screen.getByText(/En otra oportunidad será/)).toBeInTheDocument()
    // A quien no viene no se le da la dirección: no la necesita.
    expect(screen.queryByText(/Guarda la dirección/)).not.toBeInTheDocument()
    expect(screen.queryByText('¡Gracias por confirmar!')).not.toBeInTheDocument()
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

  it('de la portada pide el nombre, y lo pinta dentro del medallón', () => {
    // El arte venía con «MIGUEL» rotulado dentro y se le quitó del archivo: si no, cualquier
    // otro cumpleaños abriría su invitación con el nombre de otra persona.
    render(<CumpleBeerView {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, hero: { nameA: 'Carlos' } } })} />)
    expect(screen.getByText('CARLOS')).toBeInTheDocument()
  })

  it('no pide ninguna fotografía: no tiene dónde ponerla', () => {
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
