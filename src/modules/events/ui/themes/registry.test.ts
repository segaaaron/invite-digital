import { fiestaDeCategoria, fiestaDeTema } from '../../domain/fiesta'
import { MAXIMOS } from '../../domain/invitation-content'
import { FORMAS } from '../content-shapes'
import { describe, expect, it } from 'vitest'
import { THEME_KEYS, themeDefinitions, themeFor } from './registry'
import { seAsigna } from '@/shared/design/theme-catalog'

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

describe('las fotografías que declara cada diseño', () => {
  // Un diseño sin casillas no tiene dónde poner una fotografía de galería: dejar la sección
  // en la lista le pinta al cliente un formulario de fotos que su invitación no enseña.
  it('lleva la galería solo el diseño que pinta alguna casilla', () => {
    for (const tema of themeDefinitions()) {
      expect(tema.sections.includes('gallery'), tema.key).toBe(tema.pinta.fotos.casillas > 0)
    }
  })

  it('no promete más casillas de las que el dominio guarda', () => {
    for (const tema of themeDefinitions()) {
      expect(tema.pinta.fotos.casillas, tema.key).toBeLessThanOrEqual(MAXIMOS.gallery)
    }
  })
})

describe('los campos que declara cada diseño', () => {
  // Una omisión con el nombre mal escrito no quita nada y no se nota: el campo se sigue
  // preguntando. Esto ata cada omisión al campo real de su bloque.
  it('cada campo que un diseño declara no pintar existe en su bloque', () => {
    for (const tema of themeDefinitions()) {
      for (const [seccion, claves] of Object.entries(tema.pinta.sinCampos ?? {})) {
        const forma = FORMAS[seccion as keyof typeof FORMAS]
        const reales = [...forma.fields.map((campo) => campo.key), ...(forma.form === 'campos' && forma.list !== undefined ? [forma.list.key] : [])]
        // En los anfitriones, `names` es la marca de «no pinta los nombres»: la resuelve `formaPara`.
        if (seccion === 'hosts') reales.push('names')
        for (const clave of claves) expect(reales, `${tema.key} · ${seccion}.${clave}`).toContain(clave)
      }
    }
  })

  it('un diseño solo declara omisiones de las secciones que pinta', () => {
    for (const tema of themeDefinitions()) {
      for (const seccion of Object.keys(tema.pinta.sinCampos ?? {})) {
        expect(tema.sections, `${tema.key} · ${seccion}`).toContain(seccion)
      }
    }
  })
})

describe('los colores y la letra (Gala)', () => {
  // Un diseño nuevo que se vende sin declarar su estilo deja a quien compró Gala sin lo que pagó.
  it('todo diseño que se asigna los admite, con su principal dentro de la familia y sus letras cargadas', () => {
    const asignables = themeDefinitions().filter((t) => seAsigna(t.key))
    expect(asignables.length).toBeGreaterThan(0)
    for (const t of asignables) {
      expect(t.estilo?.acento, t.key).toBeDefined()
      expect(Object.values(t.estilo!.acento!.familia), t.key).toContain(t.estilo!.acento!.principal)
      for (const letra of [t.estilo?.caligrafia, t.estilo?.titulares]) if (letra !== undefined) expect(t.fonts, t.key).toContain(letra)
    }
  })
})
