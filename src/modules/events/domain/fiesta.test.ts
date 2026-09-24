import { describe, expect, it } from 'vitest'
import { fiestaDeCategoria, mismaFiesta, VOCABULARIO, VOCABULARIO_GENERICO, vocabularioDeCategoria } from './fiesta'

describe('fiesta', () => {
  it('la boda civil es una boda; los XV son otra fiesta', () => {
    expect(fiestaDeCategoria('boda')).toBe('boda')
    expect(fiestaDeCategoria('boda-civil')).toBe('boda')
    expect(fiestaDeCategoria('xv-anos')).toBe('xv')
  })

  it('una categoría desconocida cae a boda, que es la fiesta del diseño de respaldo', () => {
    expect(fiestaDeCategoria('otra-cosa')).toBe('boda')
  })

  it('mismaFiesta compara por fiesta, no por categoría', () => {
    expect(mismaFiesta('boda', 'boda-civil')).toBe(true)
    expect(mismaFiesta('boda', 'xv-anos')).toBe(false)
  })

  it('cada fiesta tiene su vocabulario y los XV nunca hablan de novios', () => {
    expect(VOCABULARIO.boda.anfitriones).toBe('los novios')
    expect(VOCABULARIO.xv.anfitriones).toBe('la quinceañera')
    expect(JSON.stringify(VOCABULARIO.xv)).not.toMatch(/novi|boda/i)
  })

  it('los ejemplos de una fiesta no hablan de otra', () => {
    expect(JSON.stringify(VOCABULARIO.cumple)).not.toMatch(/novi|boda|vals|quince/i)
    expect(JSON.stringify(VOCABULARIO.xv.ejemplos)).not.toMatch(/novi|boda|luna de miel|arras/i)
  })

  it('una categoría que el panel aún no conoce habla de «el evento», no de boda', () => {
    for (const categoria of ['bautizo', 'graduacion', 'corporativo', 'despedida']) {
      expect(vocabularioDeCategoria(categoria)).toBe(VOCABULARIO_GENERICO)
    }
    expect(JSON.stringify(VOCABULARIO_GENERICO)).not.toMatch(/novi|boda|vals|quince|luna de miel|arras/i)
    expect(vocabularioDeCategoria('boda-civil')).toBe(VOCABULARIO.boda)
    expect(vocabularioDeCategoria('xv-anos')).toBe(VOCABULARIO.xv)
    expect(vocabularioDeCategoria('cumpleanos')).toBe(VOCABULARIO.cumple)
  })
})
