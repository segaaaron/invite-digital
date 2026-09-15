import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentBlockForms } from './ContentBlockForms'

vi.mock('@/app/_acciones/events/actions', () => ({
  saveContentBlockAction: vi.fn(),
}))

const SIN_IMAGENES: never[] = []

/** Lo que la acción recibiría si se pulsara «Guardar» ahora mismo. */
const valorEnviado = (container: HTMLElement): unknown =>
  JSON.parse((container.querySelector('input[name="value"]') as HTMLInputElement).value)

describe('ContentBlockForms', () => {
  it('enseña un formulario por sección que el diseño pinta', () => {
    render(
      <ContentBlockForms
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
    render(<ContentBlockForms content={{}} eventId="e1" eventSlug="boda" media={SIN_IMAGENES} sections={['music']} />)
    expect(screen.queryByText('Itinerario')).not.toBeInTheDocument()
    expect(screen.queryByText('Código de vestimenta')).not.toBeInTheDocument()
  })

  it('si el servidor cambia la canción —al subir el archivo—, el bloque enseña la nueva', () => {
    // Sin esto el formulario seguía con el nombre de muestra, y guardarlo lo volvía a escribir.
    const props = { eventId: 'e1', eventSlug: 'b', media: SIN_IMAGENES, sections: ['music'] as const }
    const { container, rerender } = render(<ContentBlockForms {...props} content={{ music: { track: 'Tiempo de Vals', artist: 'Chayanne' } }} />)
    rerender(<ContentBlockForms {...props} content={{ music: { track: 'Mi Vals', artist: 'Cuarteto Andino' } }} />)
    expect(valorEnviado(container)).toMatchObject({ track: 'Mi Vals', artist: 'Cuarteto Andino' })
  })

  it('un diseño sin contenido editable lo dice, en vez de dejar la tarjeta vacía', () => {
    render(<ContentBlockForms content={{}} eventId="e1" eventSlug="boda" media={SIN_IMAGENES} sections={[]} />)
    expect(screen.getByText(/no lleva contenido editable/i)).toBeInTheDocument()
  })

  it('cada formulario lleva su evento y su sección, para que la acción sepa qué guardar', () => {
    const { container } = render(
      <ContentBlockForms content={{}} eventId="e1" eventSlug="boda-demo" media={SIN_IMAGENES} sections={['music']} />,
    )
    expect(container.querySelector('input[name="eventId"]')).toHaveValue('e1')
    expect(container.querySelector('input[name="eventSlug"]')).toHaveValue('boda-demo')
    expect(container.querySelector('input[name="section"]')).toHaveValue('music')
  })

  it('pinta un campo por dato, con lo que el evento ya tiene escrito', () => {
    render(
      <ContentBlockForms
        content={{ music: { track: 'At Last', artist: 'Etta James' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['music']}
      />,
    )
    expect(screen.getByLabelText('Canción')).toHaveValue('At Last')
    expect(screen.getByLabelText('Artista')).toHaveValue('Etta James')
  })

  it('lo que se escribe en un campo es lo que se enviaría a guardar', () => {
    const { container } = render(
      <ContentBlockForms content={{}} eventId="e1" eventSlug="b" media={SIN_IMAGENES} sections={['music']} />,
    )

    fireEvent.change(screen.getByLabelText('Canción'), { target: { value: 'Perfect' } })

    expect(valorEnviado(container)).toEqual({ track: 'Perfect' })
  })

  it('añade, mueve y quita una fila del itinerario sin tocar las demás', () => {
    const { container } = render(
      <ContentBlockForms
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

  it('la lista de anfitriones se edita nombre a nombre', () => {
    const { container } = render(
      <ContentBlockForms
        content={{ hosts: { label: 'PADRES', names: ['Ana'] } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['hosts']}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Añadir nombre' }))
    fireEvent.change(screen.getByLabelText('nombre 2'), { target: { value: 'Luis' } })

    expect(valorEnviado(container)).toEqual({ label: 'PADRES', names: ['Ana', 'Luis'] })
  })

  it('la fotografía se elige de las del evento, no pegando su identificador', () => {
    const { container } = render(
      <ContentBlockForms
        content={{ gallery: [{ label: 'ANILLOS' }] }}
        eventId="e1"
        eventSlug="b"
        media={[{ id: 'img-1', originalName: 'anillos.jpg', byteSize: 2048, contentType: 'image/jpeg', fromGuest: false }]}
        sections={['gallery']}
      />,
    )

    fireEvent.change(screen.getByLabelText('Fotografía · casilla 1'), { target: { value: 'img-1' } })

    expect(valorEnviado(container)).toEqual([{ label: 'ANILLOS', imageId: 'img-1' }])
  })

  it('conserva una fotografía que ya no está entre las del evento, en vez de borrarla al abrir', () => {
    // Descartarla en silencio cambiaría la invitación por el mero hecho de abrir el
    // formulario, y el atelier no se enteraría hasta verla rota.
    const { container } = render(
      <ContentBlockForms
        content={{ gallery: [{ label: 'ANILLOS', imageId: 'borrada' }] }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['gallery']}
      />,
    )
    expect(screen.getByLabelText('Fotografía · casilla 1')).toHaveValue('borrada')
    expect(valorEnviado(container)).toEqual([{ label: 'ANILLOS', imageId: 'borrada' }])
  })

  it('la música se elige entre los MP3 subidos, y no ofrece las fotografías', () => {
    // El fallo silencioso de esta rebanada: fotografías y música viven en la misma tabla,
    // así que sin filtrar por tipo el selector ofrece un retrato como canción. Compila,
    // se guarda, y lo que suena en la invitación es un JPEG — o sea, nada.
    render(
      <ContentBlockForms
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
        content={{ music: { track: 'At Last' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['music']}
      />,
    )

    fireEvent.change(screen.getByLabelText('Canción'), { target: { value: '' } })

    expect(valorEnviado(container)).toEqual({})
  })

  it('la fecha exacta se pide con un campo de fecha y hora', () => {
    render(
      <ContentBlockForms
        content={{ schedule: { startsAt: '2026-10-18T16:00:00' } }}
        eventId="e1"
        eventSlug="b"
        media={SIN_IMAGENES}
        sections={['schedule']}
      />,
    )
    const campo = screen.getByLabelText('Fecha y hora exactas')
    expect(campo).toHaveAttribute('type', 'datetime-local')
    expect(campo).toHaveValue('2026-10-18T16:00')
  })

  it('cada bloque se guarda por su cuenta, con su propio valor', () => {
    const { container } = render(
      <ContentBlockForms
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
})
