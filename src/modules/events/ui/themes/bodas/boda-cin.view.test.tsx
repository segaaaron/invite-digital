import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './boda-cin.content'
import { BodaCinView } from './boda-cin.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Cinemática', () => {
  it('coloca las cinco ranuras', () => {
    render(<BodaCinView {...conMuestra()} />)
    for (const ranura of ['ranura-invitado', 'ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('parte la cita en titular, firma y columna con capitular', () => {
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.getByText('que me miraste."')).toBeInTheDocument()
    expect(screen.getByText('— DIEGO')).toBeInTheDocument()
    expect(screen.getByText(/os conocimos en una noche/)).toBeInTheDocument()
  })

  it('el itinerario alterna de lado sobre el eje, con su icono', () => {
    const { container } = render(<BodaCinView {...conMuestra()} />)
    expect(screen.getByText('Ceremonia').parentElement?.style.textAlign).toBe('right')
    expect(screen.getByText('Recepción Social', { selector: 'li div' }).parentElement?.style.textAlign).toBe('left')
    const srcs = [...container.querySelectorAll('li img')].map((img) => img.getAttribute('src') ?? '')
    expect(srcs.some((src) => src.includes('copas-black'))).toBe(true)
    expect(srcs.some((src) => src.includes('auto-dorado'))).toBe(true)
  })

  it('sin canción no pinta reproductor: la maqueta no lo tiene', () => {
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.queryByText('La canción de la noche')).not.toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<BodaCinView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
