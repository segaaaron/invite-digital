import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SelectorDeFecha } from './SelectorDeFecha'

describe('SelectorDeFecha', () => {
  it('se lee en español y con todas sus letras, no «10/17/2026»', () => {
    render(<SelectorDeFecha hoy="2026-09-16" id="f" onChange={() => {}} valor="2026-10-17" />)
    expect(screen.getByRole('button', { name: /sábado, 17 de octubre de 2026/i })).toBeInTheDocument()
  })

  it('sin fecha invita a elegirla', () => {
    render(<SelectorDeFecha hoy="2026-09-16" id="f" onChange={() => {}} valor="" />)
    expect(screen.getByRole('button', { name: /elige el día/i })).toBeInTheDocument()
  })

  it('abre el mes de la fecha, empieza la semana en lunes y marca el día elegido', () => {
    render(<SelectorDeFecha hoy="2026-09-16" id="f" onChange={() => {}} valor="2026-10-17" />)
    fireEvent.click(screen.getByRole('button', { name: /sábado, 17 de octubre/i }))

    const calendario = screen.getByRole('dialog', { name: 'Elegir fecha' })
    expect(within(calendario).getByText('octubre de 2026')).toBeInTheDocument()
    expect(within(calendario).getAllByRole('columnheader')[0]).toHaveTextContent('lu')
    expect(within(calendario).getByRole('button', { name: /sábado, 17 de octubre de 2026/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('elegir un día lo devuelve como YYYY-MM-DD y cierra', () => {
    const onChange = vi.fn()
    render(<SelectorDeFecha hoy="2026-09-16" id="f" onChange={onChange} valor="2026-10-17" />)
    fireEvent.click(screen.getByRole('button', { name: /sábado, 17 de octubre/i }))
    fireEvent.click(screen.getByRole('button', { name: /martes, 20 de octubre de 2026/i }))

    expect(onChange).toHaveBeenCalledWith('2026-10-20')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('cambia de mes, y sin fecha abre en el mes de hoy', () => {
    render(<SelectorDeFecha hoy="2026-09-16" id="f" onChange={() => {}} valor="" />)
    fireEvent.click(screen.getByRole('button', { name: /elige el día/i }))
    expect(screen.getByText('septiembre de 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByText('octubre de 2026')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByText('agosto de 2026')).toBeInTheDocument()
  })

  it('Escape cierra sin cambiar nada', () => {
    const onChange = vi.fn()
    render(<SelectorDeFecha hoy="2026-09-16" id="f" onChange={onChange} valor="2026-10-17" />)
    fireEvent.click(screen.getByRole('button', { name: /sábado, 17 de octubre/i }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
