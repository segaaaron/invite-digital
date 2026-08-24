import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DoorModeCard } from './DoorModeCard'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

describe('DoorModeCard', () => {
  it('es la tarjeta de recepción de la maqueta, con su nombre y su descripción', () => {
    render(<DoorModeCard href="/panel/eventos/boda/puerta" />)
    expect(screen.getByText('Modo puerta')).toBeInTheDocument()
    expect(screen.getByText(/recepción/i)).toBeInTheDocument()
  })

  it('«Cómo funciona» está plegado hasta que alguien lo abre', async () => {
    render(<DoorModeCard href="/panel/eventos/boda/puerta" />)
    const detalle = screen.getByText('Cómo funciona').closest('details') as HTMLDetailsElement
    expect(detalle.open).toBe(false)
    fireEvent.click(screen.getByText('Cómo funciona'))
    expect(detalle.open).toBe(true)
  })

  it('sin cámara no abre el escáner: lo dice y se queda', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices: async () => [{ kind: 'audioinput' }] },
    })

    render(<DoorModeCard href="/panel/eventos/boda/puerta" />)
    fireEvent.click(screen.getByRole('button', { name: /abrir modo puerta/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no tiene cámara/i)
  })
})
