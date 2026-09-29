import { describe, expect, it } from 'vitest'
import {
  avisoDeAgenda,
  avisoDeApertura,
  avisoDeMensaje,
  avisoDeRegalo,
  avisoDeRespuesta,
  avisoDeVenta,
  cargaPush,
  destinatariosDelEvento,
  leEnviamosPush,
  TIPOS_DE_AVISO,
} from './avisos'

const evento = { titulo: 'Boda de Ana y Luis', slug: 'boda-ana' }

describe('lo que dice cada aviso', () => {
  it('una confirmación dice quién, cuántos lugares y lleva a Invitados', () => {
    expect(avisoDeRespuesta({ ...evento, invitado: 'Familia Pérez', lugares: 3 })).toEqual({
      kind: 'rsvp',
      title: 'Familia Pérez confirmó 3 lugares',
      body: 'Boda de Ana y Luis',
      href: '/panel/eventos/boda-ana/invitados',
    })
    expect(avisoDeRespuesta({ ...evento, invitado: 'Ramón', lugares: 1 }).title).toBe('Ramón confirmó su asistencia')
    expect(avisoDeRespuesta({ ...evento, invitado: 'Ramón', lugares: 0 }).title).toBe('Ramón no podrá asistir')
  })

  it('un mensaje trae sus palabras, recortadas, y lleva a Mensajes', () => {
    const largo = 'a'.repeat(300)
    const aviso = avisoDeMensaje({ ...evento, invitado: 'Tía Marta', texto: `  ${largo}  ` })
    expect(aviso.title).toBe('Tía Marta te dejó un mensaje')
    expect(aviso.body.length).toBeLessThanOrEqual(140)
    expect(aviso.body.endsWith('…')).toBe(true)
    expect(aviso.href).toBe('/panel/eventos/boda-ana/mensajes')
  })

  it('la primera apertura, el regalo reservado y lo que vence mañana', () => {
    expect(avisoDeApertura({ ...evento, invitado: 'Ramón' })).toMatchObject({ kind: 'apertura', title: 'Ramón abrió su invitación' })
    expect(avisoDeRegalo({ ...evento, invitado: 'Familia Pérez', regalo: 'Cafetera' })).toMatchObject({
      kind: 'regalo',
      title: 'Familia Pérez reservó «Cafetera»',
      href: '/panel/eventos/boda-ana/regalos',
    })
    expect(avisoDeAgenda({ ...evento, que: 'Pagar al fotógrafo', cuando: 'mañana', ruta: '/planner/presupuesto' })).toEqual({
      kind: 'agenda',
      title: 'Mañana: Pagar al fotógrafo',
      body: 'Boda de Ana y Luis',
      href: '/panel/eventos/boda-ana/planner/presupuesto',
    })
  })

  it('los del admin llevan a su pantalla', () => {
    expect(avisoDeVenta({ titulo: 'Nueva consulta de Carla', detalle: 'Boda · 14 feb', ruta: '/panel/admin/ventas' })).toEqual({
      kind: 'venta',
      title: 'Nueva consulta de Carla',
      body: 'Boda · 14 feb',
      href: '/panel/admin/ventas',
    })
  })
})

describe('la notificación push', () => {
  it('lleva título, texto, a dónde abrir y una etiqueta por evento y tipo para no amontonarse', () => {
    const aviso = avisoDeRespuesta({ ...evento, invitado: 'Ramón', lugares: 1 })
    expect(cargaPush(aviso, 'e1')).toEqual({ title: 'Ramón confirmó su asistencia', body: 'Boda de Ana y Luis', url: aviso.href, tag: 'rsvp:e1' })
    expect(cargaPush(avisoDeVenta({ titulo: 't', detalle: '', ruta: '/panel/admin' }), null).tag).toBe('venta')
  })
})

describe('quién lo recibe', () => {
  it('el anfitrión, su planner y el atelier dueño; nunca el admin ni la recepción, y cada uno una vez', () => {
    const quienes = destinatariosDelEvento({
      dueno: { userId: 'atelier', role: 'atelier' },
      equipo: [
        { userId: 'novia', role: 'cliente', membership: 'cliente' },
        { userId: 'planner', role: 'atelier', membership: 'planner' },
        { userId: 'puerta', role: 'puerta', membership: 'puerta' },
        { userId: 'atelier', role: 'atelier', membership: 'planner' },
      ],
    })
    expect(quienes).toEqual(['atelier', 'novia', 'planner'])
  })

  it('un evento creado por el admin para un cliente no le avisa al admin: no ve los datos de las bodas', () => {
    expect(destinatariosDelEvento({ dueno: { userId: 'admin', role: 'admin' }, equipo: [{ userId: 'novia', role: 'cliente', membership: 'cliente' }] })).toEqual(['novia'])
  })

  it('lo silenciado no va a sus aparatos', () => {
    expect(leEnviamosPush(['rsvp'], 'rsvp')).toBe(false)
    expect(leEnviamosPush(['rsvp'], 'mensaje')).toBe(true)
    expect(TIPOS_DE_AVISO).toContain('apertura')
  })
})
