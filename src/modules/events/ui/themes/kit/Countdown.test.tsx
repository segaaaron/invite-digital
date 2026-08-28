import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Countdown } from './Countdown'

const ROTULOS = { days: 'DÍAS', hours: 'HRS', mins: 'MIN', secs: 'SEG' }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-10T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Countdown', () => {
  it('pinta las cuatro casillas con su rótulo', () => {
    render(<Countdown labels={ROTULOS} targetISO="2026-09-12T19:00:00Z" />)

    expect(screen.getByText('DÍAS')).toBeInTheDocument()
    expect(screen.getByText('HRS')).toBeInTheDocument()
    expect(screen.getByText('MIN')).toBeInTheDocument()
    expect(screen.getByText('SEG')).toBeInTheDocument()
  })

  it('rellena las cifras a dos dígitos', () => {
    render(<Countdown labels={ROTULOS} targetISO="2026-09-12T19:00:00Z" />)

    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('07')).toBeInTheDocument()
  })

  it('avanza con el reloj', () => {
    // A un minuto vista: 00 días, 00 horas, 01 minutos, 00 segundos. Treinta segundos
    // después, los segundos tienen que decir 30.
    render(<Countdown labels={ROTULOS} targetISO="2026-09-10T12:01:00Z" />)
    const segundos = () => screen.getByText('SEG').previousElementSibling?.textContent

    expect(segundos()).toBe('00')
    expect(screen.getByText('01')).toBeInTheDocument()

    // Sin `act`, el intervalo dispara pero React no aplica el estado y la prueba lee el
    // valor anterior.
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(segundos()).toBe('30')
  })

  it('se queda en cero cuando la fecha pasó, sin cifras negativas', () => {
    render(<Countdown labels={ROTULOS} targetISO="2026-09-01T00:00:00Z" />)

    expect(screen.getAllByText('00')).toHaveLength(4)
  })

  it('los rótulos vienen de fuera, no del código', () => {
    // La invitación usa el idioma del evento, no el del navegador.
    render(
      <Countdown labels={{ days: 'DAYS', hours: 'HRS', mins: 'MIN', secs: 'SEC' }} targetISO="2026-09-12T19:00:00Z" />,
    )

    expect(screen.getByText('DAYS')).toBeInTheDocument()
    expect(screen.queryByText('DÍAS')).not.toBeInTheDocument()
  })
})
