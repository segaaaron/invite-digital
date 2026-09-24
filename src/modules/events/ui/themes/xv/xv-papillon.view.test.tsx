import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './xv-papillon.content'
import { XvPapillonView } from './xv-papillon.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Papillon', () => {
  it('coloca las ranuras que pinta', () => {
    render(<XvPapillonView {...conMuestra()} />)
    for (const ranura of ['ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('escribe a la madre primero y a los padrinos aparte', () => {
    render(<XvPapillonView {...conMuestra()} />)
    expect(screen.getByText('Marcela Ríos & Fernando Ortega')).toBeInTheDocument()
    expect(screen.getByText('Rosa Delgado & Adrián Solís')).toBeInTheDocument()
  })

  it('cada hito del itinerario lleva su pieza rosa', () => {
    const { container } = render(<XvPapillonView {...conMuestra()} />)
    const piezas = [...container.querySelectorAll('li img')].map((img) => img.getAttribute('src') ?? '')
    expect(piezas.some((src) => src.includes('mascara-pinki'))).toBe(true)
    expect(screen.getByText('HORA LOCA')).toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<XvPapillonView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<XvPapillonView {...conMuestra()} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
