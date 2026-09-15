import { fiestaDeCategoria, fiestaDeTema } from '../../domain/fiesta'
import { describe, expect, it } from 'vitest'
import { THEME_KEYS, themeDefinitions, themeFor } from './registry'

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

describe('fiestaDeTema', () => {
  // Quien no puede cargar el registro —el contenedor, el mantenimiento— deduce la fiesta de
  // la clave. Esto ata esa deducción a la categoría real de cada diseño.
  it('coincide con la categoría de cada diseño del registro', () => {
    for (const tema of themeDefinitions()) {
      expect(fiestaDeTema(tema.key), tema.key).toBe(fiestaDeCategoria(tema.categorySlug))
    }
  })
})
