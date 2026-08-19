import { describe, expect, it } from 'vitest'
import { THEME_KEYS, themeFor } from './registry'

describe('registro de plantillas', () => {
  it('devuelve la plantilla pedida', () => {
    expect(themeFor('clasico').key).toBe('clasico')
  })

  it('cae en clásico cuando la clave no existe, en vez de romper la invitación', () => {
    expect(themeFor('inventada').key).toBe('clasico')
  })

  it('expone todas las claves para el desplegable del panel', () => {
    expect(THEME_KEYS).toContain('clasico')
    expect(THEME_KEYS.every((key) => themeFor(key).key === key)).toBe(true)
  })
})
