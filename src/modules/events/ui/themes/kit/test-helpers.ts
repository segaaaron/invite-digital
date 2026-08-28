import { vi } from 'vitest'

/**
 * Finge la preferencia de movimiento del sistema.
 *
 * jsdom no trae `matchMedia`, así que sin este doble toda pieza animada del kit cae por la
 * rama de «no hay preferencia» y la prueba pasaría por el motivo equivocado.
 */
export function conMovimientoReducido(reducido: boolean): void {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: reducido && consulta.includes('prefers-reduced-motion'),
    media: consulta,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/**
 * Un `IntersectionObserver` que **no dispara nunca**.
 *
 * Es el caso que importa: el bloque que todavía no ha entrado en pantalla. Uno que
 * disparase al montar haría pasar la prueba del movimiento reducido aunque `Reveal`
 * estuviera mal, porque todo acabaría visible de todas formas.
 */
export function conObservadorQueNuncaDispara(): void {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
}
