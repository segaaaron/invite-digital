import { describe, expect, it } from 'vitest'
import { tarjetaDeInvitacion } from './tarjeta-de-invitacion'

const evento = { title: 'Quince de Camila', eventDate: '2026-10-17', locale: 'es' as const }

describe('tarjetaDeInvitacion', () => {
  // Lo que WhatsApp enseña al pegar el enlace: quién celebra, cuándo y para quién es.
  it('con la invitación escrita: los nombres de la portada, la fecha con la hora y el saludo', () => {
    const t = tarjetaDeInvitacion({
      evento,
      contenido: { hero: { eyebrow: 'MIS QUINCE', nameA: 'Camila' }, schedule: { startsAt: '2026-10-17T19:00' }, reception: { place: 'Hacienda Las Estrellas' } },
      invitado: 'Pamela Medrano',
      protegida: false,
    })
    expect(t).toEqual({
      antetitulo: 'MIS QUINCE',
      nombres: 'Camila',
      fecha: 'sábado, 17 de octubre de 2026 · 19:00',
      titulo: 'Camila · MIS QUINCE',
      descripcion: 'Pamela Medrano, te esperamos el sábado, 17 de octubre de 2026 · 19:00 en Hacienda Las Estrellas. Toca para abrir tu invitación.',
    })
  })

  it('una boda junta los dos nombres', () => {
    expect(tarjetaDeInvitacion({ evento, contenido: { hero: { nameA: 'María', nameB: 'Alejandro' } }, invitado: 'Tía Rosa', protegida: false }).nombres).toBe('María & Alejandro')
  })

  // Con contraseña, quien tenga el enlace no averigua de qué boda se trata por la vista previa.
  it('con contraseña no dice de quién es ni cuándo', () => {
    const t = tarjetaDeInvitacion({ evento, contenido: { hero: { nameA: 'Camila' } }, invitado: 'Pamela', protegida: true })
    expect(t.nombres).toBeNull()
    expect(t.fecha).toBeNull()
    expect(`${t.titulo} ${t.descripcion}`).not.toMatch(/Camila|octubre/)
  })
})
