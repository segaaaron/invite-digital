import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  camposCambiados,
  DEFAULT_SITE_SETTINGS,
  enlaceWhatsapp,
  formatoWhatsapp,
  leerSiteSettings,
  mensajePlan,
  parseSiteSettings,
  type SiteSettings,
} from './site-settings'

const conCambios = (cambios: Partial<SiteSettings>): SiteSettings => ({ ...DEFAULT_SITE_SETTINGS, ...cambios })

describe('WhatsApp', () => {
  it('normaliza el número a formato internacional y completa el 591 de un celular boliviano', () => {
    const r = leerSiteSettings(conCambios({ whatsapp: '700 12 345' }))
    expect(isOk(r) && r.value.whatsapp).toBe('+59170012345')
    const conPrefijo = leerSiteSettings(conCambios({ whatsapp: '+54 9 11 2345 6789' }))
    expect(isOk(conPrefijo) && conPrefijo.value.whatsapp).toBe('+5491123456789')
  })

  it('un número que no es un número se rechaza señalando el campo', () => {
    const r = leerSiteSettings(conCambios({ whatsapp: '12' }))
    expect(isErr(r) && r.error.campo).toBe('whatsapp')
  })

  it('vacío es «sin configurar», no un error: los botones remiten al formulario', () => {
    const r = leerSiteSettings(conCambios({ whatsapp: '' }))
    expect(isOk(r) && r.value.whatsapp).toBe('')
    expect(enlaceWhatsapp('', 'hola')).toBeNull()
  })

  it('formatea para leer: prefijo y el resto agrupado', () => {
    expect(formatoWhatsapp('+59170012345')).toBe('+591 700 12345')
    expect(formatoWhatsapp('')).toBe('')
  })

  it('el enlace lleva el mensaje codificado', () => {
    expect(enlaceWhatsapp('+59170012345', 'Hola, ¿qué tal?')).toBe('https://wa.me/59170012345?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F')
  })

  it('el mensaje del plan sustituye {plan} y {precio}', () => {
    expect(mensajePlan('Quiero {plan} ({precio})', 'Firma 3D', 'Bs 1.450')).toBe('Quiero Firma 3D (Bs 1.450)')
  })
})

describe('redes', () => {
  it('solo admite enlaces https de la red correspondiente', () => {
    const bien = leerSiteSettings(conCambios({ redes: { instagram: 'https://www.instagram.com/luxuryatelier', facebook: '', tiktok: '' } }))
    expect(isOk(bien)).toBe(true)
    const otraRed = leerSiteSettings(conCambios({ redes: { instagram: 'https://facebook.com/x', facebook: '', tiktok: '' } }))
    expect(isErr(otraRed) && otraRed.error.campo).toBe('redes.instagram')
    const javascript = leerSiteSettings(conCambios({ redes: { instagram: '', facebook: 'javascript:alert(1)', tiktok: '' } }))
    expect(isErr(javascript) && javascript.error.campo).toBe('redes.facebook')
  })
})

describe('pruebas sociales', () => {
  it('las cifras visibles exigen las cuatro completas', () => {
    const items = DEFAULT_SITE_SETTINGS.cifras.items.map((c, i) => (i === 2 ? { ...c, valor: '' } : c))
    const r = leerSiteSettings(conCambios({ cifras: { visibles: true, items: items as unknown as SiteSettings['cifras']['items'] } }))
    expect(isErr(r) && r.error.campo).toBe('cifras.2')
  })

  it('ocultas pueden quedar a medias: no se publican', () => {
    const items = DEFAULT_SITE_SETTINGS.cifras.items.map((c) => ({ ...c, valor: '' }))
    expect(isOk(leerSiteSettings(conCambios({ cifras: { visibles: false, items: items as unknown as SiteSettings['cifras']['items'] } })))).toBe(true)
  })

  it('por defecto las cifras y las marcas NO se publican hasta confirmarlas', () => {
    expect(DEFAULT_SITE_SETTINGS.cifras.visibles).toBe(false)
    expect(DEFAULT_SITE_SETTINGS.marcas).toEqual([])
  })

  it('un testimonio sin confirmar no cuenta como publicado', () => {
    expect(DEFAULT_SITE_SETTINGS.testimonios.every((t) => typeof t.confirmado === 'boolean')).toBe(true)
  })
})

describe('parseSiteSettings', () => {
  it('sin fila devuelve los valores por defecto', () => {
    expect(parseSiteSettings(undefined)).toEqual(DEFAULT_SITE_SETTINGS)
  })

  it('JSON roto no revienta: vuelve a los valores por defecto', () => {
    expect(parseSiteSettings('{roto')).toEqual(DEFAULT_SITE_SETTINGS)
  })

  it('un JSON viejo sin campos nuevos los completa con los de por defecto', () => {
    const parcial = parseSiteSettings(JSON.stringify({ whatsapp: '+59171111111', ciudad: 'La Paz' }))
    expect(parcial.whatsapp).toBe('+59171111111')
    expect(parcial.ciudad).toBe('La Paz')
    expect(parcial.pais).toBe(DEFAULT_SITE_SETTINGS.pais)
    expect(parcial.legal).toEqual(DEFAULT_SITE_SETTINGS.legal)
  })

  it('descarta tipos que no son los esperados', () => {
    const raro = parseSiteSettings(JSON.stringify({ whatsapp: 5, marcas: 'x', cifras: { visibles: 'si' } }))
    expect(raro.whatsapp).toBe(DEFAULT_SITE_SETTINGS.whatsapp)
    expect(raro.marcas).toEqual([])
    expect(raro.cifras.visibles).toBe(false)
  })
})

describe('camposCambiados', () => {
  it('dice qué bloques cambiaron, para la auditoría', () => {
    const despues = conCambios({ ciudad: 'La Paz', whatsapp: '+59171111111' })
    expect(camposCambiados(DEFAULT_SITE_SETTINGS, despues)).toEqual(['ciudad', 'whatsapp'])
  })
})

describe('legal', () => {
  it('publicar la política de privacidad exige texto', () => {
    const r = leerSiteSettings(conCambios({ legal: { ...DEFAULT_SITE_SETTINGS.legal, privacidad: { publicada: true, es: '  ', en: '' } } }))
    expect(isErr(r) && r.error.campo).toBe('legal.privacidad')
  })
})
