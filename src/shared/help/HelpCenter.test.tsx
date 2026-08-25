import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BRAND } from '@/shared/config/brand'
import { HelpCenter } from './HelpCenter'
import { HELP_TOPICS, type HelpTopic } from './topics'

/** `noUncheckedIndexedAccess`: el índice puede no existir, y una prueba muda no vale. */
const tema = (indice: number): HelpTopic => {
  const encontrado = HELP_TOPICS[indice]
  if (!encontrado) throw new Error(`No hay pregunta en la posición ${indice}.`)
  return encontrado
}

describe('HelpCenter', () => {
  it('lista todas las preguntas', () => {
    render(<HelpCenter />)
    for (const topic of HELP_TOPICS) {
      expect(screen.getByRole('button', { name: topic.question })).toBeInTheDocument()
    }
  })

  it('las respuestas empiezan cerradas', () => {
    render(<HelpCenter />)
    const primera = tema(0)
    expect(screen.getByRole('button', { name: primera.question })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(primera.answer)).not.toBeInTheDocument()
  })

  it('cada pregunta se abre y se vuelve a cerrar', () => {
    render(<HelpCenter />)

    for (const topic of HELP_TOPICS) {
      const boton = screen.getByRole('button', { name: topic.question })

      fireEvent.click(boton)
      expect(boton).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText(topic.answer)).toBeInTheDocument()

      fireEvent.click(boton)
      expect(boton).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText(topic.answer)).not.toBeInTheDocument()
    }
  })

  it('abrir una pregunta no cierra la anterior: se pueden leer dos a la vez', () => {
    render(<HelpCenter />)
    const primera = tema(0)
    const segunda = tema(1)

    fireEvent.click(screen.getByRole('button', { name: primera.question }))
    fireEvent.click(screen.getByRole('button', { name: segunda.question }))

    expect(screen.getByText(primera.answer)).toBeInTheDocument()
    expect(screen.getByText(segunda.answer)).toBeInTheDocument()
  })

  it('el WhatsApp de contacto sale de brand.ts, no escrito a mano', () => {
    // Escribirlo a mano crearía una copia que `pnpm preflight` no puede ver, y el
    // marcador se iría a producción sin que la puerta de despliegue se enterase.
    render(<HelpCenter />)
    const enlace = screen.getByRole('link', { name: new RegExp(BRAND.whatsappDisplay.replace(/\+/g, '\\+')) })
    expect(enlace).toHaveAttribute('href', `https://wa.me/${BRAND.whatsapp.replace(/\D/g, '')}`)
  })

  it('el correo de contacto también sale de brand.ts', () => {
    render(<HelpCenter />)
    const enlace = screen.getByRole('link', { name: BRAND.email })
    expect(enlace).toHaveAttribute('href', `mailto:${BRAND.email}`)
  })
})

describe('HELP_TOPICS', () => {
  it('cubre lo que este panel hace de verdad', () => {
    const preguntas = HELP_TOPICS.map((t) => t.question.toLowerCase()).join(' · ')

    for (const tema of ['evento', 'enlace', 'puerta', 'mesa', 'regalo', 'plan']) {
      expect(preguntas).toContain(tema)
    }
  })

  it('ninguna pregunta se repite y ninguna respuesta está vacía', () => {
    expect(new Set(HELP_TOPICS.map((t) => t.question)).size).toBe(HELP_TOPICS.length)
    for (const topic of HELP_TOPICS) expect(topic.answer.trim().length).toBeGreaterThan(0)
  })
})

describe('HelpCenter · buscador', () => {
  it('filtra las preguntas por lo que se escribe', () => {
    render(<HelpCenter />)
    const antes = screen.getAllByRole('button', { expanded: false }).length

    fireEvent.change(screen.getByLabelText('Buscar en preguntas frecuentes'), { target: { value: 'zzzz' } })
    expect(screen.queryAllByRole('button', { expanded: false })).toHaveLength(0)
    expect(antes).toBeGreaterThan(0)
  })

  it('sin coincidencias lo dice y no deja la lista muda', () => {
    render(<HelpCenter />)
    fireEvent.change(screen.getByLabelText('Buscar en preguntas frecuentes'), { target: { value: 'zzzz' } })
    expect(screen.getByText(/ninguna pregunta coincide/i)).toBeInTheDocument()
  })

  it('busca también dentro de la respuesta, no solo en el título', () => {
    // Quien no sabe cómo se llama lo que busca escribe la palabra que recuerda del texto.
    const conLaPalabra = HELP_TOPICS.filter((t) => t.answer.toLocaleLowerCase().includes('cupo'))
    expect(conLaPalabra.length).toBeGreaterThan(0)

    render(<HelpCenter />)
    fireEvent.change(screen.getByLabelText('Buscar en preguntas frecuentes'), { target: { value: 'cupo' } })

    const visibles = screen.getAllByRole('button', { expanded: false })
    expect(visibles.length).toBeGreaterThan(0)
    expect(screen.queryByText(/ninguna pregunta coincide/i)).not.toBeInTheDocument()
  })
})
