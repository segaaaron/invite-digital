import { describe, expect, it } from 'vitest'
import { FORMAS, formaPara } from './content-shapes'

/**
 * Lo que el editor pregunta sale del diseño, no de una lista fija.
 *
 * No todas las tarjetas llevan fotografía: hay XV que abren con una escena dibujada y no
 * tienen ni arco de retrato ni galería. Pedirla igual deja al cliente subiendo un retrato
 * que su invitación no enseña en ninguna parte.
 */
describe('formaPara', () => {
  const imagenes = (section: 'hero' | 'gallery', fotos: Parameters<typeof formaPara>[1]): readonly string[] =>
    formaPara(section, fotos)
      .fields.filter((campo) => campo.kind === 'imagen')
      .map((campo) => campo.key)

  it('no pregunta por la portada si el diseño no la pinta', () => {
    expect(imagenes('hero', { fotos: { casillas: 0 } })).toEqual([])
    expect(imagenes('hero', { fotos: { portada: true, casillas: 0 } })).toEqual(['coverImageId'])
  })

  it('no pregunta por el retrato si el diseño no lo pinta', () => {
    expect(imagenes('hero', { fotos: { retrato: true, casillas: 1 } })).toEqual(['portraitImageId'])
  })

  it('acota la galería a las casillas que el diseño pinta', () => {
    const forma = formaPara('gallery', { fotos: { casillas: 2 } })
    expect(forma.form === 'filas' && forma.max).toBe(2)
  })

  it('no acota las listas que no son de fotografías', () => {
    const forma = formaPara('itinerary', { fotos: { casillas: 0 } })
    const original = FORMAS.itinerary
    expect(forma.form === 'filas' && original.form === 'filas' && forma.max).toBe(original.form === 'filas' ? original.max : 0)
  })

  it('ningún bloque pide una fotografía que ningún diseño pinta', () => {
    // La vestimenta y la despedida tenían campo de imagen en el editor y **ninguna** de las
    // dieciséis vistas los lee: lo que se subía ahí no salía en la invitación.
    const conImagen = Object.entries(FORMAS).filter(
      ([, forma]) => forma.fields.some((c) => c.kind === 'imagen') || (forma.form === 'campos' && forma.list?.kind === 'imagen'),
    )
    expect(conImagen.map(([clave]) => clave).sort()).toEqual(['gallery', 'hero'])
  })

  it('no pregunta por un campo que el diseño no pinta', () => {
    // «Étoile» escribe los nombres sin monograma y cierra sin firma.
    const hero = formaPara('hero', { fotos: { casillas: 6 }, sinCampos: { hero: ['monogram'] } })
    expect(hero.fields.map((campo) => campo.key)).not.toContain('monogram')
    const closing = formaPara('closing', { fotos: { casillas: 6 }, sinCampos: { closing: ['signature'] } })
    expect(closing.fields.map((campo) => campo.key)).toEqual(['text'])
  })

  it('quita también la lista suelta que el diseño no pinta', () => {
    // «Bodas de Oro» enseña el rótulo de los anfitriones y nunca sus nombres.
    const hosts = formaPara('hosts', { fotos: { casillas: 5 }, sinCampos: { hosts: ['names'] } })
    expect(hosts.form === 'campos' && hosts.list).toBeUndefined()
  })

  it('acota los avisos a los que el diseño pinta', () => {
    const forma = formaPara('notes', { fotos: { casillas: 6 }, maxAvisos: 1 })
    expect(forma.form === 'filas' && forma.max).toBe(1)
  })
})
