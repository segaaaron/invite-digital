import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnVivo } from './EnVivo'

const refresh = vi.fn()
// Estable, como el de Next: un objeto nuevo por render reabriría la conexión en cada repintado.
const router = { refresh }
vi.mock('next/navigation', () => ({ useRouter: () => router }))

/** Un `EventSource` de mentira: la prueba decide cuándo abre, cuándo llega un aviso y cuándo cae. */
class FuenteFalsa {
  static CLOSED = 2
  static ultima: FuenteFalsa | null = null
  readyState = 0
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  cerrada = false
  private oyentes: Array<(e: MessageEvent<string>) => void> = []
  static abiertas = 0
  constructor(readonly url: string) {
    FuenteFalsa.ultima = this
    FuenteFalsa.abiertas += 1
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
  /** Un aviso tal cual, para probar lo que no es JSON. */
  avisarCrudo(data: string) {
    for (const o of this.oyentes) o(new MessageEvent('cambio', { data }))
  }
}

beforeEach(() => {
  refresh.mockClear()
  FuenteFalsa.abiertas = 0
  vi.stubGlobal('EventSource', FuenteFalsa)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('EnVivo', () => {
  it('en la puerta (auto), cada ingreso vuelve a pintar la pantalla', () => {
    render(<EnVivo modo="auto" oculto tipos={['ingreso']} url="/p/tok/en-vivo" />)
    expect(FuenteFalsa.ultima?.url).toBe('/p/tok/en-vivo')
    act(() => FuenteFalsa.ultima!.avisar('ingreso'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('en el panel (aviso), no repinta solo: enseña «N novedades · Ver» y actualiza al pulsar', () => {
    render(<EnVivo modo="aviso" tipos={['rsvp']} url="/dashboard/events/boda/live" />)
    act(() => {
      FuenteFalsa.ultima!.onopen?.()
      FuenteFalsa.ultima!.avisar('rsvp')
      FuenteFalsa.ultima!.avisar('rsvp')
    })
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByText('En vivo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '2 novedades · Ver' }))
    expect(refresh).toHaveBeenCalledTimes(1)
    // Sin novedades no queda nada pintado: la píldora en reposo tapaba contenido (16 oct).
    expect(screen.queryByRole('button', { name: 'Actualizar' })).toBeNull()
    expect(document.querySelector('[data-en-vivo="en-vivo"]')).not.toBeNull()
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

  // La puerta lleva `oculto`: no pinta nada para no estorbar en pantalla completa. Pero si el canal
  // se cae, deja de ver lo de las otras puertas y de enterarse de las invitaciones devueltas o
  // revocadas, y antes no había ni una señal de eso (decisión abierta del 19 oct).
  it('aun oculta, una conexión caída se canta: es la única señal de que la puerta se quedó sorda', () => {
    render(<EnVivo modo="auto" oculto tipos={['ingreso', 'invitado']} url="/p/tok/en-vivo" />)
    expect(screen.queryByText('Sin actualización automática')).toBeNull()

    act(() => {
      FuenteFalsa.ultima!.readyState = FuenteFalsa.CLOSED
      FuenteFalsa.ultima!.onerror?.()
    })

    expect(screen.getByText('Sin actualización automática')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(refresh).toHaveBeenCalled()
  })

  /**
   * `CLOSED` es el caso **raro**. Lo que pasa cuando se cae el servidor o se corta la red es
   * `CONNECTING`, con el navegador reintentando él solo, y eso pintaba lo mismo que el arranque:
   * nada. La pantalla se quedaba pareciendo al día en el caso frecuente.
   */
  it('una reconexión que no vuelve también se canta, pasado el rato', () => {
    vi.useFakeTimers()
    try {
      render(<EnVivo modo="aviso" tipos={['rsvp']} url="/x" />)
      act(() => {
        // Reconectando (`readyState` sigue en 0, no en CLOSED).
        FuenteFalsa.ultima!.onerror?.()
      })
      // Al principio se calla: el navegador suele volver en uno o dos segundos y una chapa que
      // aparece en cada bache sería peor que no tenerla.
      expect(screen.queryByText('Sin actualización automática')).toBeNull()

      act(() => void vi.advanceTimersByTime(9000))
      expect(screen.getByText('Sin actualización automática')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('y si vuelve antes, no se canta nada', () => {
    vi.useFakeTimers()
    try {
      render(<EnVivo modo="aviso" tipos={['rsvp']} url="/x" />)
      act(() => {
        FuenteFalsa.ultima!.onerror?.()
      })
      act(() => FuenteFalsa.ultima!.onopen?.())
      act(() => void vi.advanceTimersByTime(30_000))
      expect(screen.queryByText('Sin actualización automática')).toBeNull()
      expect(document.querySelector('[data-en-vivo="en-vivo"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('un aviso ilegible no se tira: algo cambió, así que se pone al día', () => {
    render(<EnVivo modo="auto" oculto tipos={['ingreso']} url="/x" />)
    act(() => FuenteFalsa.ultima!.avisarCrudo('{no es json'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('al salir de la pantalla cierra la conexión', () => {
    const { unmount } = render(<EnVivo modo="auto" oculto tipos={['ingreso']} url="/x" />)
    const fuente = FuenteFalsa.ultima!
    unmount()
    expect(fuente.cerrada).toBe(true)
  })

  it('al dejar la página cierra la conexión, y si vuelve de la caché del navegador la reabre y se pone al día', () => {
    render(<EnVivo modo="auto" oculto tipos={['ingreso']} url="/x" />)
    const primera = FuenteFalsa.ultima!
    // Sin cerrarla, Chrome guarda la página en su caché de ida y vuelta con la conexión abierta.
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    })
    expect(primera.cerrada).toBe(true)
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    expect(FuenteFalsa.abiertas).toBe(2)
    expect(FuenteFalsa.ultima).not.toBe(primera)
    // Pudo perderse algo mientras estaba guardada: se repinta una vez.
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
