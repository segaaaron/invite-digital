import { describe, expect, it } from 'vitest'
import { IP_DESCONOCIDA, clientIpFrom, cuboDeIp, cuboDeLaPeticion } from '@/shared/http/client-ip'

describe('clientIpFrom', () => {
  it('prefiere x-real-ip, que escribe el proxy', () => {
    expect(clientIpFrom({ realIp: '200.1.2.3', forwardedFor: '9.9.9.9' })).toBe('200.1.2.3')
  })

  it('ignora la parte falsificable de la cadena y toma la última entrada', () => {
    expect(clientIpFrom({ realIp: null, forwardedFor: '1.2.3.4, 200.1.2.3' })).toBe('200.1.2.3')
  })

  it('funciona con un solo valor', () => {
    expect(clientIpFrom({ realIp: null, forwardedFor: '200.1.2.3' })).toBe('200.1.2.3')
  })

  it('devuelve un marcador cuando no hay ninguna cabecera', () => {
    expect(clientIpFrom({ realIp: null, forwardedFor: null })).toBe('desconocida')
    expect(clientIpFrom({ realIp: '  ', forwardedFor: '  ' })).toBe('desconocida')
  })
})

describe('cuboDeIp', () => {
  it('una IPv4 es su propia clave: agrupar castigaría a una oficina entera', () => {
    expect(cuboDeIp('181.188.1.5')).toBe('181.188.1.5')
    expect(cuboDeIp('::ffff:181.188.1.5')).toBe('181.188.1.5')
  })

  it('una IPv6 cuenta por su /64: rotar direcciones dentro de la misma no salta el limitador', () => {
    const uno = cuboDeIp('2800:cd0:1234:5678:1::1')
    expect(cuboDeIp('2800:cd0:1234:5678:ffff:ffff:ffff:ffff')).toBe(uno)
    expect(cuboDeIp('2800:0cd0:1234:5678::9')).toBe(uno)
  })

  it('y dos /64 distintas no se confunden', () => {
    expect(cuboDeIp('2800:cd0:1234:5678::1')).not.toBe(cuboDeIp('2800:cd0:1234:9999::1'))
  })

  it('aguanta lo corto, lo raro y el identificador de zona', () => {
    expect(cuboDeIp('::1')).toBe('0:0:0:0::/64')
    expect(cuboDeIp('fe80::1%eth0')).toBe('fe80:0:0:0::/64')
    expect(cuboDeIp('desconocida')).toBe('desconocida')
  })
})

/**
 * La clave que de verdad usan los limitadores. Existe porque el cubo había que **acordarse** de
 * aplicarlo, y donde se olvidaba el límite no limitaba nada: los comprobantes de pedidos y el
 * registro de fallos del navegador contaban por dirección completa (F2 y F3 del 20 oct).
 */
describe('cuboDeLaPeticion', () => {
  it('es la dirección en IPv4 y la /64 en IPv6, en un solo paso', () => {
    expect(cuboDeLaPeticion({ realIp: '181.188.1.5', forwardedFor: null })).toBe('181.188.1.5')
    const uno = cuboDeLaPeticion({ realIp: '2800:cd0:1234:5678::1', forwardedFor: null })
    expect(cuboDeLaPeticion({ realIp: '2800:cd0:1234:5678:aaaa::9', forwardedFor: null })).toBe(uno)
  })

  it('y aplicarlo dos veces da lo mismo: el cubo de un cubo es el cubo', () => {
    const cubo = cuboDeLaPeticion({ realIp: '2800:cd0:1234:5678::1', forwardedFor: null })
    expect(cuboDeIp(cubo)).toBe(cubo)
  })

  it('sin ninguna cabecera cae al cubo compartido, que es el caso que hay que ver en el registro', () => {
    expect(cuboDeLaPeticion({ realIp: null, forwardedFor: null })).toBe(IP_DESCONOCIDA)
  })
})
