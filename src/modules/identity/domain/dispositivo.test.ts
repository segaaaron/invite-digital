import { describe, expect, it } from 'vitest'
import { describirDispositivo } from './dispositivo'

describe('describirDispositivo', () => {
  it('dice el aparato y el navegador, que es lo que la persona reconoce', () => {
    expect(describirDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari')
    expect(describirDispositivo('Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36')).toBe('Android · Chrome')
    expect(describirDispositivo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36')).toBe('Mac · Chrome')
    expect(describirDispositivo('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0')).toBe('Windows · Edge')
    expect(describirDispositivo('Mozilla/5.0 (Windows NT 10.0; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe('Windows · Firefox')
  })

  it('sin agente, algo legible y no una cadena vacía', () => {
    expect(describirDispositivo('')).toBe('Dispositivo desconocido')
  })
})
