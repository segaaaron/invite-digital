import { expect, it } from 'vitest'
import robots from './robots'

it('bloquea el panel y las páginas con token', () => {
  const [rule] = robots().rules as Array<{ disallow: string[] }>
  expect(rule?.disallow).toEqual(expect.arrayContaining(['/panel', '/i/', '/compartir/', '/api', '/p/', '/v/']))
})

it('deja leer la invitación a quien arma la vista previa del enlace en WhatsApp', () => {
  const reglas = robots().rules as Array<{ userAgent: string | string[]; allow?: string | string[]; disallow: string[] }>
  const vistaPrevia = reglas.find((r) => Array.isArray(r.userAgent) && r.userAgent.includes('facebookexternalhit'))
  expect(vistaPrevia?.userAgent).toEqual(expect.arrayContaining(['WhatsApp', 'facebookexternalhit']))
  expect(vistaPrevia?.allow).toContain('/i/')
  expect(vistaPrevia?.disallow).not.toContain('/i/')
  expect(vistaPrevia?.disallow).toContain('/panel')
})
