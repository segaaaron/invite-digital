import { describe, expect, it } from 'vitest'
import { acompanamientoEmail, graciasPorRecomendarEmail } from './acompanamiento-email'

const base = { evento: 'Carla & Diego', fecha: 'sáb 14 feb 2027', dias: 40, grupos: 30, respondidos: 10, enlacePanel: 'https://x.bo/panel/eventos/c', enlaceOpinion: 'https://x.bo/es/opinion/T', siteUrl: 'https://x.bo' }

describe('correos de acompañamiento', () => {
  it('cada aviso dice una sola cosa y lleva su enlace', () => {
    const escribir = acompanamientoEmail({ ...base, tipo: 'hito-escribir' })
    expect(escribir.subject).toBe('Carla & Diego: es buen momento para escribir tu invitación')
    expect(escribir.text).toContain('faltan 40 días')
    expect(escribir.text).toContain('https://x.bo/panel/eventos/c')
    const rsvp = acompanamientoEmail({ ...base, tipo: 'rsvp-bajo' })
    expect(rsvp.text).toContain('Respondieron 10 de tus 30 invitaciones')
  })

  it('la encuesta y el aniversario llevan el código de recomendación; los demás, no', () => {
    const referido = { codigo: 'K7M2QX', descuento: 10, enlace: 'https://x.bo/es?ref=K7M2QX#precios' }
    expect(acompanamientoEmail({ ...base, tipo: 'encuesta', referido }).text).toContain('pásale tu código K7M2QX: que lo escriba al hacer su pedido y tendrá un 10 % de descuento. O mándale este enlace, que ya lo lleva puesto: https://x.bo/es?ref=K7M2QX#precios')
    expect(acompanamientoEmail({ ...base, tipo: 'aniversario', referido: { ...referido, descuento: 0 } }).text).toContain('que lo escriba al hacer su pedido. O mándale')
    expect(acompanamientoEmail({ ...base, tipo: 'hito-escribir', referido }).text).not.toContain('K7M2QX')
  })

  it('la encuesta lleva a la opinión, no al panel, y el HTML va escapado', () => {
    const e = acompanamientoEmail({ ...base, tipo: 'encuesta', evento: '<b>Ana</b>' })
    expect(e.text).toContain('https://x.bo/es/opinion/T')
    expect(e.html).not.toContain('<b>Ana</b>')
  })

  it('las gracias a quien recomendó nombran a quien llegó y van escapadas', () => {
    const g = graciasPorRecomendarEmail({ evento: 'Carla & Diego', quien: '<i>Lucía</i>', siteUrl: 'https://x.bo' })
    expect(g.text).toContain('<i>Lucía</i> confió en nosotros para su fiesta gracias a tu recomendación de Carla & Diego.')
    expect(g.html).not.toContain('<i>Lucía</i>')
  })
})
