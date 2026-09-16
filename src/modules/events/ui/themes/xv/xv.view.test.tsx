import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './xv.content'
import { XvView } from './xv.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Bajo el Mar', () => {
  it('coloca las cinco ranuras', () => {
    render(<XvView {...conMuestra()} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('pinta los dos avisos sueltos en su propia tarjeta', () => {
    // «Lluvia de Sobres» y «Solo Adultos» son de este diseño y de varios más; por eso el
    // contenido los guarda como lista y no como campos con nombre.
    render(<XvView {...conMuestra()} />)
    expect(screen.getByText('Lluvia de Sobres')).toBeInTheDocument()
    expect(screen.getByText('Solo Adultos')).toBeInTheDocument()
  })

  it('pinta el cronograma con sus cuatro hitos', () => {
    render(<XvView {...conMuestra()} />)
    for (const fila of CONTENIDO_DE_MUESTRA.itinerary ?? []) {
      expect(screen.getByText(fila.label), fila.label).toBeInTheDocument()
    }
  })

  it('compone el día, el mes y la hora de la fecha del evento', () => {
    render(<XvView {...conMuestra()} />)
    // «19:00» sale dos veces: la fecha destacada y la hora de la recepción. Se busca la de
    // la fecha por su tamaño, que es lo que la distingue en el diseño.
    // `getAllByText`: el «12» del día coincide con la cuenta atrás cuando el reloj deja
    // doce horas o doce minutos para el evento, y esta prueba se caía sola según el día en
    // que se corriera.
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getByText(/septiembre/i)).toBeInTheDocument()
    const horas = screen.getAllByText('19:00')
    expect(horas.some((nodo) => nodo.style.fontSize === '56px')).toBe(true)
  })

  it('pinta a los padres con su dedicatoria', () => {
    render(<XvView {...conMuestra()} />)
    expect(screen.getByText('Angel Pereira Rojas')).toBeInTheDocument()
    expect(screen.getByText('Ivana Torrico Valencia')).toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<XvView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<XvView {...conMuestra()} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('pinta a los padrinos aparte, bajo su propio rótulo, y a los padres arriba', () => {
    render(
      <XvView
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
    render(<XvView {...propsDePrueba({ content: { hosts: { label: 'Mis padres', names: ['Angel'], roles: { father: 'Angel' } } } })} />)
    expect(screen.queryByText('PADRINOS')).toBeNull()
  })

  it('sin los textos de arriba, la barra conserva su alto: el titular no sube al borde', () => {
    render(<XvView {...propsDePrueba({ content: { hero: { nameA: 'Loreley' } } })} />)
    const barra = screen.getByTestId('xv-barra-superior')
    expect(barra.style.minHeight).not.toBe('')
  })

  it('sin frase no hay corona, y el retrato no sube a pisar el nombre', () => {
    const { container } = render(<XvView {...propsDePrueba({ content: { hero: { nameA: 'Loreley' }, gallery: [{ label: 'Retrato', imageId: 'foto' }] } })} />)
    const marco = container.querySelector<HTMLElement>('[data-retrato]')
    expect(marco?.style.margin).toBe('40px auto 0px')
  })
})
