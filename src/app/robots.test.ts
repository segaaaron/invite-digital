import { expect, it } from 'vitest'
import robots from './robots'

it('bloquea el panel y las páginas con token', () => {
  const [rule] = robots().rules as Array<{ disallow: string[] }>
  expect(rule?.disallow).toEqual(expect.arrayContaining(['/dashboard', '/i/', '/compartir/', '/api', '/p/', '/v/']))
})

type Regla = { userAgent: string | string[]; allow?: string | string[]; disallow?: string | string[] }
const PRIVADAS = ['/dashboard', '/i/', '/p/', '/v/', '/r/']
const agentes = (r: Regla) => ([] as string[]).concat(r.userAgent)

it('todo grupo con allow "/" cierra las rutas privadas, salvo el de la vista previa', () => {
  const reglas = robots().rules as Regla[]
  for (const r of reglas) {
    if (agentes(r).includes('facebookexternalhit')) continue
    if (!([] as string[]).concat(r.allow ?? []).includes('/')) continue
    expect(r.disallow, agentes(r).join()).toEqual(expect.arrayContaining(PRIVADAS))
  }
})

it('los buscadores de IA entran y el entrenamiento no (opción C); Meta de entrenamiento no ve /i/', () => {
  const reglas = robots().rules as Regla[]
  const de = (ua: string) => reglas.find((r) => agentes(r).includes(ua))
  for (const ua of ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot']) expect(([] as string[]).concat(de(ua)?.allow ?? [])).toContain('/')
  for (const ua of ['GPTBot', 'ClaudeBot', 'CCBot']) expect(de(ua)?.disallow).toBe('/')
  expect(de('Google-Extended')).toBeUndefined()
  expect(agentes(de('facebookexternalhit') as Regla)).not.toContain('meta-externalagent')
})

it('deja leer la invitación a quien arma la vista previa del enlace en WhatsApp', () => {
  const reglas = robots().rules as Array<{ userAgent: string | string[]; allow?: string | string[]; disallow: string[] }>
  const vistaPrevia = reglas.find((r) => Array.isArray(r.userAgent) && r.userAgent.includes('facebookexternalhit'))
  expect(vistaPrevia?.userAgent).toEqual(expect.arrayContaining(['WhatsApp', 'facebookexternalhit']))
  expect(vistaPrevia?.allow).toContain('/i/')
  expect(vistaPrevia?.disallow).not.toContain('/i/')
  expect(vistaPrevia?.disallow).toContain('/dashboard')
})
