import { describe, expect, it } from 'vitest'
import { CAPACIDAD_POR_DEFECTO, MENSAJES_POR_DEFECTO, leerMensajes, paraGuardar, rellenar } from './mensajes'

describe('mensajes al cliente', () => {
  it('rellena las variables y quita las que faltan sin dejar llaves ni preposiciones colgando', () => {
    expect(rellenar('Hola {nombre}, tu evento del {fecha} está listo.', { nombre: 'Carla', fecha: 'sáb 14 feb' })).toBe('Hola Carla, tu evento del sáb 14 feb está listo.')
    expect(rellenar('Hola {nombre}, tu evento del {fecha} está listo.', { nombre: 'Carla' })).toBe('Hola Carla, tu evento está listo.')
    expect(rellenar('Paga {importe} aquí: {enlace}', { importe: 'Bs 1.190,00' })).toBe('Paga Bs 1.190,00 aquí:')
  })

  it('lo vacío o lo que falta vuelve al mensaje por defecto; la capacidad, entre 1 y 20', () => {
    const { mensajes, capacidad } = leerMensajes({ 'mensajes.cotizacion': '  ', 'mensajes.contacto': 'Hola {nombre}' })
    expect(mensajes.cotizacion).toBe(MENSAJES_POR_DEFECTO.cotizacion)
    expect(mensajes.contacto).toBe('Hola {nombre}')
    expect(capacidad).toBe(CAPACIDAD_POR_DEFECTO)
    expect(paraGuardar({}, 99)['agenda.capacidad']).toBe('20')
    expect(paraGuardar({}, 0)['agenda.capacidad']).toBe('1')
    expect(leerMensajes({ 'agenda.capacidad': '4' }).capacidad).toBe(4)
    expect(leerMensajes({}).descuentoReferido).toBe(10)
    expect(paraGuardar({}, 3, 80)['referidos.descuento']).toBe('50')
  })
})
