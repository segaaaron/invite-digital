import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentBlockForms } from './ContentBlockForms'

vi.mock('@/app/_acciones/events/actions', () => ({
  saveContentBlockAction: vi.fn(),
  // La subida desde el propio campo vive dentro de los selectores de imagen y de música.
  uploadMediaAction: vi.fn(),
  removeMediaAction: vi.fn(async () => ({ status: 'success' })),
}))

const SIN_IMAGENES: never[] = []

/** Un diseño que pinta de todo: seis casillas de galería, portada y retrato. */
const TODO = { fotos: { portada: true, retrato: true, casillas: 6 } } as const

/** Lo que la acción recibiría si se pulsara «Guardar» ahora mismo. */
const valorEnviado = (container: HTMLElement): unknown =>
  JSON.parse((container.querySelector('input[name="value"]') as HTMLInputElement).value)

describe('ContentBlockForms', () => {
  it('enseña un formulario por sección que el diseño pinta', () => {
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ music: { track: 'At Last' } }}
        eventId="e1"
        eventSlug="boda"
        media={SIN_IMAGENES}
        sections={['music', 'itinerary']}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Canción' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Itinerario' })).toBeInTheDocument()
  })

  it('no enseña las secciones que el diseño no pinta', () => {
    // Pedirle un itinerario a un diseño que no lo tiene es pedir trabajo que no se ve.
    render(<ContentBlockForms ejemplo={{}} pinta={TODO} content={{}} eventId="e1" eventSlug="boda" media={SIN_IMAGENES} sections={['music']} />)
    expect(screen.queryByText('Itinerario')).not.toBeInTheDocument()
    expect(screen.queryByText('Código de vestimenta')).not.toBeInTheDocument()
  })

  it('si el servidor cambia la canción —al subir el archivo—, el bloque enseña la nueva', () => {
    // Sin esto el formulario seguía con el nombre de muestra, y guardarlo lo volvía a escribir.
    const props = { eventId: 'e1', eventSlug: 'b', media: SIN_IMAGENES, pinta: TODO, sections: ['music'] as const }
    const { container, rerender } = render(<ContentBlockForms ejemplo={{}} {...props} content={{ music: { track: 'Tiempo de Vals', artist: 'Chayanne' } }} />)
    rerender(<ContentBlockForms ejemplo={{}} {...props} content={{ music: { track: 'Mi Vals', artist: 'Cuarteto Andino' } }} />)
    expect(valorEnviado(container)).toMatchObject({ track: 'Mi Vals', artist: 'Cuarteto Andino' })
  })

  it('un diseño sin contenido editable lo dice, en vez de dejar la tarjeta vacía', () => {
    render(<ContentBlockForms ejemplo={{}} pinta={TODO} content={{}} eventId="e1" eventSlug="boda" media={SIN_IMAGENES} sections={[]} />)
    expect(screen.getByText(/no lleva contenido editable/i)).toBeInTheDocument()
  })

  it('cada formulario lleva su evento y su sección, para que la acción sepa qué guardar', () => {
    const { container } = render(
      <ContentBlockForms ejemplo={{}} pinta={TODO} content={{}} eventId="e1" eventSlug="boda-demo" media={SIN_IMAGENES} sections={['music']} />,
    )
    expect(container.querySelector('input[name="eventId"]')).toHaveValue('e1')
    expect(container.querySelector('input[name="eventSlug"]')).toHaveValue('boda-demo')
    expect(container.querySelector('input[name="section"]')).toHaveValue('music')
  })

  it('pinta un campo por dato, con lo que el evento ya tiene escrito', () => {
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ music: { track: 'At Last', artist: 'Etta James' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['music']}
      />,
    )
    expect(screen.getByLabelText('Título de la canción')).toHaveValue('At Last')
    expect(screen.getByLabelText('Artista')).toHaveValue('Etta James')
  })

  it('lo que se escribe en un campo es lo que se enviaría a guardar', () => {
    const { container } = render(
      <ContentBlockForms ejemplo={{}} pinta={TODO} content={{}} eventId="e1" eventSlug="b" media={SIN_IMAGENES} sections={['music']} />,
    )

    fireEvent.change(screen.getByLabelText('Título de la canción'), { target: { value: 'Perfect' } })

    expect(valorEnviado(container)).toEqual({ track: 'Perfect' })
  })

  it('añade, mueve y quita una fila del itinerario sin tocar las demás', () => {
    const { container } = render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{
          itinerary: [
            { time: '16:00 h', label: 'Ceremonia' },
            { time: '18:00 h', label: 'Cena' },
          ],
        }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['itinerary']}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bajar momento 1' }))
    expect(valorEnviado(container)).toEqual([
      { time: '18:00 h', label: 'Cena' },
      { time: '16:00 h', label: 'Ceremonia' },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Quitar momento 2' }))
    expect(valorEnviado(container)).toEqual([{ time: '18:00 h', label: 'Cena' }])

    fireEvent.click(screen.getByRole('button', { name: 'Añadir momento' }))
    fireEvent.change(screen.getByLabelText('Hora · momento 2'), { target: { value: '22:00 h' } })
    fireEvent.change(screen.getByLabelText('Qué pasa · momento 2'), { target: { value: 'Baile' } })
    expect(valorEnviado(container)).toEqual([
      { time: '18:00 h', label: 'Cena' },
      { time: '22:00 h', label: 'Baile' },
    ])
  })

  it('no deja añadir más filas de las que el dominio guarda', () => {
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ notes: [{ title: 'a' }, { title: 'b' }, { title: 'c' }, { title: 'd' }] }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['notes']}
      />,
    )
    // El tope es cuatro: un formulario que admite la quinta y un dominio que la descarta
    // al guardar deja al atelier viendo desaparecer lo que acaba de escribir.
    expect(screen.getByRole('button', { name: 'Añadir aviso' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar aviso 4' }))
    expect(screen.getByRole('button', { name: 'Añadir aviso' })).toBeEnabled()
  })

  it('los anfitriones se escriben por su papel: padre, madre y cada padrino con su nombre', () => {
    const { container } = render(
      <ContentBlockForms
        anfitriones="xv"
        ejemplo={{}} pinta={TODO}
        content={{ hosts: { label: 'PADRES', names: ['Ana'] } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['hosts']}
      />,
    )

    // Lo guardado antes de los papeles se lee por posición: el primero era el padre.
    expect(screen.getByLabelText('Nombre del padre')).toHaveValue('Ana')
    fireEvent.change(screen.getByLabelText('Nombre de la madre'), { target: { value: 'Rosa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir padrino o madrina' }))
    fireEvent.change(screen.getByLabelText('Padrino o madrina 1'), { target: { value: 'Luis' } })

    expect(valorEnviado(container)).toEqual({ label: 'PADRES', roles: { father: 'Ana', mother: 'Rosa', godparents: ['Luis'] } })
  })

  it('en una boda pide los padres de cada novio', () => {
    render(
      <ContentBlockForms anfitriones="boda" ejemplo={{}} pinta={TODO} content={{}} eventId="e1" eventSlug="b" media={SIN_IMAGENES} sections={['hosts']} />,
    )
    for (const rotulo of ['Padre de la novia', 'Madre de la novia', 'Padre del novio', 'Madre del novio']) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument()
    }
  })


  it('la fotografía se elige de las del evento, no pegando su identificador', () => {
    const { container } = render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ gallery: [{ label: 'ANILLOS' }] }}
        eventId="e1"
        eventSlug="b"
        media={[{ id: 'img-1', originalName: 'anillos.jpg', byteSize: 2048, contentType: 'image/jpeg', fromGuest: false }]}
        sections={['gallery']}
      />,
    )

    // Se elige mirándola: una miniatura por fotografía, no un desplegable de nombres de archivo.
    const selector = screen.getByRole('group', { name: 'Fotografía · casilla 1' })
    fireEvent.click(within(selector).getByRole('button', { name: 'Usar anillos.jpg' }))

    expect(valorEnviado(container)).toEqual([{ label: 'ANILLOS', imageId: 'img-1' }])
    expect(within(selector).getByRole('button', { name: 'Usar anillos.jpg' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('conserva una fotografía que ya no está entre las del evento, en vez de borrarla al abrir', () => {
    // Descartarla en silencio cambiaría la invitación por el mero hecho de abrir el
    // formulario, y el atelier no se enteraría hasta verla rota.
    const { container } = render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ gallery: [{ label: 'ANILLOS', imageId: 'borrada' }] }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['gallery']}
      />,
    )
    expect(within(screen.getByRole('group', { name: 'Fotografía · casilla 1' })).getByRole('button', { name: 'Usar la fotografía guardada' })).toHaveAttribute('aria-pressed', 'true')
    expect(valorEnviado(container)).toEqual([{ label: 'ANILLOS', imageId: 'borrada' }])
  })

  it('la música se elige entre los MP3 subidos, y no ofrece las fotografías', () => {
    // El fallo silencioso de esta rebanada: fotografías y música viven en la misma tabla,
    // así que sin filtrar por tipo el selector ofrece un retrato como canción. Compila,
    // se guarda, y lo que suena en la invitación es un JPEG — o sea, nada.
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ music: { track: 'At Last' } }}
        eventId="e1"
        eventSlug="b"
        media={[
          { id: 'img-1', originalName: 'anillos.jpg', byteSize: 2048, contentType: 'image/jpeg', fromGuest: false },
          { id: 'mp3-1', originalName: 'nuestra-cancion.mp3', byteSize: 900_000, contentType: 'audio/mpeg', fromGuest: false },
        ]}
        sections={['music']}
      />,
    )

    const campo = screen.getByLabelText('Archivo que suena')
    const opciones = [...campo.querySelectorAll('option')].map((opcion) => opcion.textContent)

    expect(opciones).toContain('nuestra-cancion.mp3')
    expect(opciones).not.toContain('anillos.jpg')
  })

  it('el icono del itinerario no ofrece las fotografías del evento', () => {
    // `imageId` es ahí la clave del dibujo que trae el diseño —`church`, `flutes`—, no una
    // fotografía: ofrecerlas pondría el retrato de la novia donde va la campana.
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ itinerary: [{ time: '16:00 h', label: 'Ceremonia', imageId: 'church' }] }}
        eventId="e1"
        eventSlug="b"
        media={[{ id: 'img-1', originalName: 'anillos.jpg', byteSize: 2048, contentType: 'image/jpeg', fromGuest: false }]}
        sections={['itinerary']}
      />,
    )
    const campo = screen.getByLabelText('Icono · momento 1')
    expect(campo.tagName).toBe('INPUT')
    expect(campo).toHaveValue('church')
  })

  it('vaciar todos los campos es como se quita una sección', () => {
    const { container } = render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ music: { track: 'At Last' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['music']}
      />,
    )

    fireEvent.change(screen.getByLabelText('Título de la canción'), { target: { value: '' } })

    expect(valorEnviado(container)).toEqual({})
  })

  it('la fecha y la hora van por separado, con la piel del panel y no la del navegador', () => {
    const { container } = render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ schedule: { startsAt: '2026-10-18T16:00:00' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['schedule']}
      />,
    )
    // El calendario del navegador pintaba «10/17/2026» y los meses en inglés. El campo dice la
    // fecha con todas sus letras y el calendario es el del panel; la hora, en medias horas.
    const fecha = screen.getByRole('button', { name: 'Fecha y hora exactas' })
    expect(fecha).toHaveTextContent(/domingo, 18 de octubre de 2026/i)
    expect(screen.getByLabelText('Hora')).toHaveValue('16:00')

    fireEvent.click(fecha)
    fireEvent.click(screen.getByRole('button', { name: /sábado, 24 de octubre de 2026/i }))
    expect(valorEnviado(container)).toEqual({ startsAt: '2026-10-24T16:00' })
  })

  it('cada bloque se guarda por su cuenta, con su propio valor', () => {
    const { container } = render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ music: { track: 'At Last' }, quote: { text: 'para siempre' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['music', 'quote']}
      />,
    )
    const formularios = container.querySelectorAll('form')
    expect(formularios).toHaveLength(2)
    const primero = formularios[0] as HTMLElement
    expect(within(primero).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(valorEnviado(primero)).toEqual({ track: 'At Last' })
  })

  it('cada sección es una tarjeta que se abre de una en una, empezando por la que falta', () => {
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ hero: { nameA: 'Loreley', eyebrow: 'MIS QUINCE' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['hero', 'quote']}
      />,
    )

    const portada = screen.getByRole('button', { name: 'Portada y nombres' })
    const frase = screen.getByRole('button', { name: 'Frase' })
    expect(frase).toHaveAttribute('aria-expanded', 'true')
    expect(portada).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(portada)
    expect(portada).toHaveAttribute('aria-expanded', 'true')
    expect(frase).toHaveAttribute('aria-expanded', 'false')
  })

  it('plegada, la tarjeta dice en palabras si está lista y qué tiene escrito', () => {
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ hero: { nameA: 'Loreley', eyebrow: 'MIS QUINCE' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['hero', 'quote']}
      />,
    )

    expect(screen.getByText('1 de 2 secciones listas')).toBeInTheDocument()
    const portada = screen.getByRole('button', { name: 'Portada y nombres' })
    expect(portada).toHaveAccessibleDescription(/Listo/)
    expect(portada).toHaveAccessibleDescription(/MIS QUINCE · Loreley/)
    expect(screen.getByRole('button', { name: 'Frase' })).toHaveAccessibleDescription(/Por completar/)
  })

  it('abrir una sección le dice a la vista previa adónde ir, con lo que esa sección tiene escrito', () => {
    const avisos: unknown[] = []
    const oir = (e: Event) => avisos.push((e as CustomEvent).detail)
    window.addEventListener('invitacion:seccion', oir)
    render(
      <ContentBlockForms
        ejemplo={{}} pinta={TODO}
        content={{ reception: { place: 'Hacienda Las Estrellas' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['quote', 'reception']}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Recepción' }))
    window.removeEventListener('invitacion:seccion', oir)

    expect(avisos).toEqual([{ seccion: 'reception', textos: ['Hacienda Las Estrellas'] }])
  })
})
