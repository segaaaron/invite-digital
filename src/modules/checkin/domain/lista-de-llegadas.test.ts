import { describe, expect, it } from 'vitest'
import { listaDeLlegadas } from './lista-de-llegadas'

const g = (id: string, label: string, over: object = {}) => ({ id, label, seats: 2, attending: null as number | null, revoked: false, ...over })
const llegada = (guestGroupId: string, personas: Record<string, Date>, arrivedCount = Object.keys(personas).length) =>
  ({ guestGroupId, arrivedCount, arrivedAt: new Date('2026-10-17T23:40:00Z'), personas }) as never

describe('listaDeLlegadas', () => {
  // La recepción y el anfitrión miran lo mismo: quién ya está dentro y a quién se espera.
  it('una fila por persona: quien entró con su hora, quien falta, y quien dijo que no viene', () => {
    const filas = listaDeLlegadas(
      [g('fam', 'Familia Rojas'), g('tio', 'Tío Luis', { attending: 0 }), g('vieja', 'Invitación sin nombres')],
      [llegada('fam', { ana: new Date('2026-10-17T23:40:00Z') })],
      { fam: [{ id: 'ana', fullName: 'Ana Rojas', vip: true }, { id: 'luis', fullName: 'Luis Rojas' }], tio: [{ id: 'tio1', fullName: 'Luis Peña' }] },
    )
    expect(filas).toEqual([
      { clave: 'ana', invitacionId: 'fam', personaId: 'ana', nombre: 'Ana Rojas', invitacion: 'Familia Rojas', estado: 'dentro', hora: new Date('2026-10-17T23:40:00Z'), vip: true },
      { clave: 'luis', invitacionId: 'fam', personaId: 'luis', nombre: 'Luis Rojas', invitacion: 'Familia Rojas', estado: 'por_llegar', hora: null, vip: false },
      { clave: 'tio1', invitacionId: 'tio', personaId: 'tio1', nombre: 'Luis Peña', invitacion: 'Tío Luis', estado: 'no_viene', hora: null, vip: false },
      { clave: 'vieja', invitacionId: 'vieja', personaId: null, nombre: 'Invitación sin nombres', invitacion: null, estado: 'por_llegar', hora: null, vip: false },
    ])
  })

  it('una invitación revocada no se espera', () => {
    expect(listaDeLlegadas([g('x', 'X', { revoked: true })], [], {})).toEqual([])
  })
})
