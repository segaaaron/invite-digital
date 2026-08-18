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
  it('rotula todos los campos y marca el nombre como obligatorio', () => {
    state.current = { status: 'idle', message: '' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    expect(screen.getByLabelText(/Nombre/)).toBeRequired()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/WhatsApp/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipo de evento/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fecha del evento/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Cuéntanos sobre tu evento/)).toBeInTheDocument()
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

  it('culpa a los dos campos de contacto cuando falta cualquiera de ellos', () => {
    state.current = { status: 'error', message: 'missing_contact' }
    render(<ConsultationForm categories={categories} dictionary={dictionary} locale="es" />)

    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/WhatsApp/)).toHaveAttribute('aria-invalid', 'true')
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
