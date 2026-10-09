import { describe, expect, it } from 'vitest'
import { explicarFallo } from './explicar'

describe('explicarFallo', () => {
  it('una consulta que falla se dice con lo que se leía y dónde, y la causa en palabras', () => {
    const f = explicarFallo({
      servicio: 'route:/media/[id]',
      mensaje: 'Failed query: select "id", "event_id", "content_type" from "event_media" where "event_media"."id" = $1 limit $2 params: no-existe,1',
      detalle: 'Error: Failed query…\n\ncausado por: error: invalid input syntax for type uuid: "no-existe"',
      ruta: '/media/no-existe',
    })
    expect(f).toEqual({
      titulo: 'No se pudo leer las fotos y canciones',
      donde: 'Fotos y música de las invitaciones',
      pista: expect.stringContaining('identificador que no existe'),
    })
  })

  it('lo que escribimos delante del error técnico es el título', () => {
    const f = explicarFallo({ servicio: 'route:/r/[id]', mensaje: 'No se pudo resolver el código: Error: Failed query: select "id" from "qr_codes" …', detalle: '', ruta: '/r/x' })
    expect(f.titulo).toBe('No se pudo resolver el código')
    expect(f.donde).toBe('Códigos QR')
  })

  it('un fallo del navegador dice la pantalla; uno de un módulo, el servicio', () => {
    const voz = explicarFallo({ servicio: 'navegador', mensaje: 'Voz de Luxury: el micrófono se cerró sin oír nada', detalle: 'Mozilla/5.0 (iPhone…)', ruta: '/panel/eventos/x/invitados' })
    expect(voz.titulo).toBe('La voz de Luxury: el micrófono se cerró sin oír nada')
    expect(voz.donde).toBe('Panel')
    expect(voz.pista).toContain('no oyó a nadie')
    const correo = explicarFallo({ servicio: 'orders/actions', mensaje: 'no se pudo enviar por correo el acceso del pedido EKPKW93K', detalle: '', ruta: '/panel/admin/ventas' })
    expect(correo).toEqual({ titulo: 'No se pudo enviar por correo el acceso del pedido EKPKW93K', donde: 'Ventas y pedidos', pista: expect.stringContaining('Resend') })
  })

  it('lo que no se reconoce se enseña tal cual, sin inventar causa', () => {
    expect(explicarFallo({ servicio: 'otra/cosa', mensaje: 'algo raro', detalle: '', ruta: null })).toEqual({ titulo: 'Algo raro', donde: 'otra/cosa', pista: null })
  })
})
