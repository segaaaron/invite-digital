import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import type { ConsultationActionState } from '../actions'
import { ConsultationForm } from './ConsultationForm'

const dictionary = getDictionary('es')
const categories = [
  { slug: 'boda', name: 'Boda', sortOrder: 1 },
  { slug: 'xv', name: 'XV años', sortOrder: 2 },
]

const state = vi.hoisted(() => ({ current: { status: 'idle', message: '' } as ConsultationActionState }))

vi.mock('react', async () => {
  const react = await vi.importActual<typeof import('react')>('react')
  return {
    ...react,
    useActionState: () => [state.current, vi.fn(), false] as const,
  }
})

describe('ConsultationForm', () => {
  it('pide nombre y apellido por separado, como la maqueta', () => {
    state.current = { status: 'idle', message: '' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    expect(screen.getByLabelText(/^Nombre/)).toBeRequired()
    expect(screen.getByLabelText(/Apellido/)).toBeRequired()
    expect(screen.getByLabelText(/Correo electrónico/)).toBeRequired()
    expect(screen.getByLabelText(/Tipo de evento/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fecha del evento/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Cuéntanos sobre tu evento/)).toBeInTheDocument()
  })

  it('los rótulos van dentro del campo, y siguen existiendo para el lector de pantalla', () => {
    // La maqueta no pinta etiquetas encima: el propio campo dice qué se escribe. Quitar
    // la etiqueta del DOM dejaría el formulario mudo para quien no ve el marcador.
    state.current = { status: 'idle', message: '' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    const nombre = screen.getByLabelText(/^Nombre/)
    expect(nombre).toHaveAttribute('placeholder', expect.stringContaining('Nombre'))
  })

  it('el nombre que se guarda junta nombre y apellido', () => {
    // El dominio guarda un nombre completo; la maqueta lo pide en dos campos. Se unen al
    // enviar en vez de partir la tabla en dos columnas.
    state.current = { status: 'idle', message: '' }
    const { container } = render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Marcia' } })
    fireEvent.change(screen.getByLabelText(/Apellido/), { target: { value: 'Rojas Peña' } })

    expect(container.querySelector('input[name="name"]')).toHaveValue('Marcia Rojas Peña')
  })

  it('envía el idioma en un campo oculto y ofrece cada categoría', () => {
    state.current = { status: 'idle', message: '' }
    const { container } = render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    expect(container.querySelector('input[name="locale"]')).toHaveValue('es')
    expect(screen.getByRole('option', { name: 'Boda' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'XV años' })).toBeInTheDocument()
  })

  it('traduce el error devuelto por la acción y lo anuncia', () => {
    state.current = { status: 'error', message: 'missing_contact' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(dictionary.contact.errors.missing_contact)
  })

  it('asocia el error al campo culpable y no a los demás', () => {
    state.current = { status: 'error', message: 'past_event_date' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    expect(screen.getByLabelText(/Fecha del evento/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Nombre/)).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText(/Nombre/)).not.toHaveAttribute('aria-describedby')
  })

  it('culpa al correo cuando falta el contacto', () => {
    // El formulario de la maqueta no pide teléfono: el correo es el único camino de
    // vuelta, y por eso es obligatorio.
    state.current = { status: 'error', message: 'missing_contact' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    expect(screen.getByLabelText(/Correo electrónico/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('reemplaza el formulario por el acuse cuando la consulta se guarda', () => {
    state.current = { status: 'success', message: '' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    expect(screen.getByText(dictionary.contact.successTitle)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Nombre/)).not.toBeInTheDocument()
  })

  it('devuelve el formulario al pulsar "enviar otra"', () => {
    state.current = { status: 'success', message: '' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    fireEvent.click(screen.getByRole('button', { name: dictionary.contact.again }))

    expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument()
    expect(screen.queryByText(dictionary.contact.successTitle)).not.toBeInTheDocument()
  })
})
