import { describe, expect, it } from 'vitest'
import { atajoDeTarea, type LoQueYaHay, resueltaEnLaApp } from './atajos'

const nada: LoQueYaHay = {
  presupuesto: false,
  invitacionLista: false,
  invitacionesRepartidas: false,
  mesasRepartidas: false,
  regalos: false,
  proveedoresContratados: [],
  cortejo: false,
  cronograma: false,
  recepcion: false,
}

describe('atajoDeTarea', () => {
  // Una tarea que dice «Contratar DJ» y no lleva a ninguna parte obliga a buscar dónde se hace.
  it('cada tarea de la plantilla lleva a la pantalla donde se resuelve', () => {
    expect(atajoDeTarea('Contratar DJ')).toEqual({ ruta: '/planner/proveedores', texto: 'Ir a Proveedores' })
    expect(atajoDeTarea('Definir el presupuesto y quién aporta')?.ruta).toBe('/planner/presupuesto')
    expect(atajoDeTarea('Terminar la invitación')?.ruta).toBe('/configuracion')
    expect(atajoDeTarea('Repartir las invitaciones')?.ruta).toBe('/invitados')
    expect(atajoDeTarea('Elegir a los chambelanes y la corte de honor')?.ruta).toBe('/planner/cortejo')
    expect(atajoDeTarea('Horarios con los proveedores')?.ruta).toBe('/planner/cronograma')
    expect(atajoDeTarea('Sumar al personal de recepción y mandarle su acceso')?.ruta).toBe('/equipo')
    expect(atajoDeTarea('Comprar las ligas')).toBeNull()
  })
})

describe('resueltaEnLaApp', () => {
  it('se da por hecha cuando lo que pide ya está hecho en su pantalla', () => {
    expect(resueltaEnLaApp('Definir el presupuesto y quién aporta', { ...nada, presupuesto: true })).toBe(true)
    expect(resueltaEnLaApp('Contratar DJ', { ...nada, proveedoresContratados: ['DJ Kevin'] })).toBe(true)
    expect(resueltaEnLaApp('Contratar fotógrafo y video', { ...nada, proveedoresContratados: ['DJ Kevin'] })).toBe(false)
    expect(resueltaEnLaApp('Reservar el salón', { ...nada, proveedoresContratados: ['Salón Los Encinos'] })).toBe(true)
    expect(resueltaEnLaApp('Repartir las invitaciones', { ...nada, invitacionesRepartidas: true })).toBe(true)
    // El evento no existe sin fecha: fijarla ya está hecho.
    expect(resueltaEnLaApp('Fijar la fecha', nada)).toBe(true)
    expect(resueltaEnLaApp('Encargar el vestido (a medida pide de 4 a 6 meses)', { ...nada, proveedoresContratados: ['Modista Rosa'] })).toBe(true)
  })

  it('lo que la app no puede saber no se marca solo', () => {
    expect(resueltaEnLaApp('Llamar a quien no confirmó', { ...nada, invitacionesRepartidas: true })).toBe(false)
    expect(resueltaEnLaApp('Ensayo final del vals', { ...nada, cortejo: true })).toBe(false)
  })
})
