import { describe, expect, it } from 'vitest'
import { rutaDe, rutaInterna, rutaPublica } from './rutas'

describe('cada idioma con sus direcciones (14 oct)', () => {
  it('el inglés en inglés y el español en español', () => {
    expect(rutaDe('en', 'bodas')).toBe('/en/weddings')
    expect(rutaDe('es', 'bodas')).toBe('/es/bodas')
    expect(rutaDe('en', 'colecciones', '#modelos')).toBe('/en/collections#modelos')
    expect(rutaDe('en', 'modelos', '/boda-bot')).toBe('/en/designs/boda-bot')
  })

  it('interna → pública, y lo que no es una página se queda igual', () => {
    expect(rutaPublica('/en/bodas')).toBe('/en/weddings')
    expect(rutaPublica('/en/pedido/ref/AB')).toBe('/en/order/ref/AB')
    expect(rutaPublica('/modelos/es/boda-bot')).toBe('/es/modelos/boda-bot')
    expect(rutaPublica('/modelos/musica/boda-bot')).toBe('/modelos/musica/boda-bot')
    expect(rutaPublica('/es/bodas')).toBe('/es/bodas')
    expect(rutaPublica('/en')).toBe('/en')
    expect(rutaPublica('/dashboard/events/x')).toBe('/dashboard/events/x')
  })

  it('pública → interna (lo que reescribe el proxy), y la de un idioma no vale en el otro', () => {
    expect(rutaInterna('/en/weddings')).toBe('/en/bodas')
    expect(rutaInterna('/en/designs/boda-bot')).toBe('/modelos/en/boda-bot')
    expect(rutaInterna('/es/modelos/boda-bot')).toBe('/modelos/es/boda-bot')
    expect(rutaInterna('/es/weddings')).toBe('/es/weddings')
    expect(rutaInterna('/es/bodas')).toBe('/es/bodas')
  })

  it('ida y vuelta', () => {
    for (const p of ['/en/bodas', '/en/xv-anos/x', '/es/colecciones', '/modelos/en/xv']) expect(rutaInterna(rutaPublica(p))).toBe(p)
  })
})
