import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { leerExtras, leerPreguntas, SIN_PREGUNTAS } from './preguntas'

const boda = { cancion: true, menus: ['Carne', 'Pollo', 'Vegetariano'], actos: ['Civil', 'Iglesia', 'Fiesta'] }

describe('las preguntas al confirmar', () => {
  it('sin preguntas, todo lo extra se descarta', () => {
    const r = leerExtras({ song: 'Despacito', menu: 'Carne', acts: ['Civil'] }, SIN_PREGUNTAS)
    expect(isOk(r) && r.value).toEqual({ song: null, menu: null, acts: [] })
  })

  it('guarda la canción recortada, el menú y los actos elegidos de la lista', () => {
    const r = leerExtras({ song: '  Hora loca: La bomba  ', menu: 'Pollo', acts: ['Iglesia', 'Fiesta'] }, boda)
    expect(isOk(r) && r.value).toEqual({ song: 'Hora loca: La bomba', menu: 'Pollo', acts: ['Iglesia', 'Fiesta'] })
  })

  it('un menú o un acto que no está en la lista se rechaza: es un POST manipulado', () => {
    expect(isErr(leerExtras({ menu: 'Langosta' }, boda))).toBe(true)
    expect(isErr(leerExtras({ acts: ['After party'] }, boda))).toBe(true)
  })

  it('una canción de más de 200 caracteres se rechaza', () => {
    expect(isErr(leerExtras({ song: 'x'.repeat(201) }, boda))).toBe(true)
  })

  it('la configuración: sin vacíos ni repetidos, con tope de opciones', () => {
    const r = leerPreguntas({ cancion: true, menus: ' Carne \n\nPollo\ncarne', actos: 'Civil\nFiesta' })
    expect(isOk(r) && r.value).toEqual({ cancion: true, menus: ['Carne', 'Pollo'], actos: ['Civil', 'Fiesta'] })
    expect(isErr(leerPreguntas({ cancion: false, menus: Array.from({ length: 9 }, (_, i) => `M${i}`).join('\n'), actos: '' }))).toBe(true)
  })
})
