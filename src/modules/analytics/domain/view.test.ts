import { describe, expect, it } from 'vitest'
import { classifyDevice, classifySource, createView } from './view'
import { isErr, isOk } from '@/shared/result'

describe('classifyDevice', () => {
  it('un iPad es tableta aunque su agente diga Macintosh', () => {
    // Safari en iPad se presenta como escritorio desde iPadOS 13. Comprobar «mobile»
    // antes que «tablet» metería todas las tabletas en la columna equivocada.
    expect(classifyDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit')).toBe('tablet')
  })

  it('un Android sin «Mobile» es tableta, y con «Mobile» es móvil', () => {
    expect(classifyDevice('Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit')).toBe('tablet')
    expect(classifyDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8 Mobile) AppleWebKit')).toBe('mobile')
  })

  it('un iPhone es móvil y un portátil es escritorio', () => {
    expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mobile')
    expect(classifyDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit')).toBe('desktop')
  })
})

describe('classifySource', () => {
  it('utm_source manda sobre el referente', () => {
    expect(classifySource('whatsapp', 'https://google.com')).toBe('whatsapp')
    expect(classifySource('qr', null)).toBe('qr')
  })

  it('sin utm, deduce del referente, y sin nada es directo', () => {
    expect(classifySource(null, 'https://web.whatsapp.com/')).toBe('whatsapp')
    expect(classifySource(null, 'https://instagram.com/')).toBe('other')
    expect(classifySource(null, null)).toBe('direct')
    expect(classifySource('', '')).toBe('direct')
  })
})

describe('createView', () => {
  it('rechaza categorías que no existen en vez de escribirlas', () => {
    const roto = createView({ eventId: 'e', guestGroupId: null, device: 'nevera', source: 'qr', viewedAt: new Date() })
    expect(isErr(roto)).toBe(true)
  })

  it('acepta una visita del cliente, sin grupo', () => {
    const vista = createView({ eventId: 'e', guestGroupId: null, device: 'mobile', source: 'direct', viewedAt: new Date() })
    expect(isOk(vista)).toBe(true)
  })
})
