import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnVivo } from './EnVivo'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

/** Un `EventSource` de mentira: la prueba decide cuándo abre, cuándo llega un aviso y cuándo cae. */
class FuenteFalsa {
  static CLOSED = 2
  static ultima: FuenteFalsa | null = null
  readyState = 0
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  cerrada = false
  private oyentes: Array<(e: MessageEvent<string>) => void> = []
  constructor(readonly url: string) {
    FuenteFalsa.ultima = this
  }
  addEventListener(_tipo: string, oyente: (e: MessageEvent<string>) => void) {
    this.oyentes.push(oyente)
  }
  close() {
    this.cerrada = true
  }
  avisar(tipo: string) {
    for (const o of this.oyentes) o(new MessageEvent('cambio', { data: JSON.stringify({ tipo }) }))
  }
}

beforeEach(() => {
  refresh.mockClear()
  vi.stubGlobal('EventSource', FuenteFalsa)
})
afterEach(() => vi.unstubAllGlobals())

describe('EnVivo', () => {
  it('en la puerta (auto), cada ingreso vuelve a pintar la pantalla', () => {
    render(<EnVivo modo="auto" oculto tipos={['ingreso']} url="/p/tok/en-vivo" />)
    expect(FuenteFalsa.ultima?.url).toBe('/p/tok/en-vivo')
    act(() => FuenteFalsa.ultima!.avisar('ingreso'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('en el panel (aviso), no repinta solo: enseña «N novedades · Ver» y actualiza al pulsar', () => {
    render(<EnVivo modo="aviso" tipos={['rsvp']} url="/panel/eventos/boda/en-vivo" />)
    act(() => {
      FuenteFalsa.ultima!.onopen?.()
      FuenteFalsa.ultima!.avisar('rsvp')
      FuenteFalsa.ultima!.avisar('rsvp')
    })
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByText('En vivo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '2 novedades · Ver' }))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument()
  })

  it('ignora los tipos que no le importan a la pantalla, pero no el «ponte al día»', () => {
    render(<EnVivo modo="auto" oculto tipos={['rsvp']} url="/x" />)
    act(() => FuenteFalsa.ultima!.avisar('visita'))
    expect(refresh).not.toHaveBeenCalled()
    act(() => FuenteFalsa.ultima!.avisar('resync'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('si la conexión no tiene vuelta, lo dice y deja «Actualizar»', () => {
    render(<EnVivo modo="aviso" tipos={['rsvp']} url="/x" />)
    act(() => {
      FuenteFalsa.ultima!.readyState = FuenteFalsa.CLOSED
      FuenteFalsa.ultima!.onerror?.()
    })
    expect(screen.getByText('Sin actualización automática')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('al salir de la pantalla cierra la conexión', () => {
    const { unmount } = render(<EnVivo modo="auto" oculto tipos={['ingreso']} url="/x" />)
    const fuente = FuenteFalsa.ultima!
    unmount()
    expect(fuente.cerrada).toBe(true)
  })
})
