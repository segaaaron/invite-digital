import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from './test-helpers'

beforeEach(() => {
  conObservadorQueNuncaDispara()
})

const contenedorDe = (texto: string) => screen.getByText(texto).parentElement

describe('Reveal', () => {
  it('con movimiento reducido deja el contenido visible desde el primer render', () => {
    // LA prueba de esta pieza. La usan los dieciséis diseños: un Reveal que arranca en
    // opacity 0 esperando un observador que no dispara deja la invitación entera en blanco
    // para quien pidió menos movimiento, sin un solo error en consola.
    conMovimientoReducido(true)
    render(
      <Reveal>
        <p>Camila & Mateo</p>
      </Reveal>,
    )

    expect(contenedorDe('Camila & Mateo')).toHaveStyle({ opacity: '1' })
  })

  it('con movimiento reducido no deja ni transición ni desplazamiento', () => {
    conMovimientoReducido(true)
    render(
      <Reveal scale={0.9} y={32}>
        <p>Camila & Mateo</p>
      </Reveal>,
    )

    const nodo = contenedorDe('Camila & Mateo')
    expect(nodo?.style.transform).toBe('')
    expect(nodo?.style.transition).toBe('')
  })

  it('sin movimiento reducido arranca oculto y desplazado', () => {
    conMovimientoReducido(false)
    render(
      <Reveal y={32}>
        <p>Camila & Mateo</p>
      </Reveal>,
    )

    const nodo = contenedorDe('Camila & Mateo')
    expect(nodo).toHaveStyle({ opacity: '0' })
    expect(nodo?.style.transform).toContain('32px')
  })

  it('aplica la escala de partida cuando se pide', () => {
    conMovimientoReducido(false)
    render(
      <Reveal scale={0.94}>
        <p>Camila & Mateo</p>
      </Reveal>,
    )

    expect(contenedorDe('Camila & Mateo')?.style.transform).toContain('scale(0.94)')
  })

  it('pinta el contenido en el marcado aunque todavía no se vea', () => {
    // Es lo que leen los buscadores y los lectores de pantalla, que no esperan a que un
    // observador dispare.
    conMovimientoReducido(false)
    render(
      <Reveal>
        <p>Camila & Mateo</p>
      </Reveal>,
    )

    expect(screen.getByText('Camila & Mateo')).toBeInTheDocument()
  })

  it('se enseña igual si el navegador no trae IntersectionObserver', async () => {
    // No animar es un defecto aceptable; no verse, no. Llega en el fotograma siguiente y
    // no en el primer render: decidirlo en el estado inicial descuadraría el marcado del
    // servidor, donde `IntersectionObserver` tampoco existe.
    conMovimientoReducido(false)
    // @ts-expect-error se retira a propósito para el caso del navegador sin soporte
    globalThis.IntersectionObserver = undefined

    render(
      <Reveal>
        <p>Camila & Mateo</p>
      </Reveal>,
    )

    await waitFor(() => {
      expect(contenedorDe('Camila & Mateo')).toHaveStyle({ opacity: '1' })
    })
  })
})

describe('el seguro de Reveal', () => {
  it('se enseña aunque el observador no dispare nunca', async () => {
    // Se comprobó en el navegador: en una pestaña que no está al frente, el navegador
    // estrangula el renderizado y el IntersectionObserver no dispara ni sobre un elemento
    // a la vista. Sin seguro, quien abre la invitación desde WhatsApp y cambia de
    // aplicación mientras carga vuelve a una invitación en blanco.
    conMovimientoReducido(false)
    vi.useFakeTimers()

    render(
      <Reveal delay={120}>
        <p>Camila & Mateo</p>
      </Reveal>,
    )
    expect(contenedorDe('Camila & Mateo')).toHaveStyle({ opacity: '0' })

    await act(async () => {
      vi.advanceTimersByTime(721)
    })
    expect(contenedorDe('Camila & Mateo')).toHaveStyle({ opacity: '1' })

    vi.useRealTimers()
  })
})
