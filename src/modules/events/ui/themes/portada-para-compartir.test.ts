import { describe, expect, it } from 'vitest'
import { medallonDeCompartir, portadaParaCompartir } from './portada-para-compartir'

describe('la portada de la vista previa de WhatsApp', () => {
  it('«Cervecería Vintage» declara su medallón con las medidas del arte', () => {
    // Sin esto, el enlace compartido enseña el círculo vacío y el nombre suelto abajo.
    const medallon = medallonDeCompartir('cumple-beer')
    expect(medallon).not.toBeNull()
    expect(medallon?.arte).toEqual({ ancho: 768, alto: 1376 })
    // El hueco cae dentro del arte, que es lo que hace que el nombre no se salga.
    expect(medallon!.x - medallon!.ancho / 2).toBeGreaterThan(0)
    expect(medallon!.x + medallon!.ancho / 2).toBeLessThan(medallon!.arte.ancho)
    expect(medallon!.y).toBeLessThan(medallon!.arte.alto)
  })

  it('los demás diseños no tienen medallón: su nombre va en el pie de la tarjeta', () => {
    for (const clave of ['xv', 'boda-bot', 'clasico']) expect(medallonDeCompartir(clave)).toBeNull()
  })

  it('cada diseño con arte propio lo usa, y el resto cae al del catálogo', () => {
    expect(portadaParaCompartir('cumple-beer')).toContain('cumple-beer')
    expect(portadaParaCompartir('clasico')).toBe('/templates/clasico.avif')
  })
})
