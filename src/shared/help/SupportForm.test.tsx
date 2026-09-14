import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SupportForm, supportMessage } from './SupportForm'

const contacto = { numero: '+59170012345', visible: '+591 700 12345', saludo: 'Hola, necesito ayuda.' }

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
    render(<SupportForm contacto={contacto} />)
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mensaje')).toBeInTheDocument()
  })

  it('sin mensaje no deja enviar: un soporte en blanco no es una consulta', () => {
    render(<SupportForm contacto={contacto} />)
    expect(screen.getByRole('link', { name: /enviar por whatsapp/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('el enlace lleva el mensaje escrito, porque no se manda solo', () => {
    render(<SupportForm contacto={contacto} />)
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'No veo mis mesas' } })

    const href = screen.getByRole('link', { name: /enviar por whatsapp/i }).getAttribute('href') ?? ''
    expect(decodeURIComponent(href)).toContain('No veo mis mesas')
  })

  it('sin WhatsApp configurado no hay enlace que pulsar', () => {
    render(<SupportForm contacto={{ ...contacto, numero: '' }} />)
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'hola' } })
    // Sin href un <a> deja de ser enlace: no hay nada que pulsar.
    const boton = screen.getByText(/enviar por whatsapp/i)
    expect(boton).not.toHaveAttribute('href')
    expect(boton).toHaveAttribute('aria-disabled', 'true')
  })

  it('dice que lo envía la persona, no el sistema', () => {
    render(<SupportForm contacto={contacto} />)
    expect(screen.getByText(/nada se manda solo/i)).toBeInTheDocument()
  })
})
