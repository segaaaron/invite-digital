import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SupportForm, supportMessage } from './SupportForm'

describe('supportMessage', () => {
  it('mete quién escribe y su correo en el propio texto', () => {
    const texto = supportMessage({ name: 'Miguel', email: 'miki@correo.bo', message: 'No veo mis mesas' })
    expect(texto).toContain('Miguel')
    expect(texto).toContain('miki@correo.bo')
    expect(texto).toContain('No veo mis mesas')
  })

  it('sin nombre lo dice en vez de dejar un hueco raro', () => {
    expect(supportMessage({ name: '  ', email: '', message: 'hola' })).toContain('sin nombre')
  })
})

describe('SupportForm', () => {
  it('trae los tres campos de la maqueta', () => {
    render(<SupportForm />)
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mensaje')).toBeInTheDocument()
  })

  it('sin mensaje no deja enviar: un soporte en blanco no es una consulta', () => {
    render(<SupportForm />)
    expect(screen.getByRole('link', { name: /enviar por whatsapp/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('el enlace lleva el mensaje escrito, porque no se manda solo', () => {
    render(<SupportForm />)
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'No veo mis mesas' } })

    const href = screen.getByRole('link', { name: /enviar por whatsapp/i }).getAttribute('href') ?? ''
    expect(decodeURIComponent(href)).toContain('No veo mis mesas')
  })

  it('dice que lo envía la persona, no el sistema', () => {
    render(<SupportForm />)
    expect(screen.getByText(/nada se manda solo/i)).toBeInTheDocument()
  })
})
