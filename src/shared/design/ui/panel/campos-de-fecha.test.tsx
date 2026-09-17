import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CampoFecha, CampoFechaYHora, CampoHora } from './campos-de-fecha'

const valorDe = (container: HTMLElement, name: string) => (container.querySelector(`[name="${name}"]`) as HTMLInputElement).value

/** Los formularios del panel envían por `name`: el calendario elegante tiene que enviar lo mismo que el nativo. */
describe('campos de fecha para formularios', () => {
  it('la fecha se elige en el calendario del panel y se envía como YYYY-MM-DD', () => {
    const { container } = render(<CampoFecha defaultValue="2026-10-17" hoy="2026-09-16" id="f" name="dueDate" />)
    expect(valorDe(container, 'dueDate')).toBe('2026-10-17')
    fireEvent.click(screen.getByRole('button', { name: /sábado, 17 de octubre/i }))
    fireEvent.click(screen.getByRole('button', { name: /martes, 20 de octubre de 2026/i }))
    expect(valorDe(container, 'dueDate')).toBe('2026-10-20')
  })

  it('la hora es un desplegable con su nombre, de cuarto en cuarto, y conserva una hora suelta', () => {
    const { container } = render(<CampoHora defaultValue="19:07" id="h" name="startsAt" />)
    const hora = screen.getByRole('combobox')
    expect(hora).toHaveValue('19:07')
    expect(screen.getByRole('option', { name: '19:15' })).toBeInTheDocument()
    expect(valorDe(container, 'startsAt')).toBe('19:07')
  })

  it('fecha y hora juntas viajan como YYYY-MM-DDTHH:mm', () => {
    const { container } = render(<CampoFechaYHora defaultValue="2026-10-17T19:00" id="fh" name="date" />)
    expect(valorDe(container, 'date')).toBe('2026-10-17T19:00')
  })
})
