import { describe, expect, it } from 'vitest'
import { ALFABETO_SUFIJO, aSlug, slugDeBoda } from './nueva-boda'

/** Lo mismo que exige el dominio del evento: minúsculas, números y guiones. */
const FORMA_DEL_SLUG = /^[a-z0-9-]+$/

describe('aSlug', () => {
  it('quita tildes y eñes, que el dominio del evento no admite', () => {
    expect(aSlug('Quinceañera Sofía')).toBe('quinceanera-sofia')
    expect(aSlug('Bodas de Oro · Pérez')).toBe('bodas-de-oro-perez')
  })

  it('no deja guiones sueltos en los bordes', () => {
    expect(aSlug('  ¡Boda!  ')).toBe('boda')
    expect(aSlug('— Ana & Luis —')).toBe('ana-luis')
  })
})

describe('slugDeBoda', () => {
  it('junta el título con su sufijo', () => {
    expect(slugDeBoda('Familia García', 'k3m9')).toBe('familia-garcia-k3m9')
  })

  it('dos bodas del mismo apellido NO chocan', () => {
    // **La prueba que sostiene esto.** Sin sufijo, la segunda fallaría con
    // `duplicate_slug` justo después de comprobar el acceso del cliente y antes de crear
    // su cuenta: el admin vería «no se pudo crear» sin entender por qué.
    expect(slugDeBoda('Familia García', 'k3m9')).not.toBe(slugDeBoda('Familia García', 'p7qt'))
  })

  it('un título sin letras utilizables no rompe el alta', () => {
    // Rechazar un alta por cómo se llama la boda sería el peor momento para descubrirlo.
    expect(slugDeBoda('¿¡!?', 'k3m9')).toBe('boda-k3m9')
    expect(slugDeBoda('日本語', 'k3m9')).toBe('boda-k3m9')
  })

  it('respeta el largo máximo del dominio, sufijo incluido', () => {
    const largo = slugDeBoda('a'.repeat(200), 'k3m9')
    expect(largo.length).toBeLessThanOrEqual(64)
    expect(largo.endsWith('-k3m9')).toBe(true)
  })

  it('siempre sale con la forma que el evento admite', () => {
    for (const titulo of ['Familia García', '¡Boda de Ana & Luis!', 'XV de Sofía', '   ', '日本語']) {
      expect(slugDeBoda(titulo, 'k3m9')).toMatch(FORMA_DEL_SLUG)
    }
  })
})

describe('el alfabeto del sufijo', () => {
  it('no tiene los caracteres que se confunden al dictarlos', () => {
    // Estos `slug` viajan en el enlace que se reparte y se dictan por teléfono, igual que
    // la referencia de un pedido.
    for (const confuso of ['0', 'o', '1', 'i', 'l']) {
      expect(ALFABETO_SUFIJO).not.toContain(confuso)
    }
  })
})
