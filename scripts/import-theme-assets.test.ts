import { describe, expect, it } from 'vitest'
import { copiarTema, normalizarNombre } from './import-theme-assets'

describe('normalizarNombre', () => {
  it('quita espacios y mayúsculas', () => {
    // Un espacio o una mayúscula en una ruta servida funciona en macOS y da 404 en el
    // contenedor, que es donde se descubre.
    expect(normalizarNombre('BORDE PLATA SF.png')).toBe('borde-plata-sf.png')
  })

  it('quita el sufijo de hash con el que la maqueta marca los duplicados', () => {
    // `MASCARADA MORADA.jpeg` y `MASCARADA MORADA-5c764da1.jpeg` son el mismo archivo.
    // Que caigan en el mismo destino es lo que permite deduplicarlos.
    expect(normalizarNombre('MASCARADA MORADA-5c764da1.jpeg')).toBe('mascarada-morada.jpg')
    expect(normalizarNombre('MASCARADA MORADA.jpeg')).toBe('mascarada-morada.jpg')
  })

  it('quita las tildes', () => {
    expect(normalizarNombre('Recepción Salón.png')).toBe('recepcion-salon.png')
  })

  it('unifica jpeg y jpg', () => {
    expect(normalizarNombre('bajo el mar1.jpeg')).toBe('bajo-el-mar1.jpg')
  })

  it('no confunde un nombre que acaba en ocho caracteres legítimos con un hash', () => {
    // `-optimized` no es un hash y tiene que sobrevivir; `-12345678` tampoco lo es, porque
    // un hash hexadecimal no lleva solo cifras por casualidad… pero sí encaja en el
    // patrón. Se acepta a sabiendas: el coste de perderlo es un nombre más corto, y el de
    // no quitar los hash de verdad son setenta y cuatro duplicados.
    expect(normalizarNombre('busto-marmol-optimized.png')).toBe('busto-marmol-optimized.png')
  })

  it('deja un nombre ya limpio como estaba', () => {
    expect(normalizarNombre('boda-01-pareja.jpg')).toBe('boda-01-pareja.jpg')
  })
})

describe('copiarTema', () => {
  const bytes = (texto: string) => new TextEncoder().encode(texto)

  it('copia una vez el archivo que la maqueta tiene duplicado', async () => {
    const escritas: string[] = []
    const resultado = await copiarTema(
      'xv-valentina',
      ['uploads/MASCARADA MORADA.jpeg', 'uploads/MASCARADA MORADA-5c764da1.jpeg'],
      async () => bytes('la misma imagen'),
      async (ruta) => {
        escritas.push(ruta)
      },
    )

    expect(resultado).toEqual({ copiadas: 1, duplicadas: 1 })
    expect(escritas).toEqual(['public/temas/xv-valentina/mascarada-morada.jpg'])
  })

  it('para con error si dos imágenes distintas caen en el mismo destino', async () => {
    // Pisar una silenciosamente dejaría un tema con la imagen de otro, y nadie lo vería
    // hasta abrir esa invitación.
    await expect(
      copiarTema(
        'xv-valeria',
        ['uploads/RELOJ1.png', 'uploads/reloj1.png'],
        async (ruta) => (ruta.endsWith('RELOJ1.png') ? bytes('una imagen') : bytes('otra muy distinta')),
        async () => {},
      ),
    ).rejects.toThrow(/Dos imágenes distintas/)
  })
})
