import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GuestReply } from './GuestReply'

const es = { replyTitle: 'Respuesta de los anfitriones' }
const en = { replyTitle: 'A note back from the hosts' }

describe('GuestReply', () => {
  it('con respuesta, el invitado la ve bajo su mensaje', () => {
    render(<GuestReply dictionary={es} reply="Gracias, los esperamos con muchas ganas." />)

    expect(screen.getByText('Respuesta de los anfitriones')).toBeInTheDocument()
    expect(screen.getByText('Gracias, los esperamos con muchas ganas.')).toBeInTheDocument()
  })

  it('sin respuesta no pinta nada: ni un hueco vacío', () => {
    const { container } = render(<GuestReply dictionary={es} reply={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('el título viene del diccionario del evento, no del idioma del navegador', () => {
    render(<GuestReply dictionary={en} reply="Thank you." />)
    expect(screen.getByText('A note back from the hosts')).toBeInTheDocument()
  })
})
