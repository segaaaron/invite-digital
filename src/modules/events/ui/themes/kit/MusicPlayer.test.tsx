import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MusicPlayer } from './MusicPlayer'

const props = { accent: 'currentColor', track: 'Perfect', artist: 'Ed Sheeran', eyebrow: 'Nuestra canción', playIconColor: 'currentColor', audioSrc: '/media/x' }

/** jsdom no reproduce: se simula un navegador que bloquea o permite, y se emiten los eventos. */
function simular(bloqueaAlInicio: boolean) {
  let intentos = 0
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(function (this: HTMLMediaElement) {
    return this.dataset.sonando !== '1'
  })
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    intentos += 1
    if (bloqueaAlInicio && intentos === 1) return Promise.reject(new DOMException('bloqueado', 'NotAllowedError'))
    this.dataset.sonando = '1'
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    this.dataset.sonando = '0'
    this.dispatchEvent(new Event('pause'))
  })
  return play
}

afterEach(() => vi.restoreAllMocks())

describe('MusicPlayer', () => {
  it('donde el navegador lo permite, suena al abrir sin tocar nada', async () => {
    const play = simular(false)
    render(<MusicPlayer {...props} />)
    await act(async () => {})
    expect(play).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Pausar Perfect' })).toBeInTheDocument()
  })

  it('si lo bloquea, arranca con el primer toque en cualquier parte', async () => {
    const play = simular(true)
    render(<MusicPlayer {...props} />)
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'Reproducir Perfect' })).toBeInTheDocument()

    await act(async () => void fireEvent.pointerDown(document.body))
    expect(play).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Pausar Perfect' })).toBeInTheDocument()
  })

  it('con «soloAlAbrir» no suena al montar: espera al toque que abre la portada', async () => {
    // El cumpleaños tapa la invitación con su portada hasta que el invitado la abre. Donde
    // el navegador permite el audio —un escritorio con historial de reproducción—, sin esto
    // la canción empezaba con la portada todavía puesta.
    const play = simular(false)
    render(<MusicPlayer {...props} soloAlAbrir />)
    await act(async () => {})
    expect(play).not.toHaveBeenCalled()

    await act(async () => void fireEvent.pointerDown(document.body))
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('tocar el propio botón como primer gesto lo enciende una vez, no lo apaga', async () => {
    simular(true)
    render(<MusicPlayer {...props} />)
    await act(async () => {})
    const boton = screen.getByRole('button', { name: 'Reproducir Perfect' })

    await act(async () => {
      fireEvent.pointerDown(boton)
      fireEvent.click(boton)
    })
    expect(screen.getByRole('button', { name: 'Pausar Perfect' })).toBeInTheDocument()
  })

  it('tras pausarla el usuario, ningún toque la vuelve a arrancar', async () => {
    const play = simular(false)
    render(<MusicPlayer {...props} />)
    await act(async () => {})
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Pausar Perfect' })))

    await act(async () => void fireEvent.pointerDown(document.body))
    expect(play).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Reproducir Perfect' })).toBeInTheDocument()
  })

  it('suena en bucle', () => {
    simular(false)
    const { container } = render(<MusicPlayer {...props} />)
    expect(container.querySelector('audio')?.loop).toBe(true)
  })
})
