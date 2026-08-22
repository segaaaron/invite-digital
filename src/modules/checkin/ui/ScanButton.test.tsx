import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ScanButton } from './ScanButton'

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

function conCamara(hay: boolean) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: hay
      ? { enumerateDevices: async () => [{ kind: 'videoinput', deviceId: 'cam' }] }
      : { enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'mic' }] },
  })
}

describe('ScanButton', () => {
  it('con cámara, abre el modo puerta', async () => {
    conCamara(true)
    render(<ScanButton href="/panel/eventos/boda/puerta" />)
    fireEvent.click(screen.getByRole('button', { name: /escanear/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/panel/eventos/boda/puerta'))
  })

  it('sin cámara, lo dice y no abre nada', async () => {
    push.mockClear()
    conCamara(false)
    render(<ScanButton href="/panel/eventos/boda/puerta" />)
    fireEvent.click(screen.getByRole('button', { name: /escanear/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no tiene cámara/i))
    expect(push).not.toHaveBeenCalled()
  })

  it('en un navegador sin acceso a dispositivos, tampoco promete lo que no puede', async () => {
    push.mockClear()
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    render(<ScanButton href="/panel/eventos/boda/puerta" />)
    fireEvent.click(screen.getByRole('button', { name: /escanear/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no tiene cámara/i))
    expect(push).not.toHaveBeenCalled()
  })
})
