import { describe, expect, it } from 'vitest'
import { ESTADOS_DE_PROVEEDOR, leerProveedor, nombreDelCortejo, proveedoresSinConfirmar, TIPOS_DE_CORTEJO } from './equipo-del-dia'

describe('proveedores', () => {
  it('pide servicio y deja el resto opcional; valida correo, hora y estado', () => {
    expect(leerProveedor({ service: '', company: '', contactName: '', whatsapp: '', email: '', status: 'cotizando', arrivalTime: '', setupNotes: '' })).toMatchObject({ ok: false })
    expect(leerProveedor({ service: 'DJ', company: '', contactName: '', whatsapp: '', email: 'no', status: 'cotizando', arrivalTime: '', setupNotes: '' })).toMatchObject({ ok: false })
    expect(leerProveedor({ service: 'DJ', company: '', contactName: '', whatsapp: '', email: '', status: 'cotizando', arrivalTime: '25:00', setupNotes: '' })).toMatchObject({ ok: false })
    expect(leerProveedor({ service: 'DJ', company: '', contactName: '', whatsapp: '', email: '', status: 'fiado', arrivalTime: '', setupNotes: '' })).toMatchObject({ ok: false })
    expect(leerProveedor({ service: ' DJ ', company: 'Beat', contactName: '', whatsapp: '70012345', email: 'dj@beat.bo', status: 'contratado', arrivalTime: '17:30', setupNotes: '' })).toEqual({
      ok: true,
      valor: { service: 'DJ', company: 'Beat', contactName: null, whatsapp: '70012345', email: 'dj@beat.bo', status: 'contratado', arrivalTime: '17:30', setupNotes: null },
    })
  })

  it('los estados van en el orden del trato', () => expect(ESTADOS_DE_PROVEEDOR).toEqual(['cotizando', 'reservado', 'contratado', 'confirmado']))

  it('sin confirmar son los contratados o reservados que no confirmaron', () => {
    expect(proveedoresSinConfirmar([{ id: 'a', status: 'contratado' }, { id: 'b', status: 'confirmado' }, { id: 'c', status: 'cotizando' }]).map((p) => p.id)).toEqual(['a'])
  })
})

describe('cortejo', () => {
  it('la boda tiene damas y caballeros; XV, chambelanes y corte de honor; los dos, padrinos', () => {
    expect(TIPOS_DE_CORTEJO.boda).toEqual(['padrino', 'dama', 'caballero'])
    expect(TIPOS_DE_CORTEJO.xv).toEqual(['padrino', 'chambelan', 'corte'])
    expect(nombreDelCortejo('chambelan')).toBe('Chambelán')
  })
})
