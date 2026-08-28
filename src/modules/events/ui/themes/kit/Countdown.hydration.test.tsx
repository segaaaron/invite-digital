import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Countdown } from './Countdown'

const ROTULOS = { days: 'DÍAS', hours: 'HRS', mins: 'MIN', secs: 'SEG' } as const
const DESTINO = '2027-05-15T18:00:00Z'

afterEach(() => {
  vi.useRealTimers()
})

/**
 * La hidratación de la cuenta atrás, con el reloj movido entre el servidor y el navegador.
 *
 * Es la única forma de sujetar esto. Un fallo de hidratación **no se ve en producción**:
 * React 19 se recupera en silencio y solo lo cuenta por `onRecoverableError`, así que una
 * prueba de navegador contra la imagen no lo caza —se comprobó, y pasaba igual de verde
 * con el fallo dentro—. En desarrollo sí se ve, y era lo que encendía el indicador de Next
 * en los dieciséis diseños.
 *
 * Lo que está en juego no es un aviso: React descarta el marcado del servidor y **vuelve a
 * pintar el árbol entero** en el navegador. En una invitación con fondos animados eso es
 * un parpadeo en la primera pantalla, justo cuando el invitado la abre desde WhatsApp.
 */
describe('Countdown · hidratación', () => {
  it('hidrata sin descartar el marcado aunque el segundo del navegador no sea el del servidor', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-05-10T10:00:00Z'))

    const delServidor = renderToString(<Countdown labels={ROTULOS} targetISO={DESTINO} />)

    // Entre el servidor y el navegador pasa un viaje por la red. Nunca es el mismo segundo.
    vi.setSystemTime(new Date('2027-05-10T10:00:03Z'))

    const contenedor = document.createElement('div')
    contenedor.innerHTML = delServidor
    document.body.append(contenedor)

    const errores: unknown[] = []
    await act(async () => {
      hydrateRoot(contenedor, <Countdown labels={ROTULOS} targetISO={DESTINO} />, {
        onRecoverableError: (error) => errores.push(error),
      })
    })

    expect(errores).toEqual([])
  })
})
