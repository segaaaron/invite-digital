// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buscarEnInvitacion, piezaQueContiene, textosDeSeccion } from './seguir-seccion'

describe('textosDeSeccion', () => {
  it('saca lo escrito de la sección, sin identificadores de archivo, y lo más distintivo primero', () => {
    expect(
      textosDeSeccion(
        { reception: { label: 'Recepción Social', place: 'Hacienda Las Estrellas', time: '19:00' }, gallery: [{ label: 'Retrato', imageId: 'uuid-1' }] },
        'reception',
      ),
    ).toEqual(['Hacienda Las Estrellas', 'Recepción Social', '19:00'])
    expect(textosDeSeccion({ gallery: [{ label: 'Retrato', imageId: 'uuid-1' }] }, 'gallery')).toEqual(['Retrato'])
  })

  it('la cuenta atrás no escribe la fecha como se guardó: se busca por sus rótulos', () => {
    expect(textosDeSeccion({ schedule: { startsAt: '2026-10-17T19:00' } }, 'schedule')).toContain('días')
  })
})

describe('buscarEnInvitacion', () => {
  it('encuentra el texto sin distinguir mayúsculas, tildes ni adornos', () => {
    document.body.innerHTML = '<div id="marco"><p>Intro</p><section><h2>HACIENDA LAS ESTRELLAS</h2></section></div>'
    const marco = document.getElementById('marco')!
    expect(buscarEnInvitacion(marco, ['Hacienda las Estrellas'])?.tagName).toBe('H2')
    expect(buscarEnInvitacion(marco, ['recepcion inexistente', 'hacienda'])?.tagName).toBe('H2')
  })

  it('sin coincidencia no devuelve nada, en vez de saltar a cualquier parte', () => {
    document.body.innerHTML = '<div id="marco"><p>Intro</p></div>'
    expect(buscarEnInvitacion(document.getElementById('marco')!, ['Galería de fotos'])).toBeNull()
  })

  it('también encuentra lo que la invitación dice en el texto alternativo de una imagen: el rótulo de la galería', () => {
    document.body.innerHTML = '<div id="marco"><figure><img alt="Retrato de Sofía" src="x" /></figure></div>'
    expect(buscarEnInvitacion(document.getElementById('marco')!, ['Retrato'])?.tagName).toBe('IMG')
  })
})

describe('piezaQueContiene', () => {
  const conAlto = (el: HTMLElement, alto: number) => {
    el.getBoundingClientRect = () => ({ height: alto }) as DOMRect
    return el
  }

  // El reproductor de la canción mide 81 px y cuelga directo de la columna entera: subir hasta
  // ella mandaba la vista previa arriba del todo.
  it('no sube hasta la columna entera de la invitación: se queda en la pieza', () => {
    const raiz = conAlto(document.createElement('div'), 6000)
    const columna = conAlto(document.createElement('div'), 5998)
    const reproductor = conAlto(document.createElement('div'), 81)
    const titulo = conAlto(document.createElement('div'), 20)
    raiz.append(columna)
    columna.append(reproductor)
    reproductor.append(titulo)
    expect(piezaQueContiene(titulo, raiz)).toBe(reproductor)
  })
})
