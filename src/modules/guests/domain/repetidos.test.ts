import { describe, expect, it } from 'vitest'
import { yaEstaEnLaLista } from './repetidos'

const lista = {
  grupos: [
    { id: 'g1', label: 'Familia Pérez', phone: '+59170012345', revokedAt: null },
    { id: 'g2', label: 'Ana Vega', phone: null, revokedAt: null },
  ],
  personas: [
    { guestGroupId: 'g1', fullName: 'Ramón Pérez' },
    { guestGroupId: 'g2', fullName: 'Ana  Vega' },
  ],
}

describe('yaEstaEnLaLista (9 oct: «no diferencia si existe o no»)', () => {
  it('el mismo nombre, sin tildes ni mayúsculas, ya está', () => {
    expect(yaEstaEnLaLista({ personas: ['ramon perez'], telefono: null }, lista)).toEqual({ nombre: 'ramon perez', invitacion: 'Familia Pérez', por: 'nombre' })
    expect(yaEstaEnLaLista({ personas: ['Luis', 'Ana Vega'], telefono: null }, lista)).toMatchObject({ invitacion: 'Ana Vega', por: 'nombre' })
  })
  it('el mismo WhatsApp (últimas 8 cifras) ya está', () => {
    expect(yaEstaEnLaLista({ personas: ['Rosa Pérez'], telefono: '700 12345' }, lista)).toEqual({ nombre: 'Rosa Pérez', invitacion: 'Familia Pérez', por: 'whatsapp' })
  })
  it('alguien nuevo no está', () => {
    expect(yaEstaEnLaLista({ personas: ['Carla Ríos'], telefono: '71234567' }, lista)).toBeNull()
  })
  it('una invitación revocada no cuenta', () => {
    const revocada = { ...lista, grupos: lista.grupos.map((g) => ({ ...g, revokedAt: new Date() })) }
    expect(yaEstaEnLaLista({ personas: ['Ramón Pérez'], telefono: null }, revocada)).toBeNull()
  })
})
