import { describe, expect, it } from 'vitest'
import { fiestaDeCategoria, mismaFiesta, VOCABULARIO } from './fiesta'

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
})
