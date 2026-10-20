import { describe, expect, it } from 'vitest'
import { SECCION_DE_LA_HERRAMIENTA } from './asistente'
import { canAccessEvent } from '@/modules/identity/domain/access'
import type { Actor } from '@/modules/identity/domain/access'

/**
 * F19 del escaneo: Luxury entra con la sección `cliente`, que también abre el co-anfitrión, pero sus
 * herramientas leían lo de otras secciones. Así le contaba los nombres y teléfonos de la recepción, los
 * correos de la planner y los proveedores, todo lo que sus páginas le niegan con un 404.
 *
 * Esto comprueba la decisión de verdad —el mapa de cada herramienta con `canAccessEvent`—, no el texto.
 */
const cliente: Actor = { userId: 'u1', email: 'ana@ejemplo.bo', role: 'cliente', mustChangePassword: false }
const evento = { userId: 'atelier-1' }

const abre = (pertenencias: readonly ('cliente' | 'coanfitrion' | 'planner' | 'puerta')[], herramienta: string) =>
  canAccessEvent(cliente, evento, { section: SECCION_DE_LA_HERRAMIENTA[herramienta]!, memberships: pertenencias })

describe('las herramientas de Luxury piden la sección de su pantalla', () => {
  it('cada herramienta sensible tiene su sección apuntada', () => {
    expect(SECCION_DE_LA_HERRAMIENTA).toEqual({
      recepcion: 'porteros',
      puerta: 'checkin',
      proveedores: 'planner',
      cronograma: 'planner',
      agenda: 'planner',
    })
  })

  it('el anfitrión abre todas', () => {
    for (const herramienta of Object.keys(SECCION_DE_LA_HERRAMIENTA)) {
      expect(abre(['cliente'], herramienta), herramienta).toBe(true)
    }
  })

  it('su planner también', () => {
    for (const herramienta of Object.keys(SECCION_DE_LA_HERRAMIENTA)) {
      expect(abre(['planner'], herramienta), herramienta).toBe(true)
    }
  })

  it('y el co-anfitrión ninguna: es exactamente lo que el panel le niega', () => {
    for (const herramienta of Object.keys(SECCION_DE_LA_HERRAMIENTA)) {
      expect(abre(['coanfitrion'], herramienta), herramienta).toBe(false)
    }
  })
})
