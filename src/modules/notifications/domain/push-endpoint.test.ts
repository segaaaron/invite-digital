import { describe, expect, it } from 'vitest'
import { esEndpointDePush } from './push-endpoint'

describe('esEndpointDePush', () => {
  it('acepta los servicios de verdad, con sus subdominios', () => {
    expect(esEndpointDePush('https://fcm.googleapis.com/fcm/send/abc123')).toBe(true)
    expect(esEndpointDePush('https://updates.push.services.mozilla.com/wpush/v2/gAAA')).toBe(true)
    expect(esEndpointDePush('https://web.push.apple.com/QWxhZGRpbjpvcGVu')).toBe(true)
    expect(esEndpointDePush('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true)
  })

  // F20: con cualquier `https://` valía, y el aviso de prueba decía si el host había respondido.
  it('rechaza cualquier otro destino, que es lo que lo convertía en un escáner', () => {
    expect(esEndpointDePush('https://host-interno:8443/ruta')).toBe(false)
    expect(esEndpointDePush('https://192.168.1.10/push')).toBe(false)
    expect(esEndpointDePush('https://ejemplo.bo/push')).toBe(false)
    expect(esEndpointDePush('http://fcm.googleapis.com/fcm/send/abc')).toBe(false)
  })

  it('no se deja engañar por el nombre del servicio dentro de otro dominio', () => {
    expect(esEndpointDePush('https://fcm.googleapis.com.ejemplo.bo/push')).toBe(false)
    expect(esEndpointDePush('https://xfcm.googleapis.com/push')).toBe(false)
  })

  it('rechaza puerto propio, credenciales en la URL y lo que no es una URL', () => {
    expect(esEndpointDePush('https://fcm.googleapis.com:8443/fcm/send/abc')).toBe(false)
    expect(esEndpointDePush('https://usuario:clave@fcm.googleapis.com/fcm/send/abc')).toBe(false)
    expect(esEndpointDePush('no es una url')).toBe(false)
    expect(esEndpointDePush(`https://fcm.googleapis.com/${'x'.repeat(1200)}`)).toBe(false)
  })
})
