import { describe, expect, it } from 'vitest'
import { clientIpFrom } from '@/shared/http/client-ip'

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
