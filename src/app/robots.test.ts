import { expect, it } from 'vitest'
import robots from './robots'

it('bloquea el panel y las páginas con token', () => {
  const [rule] = robots().rules as Array<{ disallow: string[] }>
  expect(rule?.disallow).toEqual(expect.arrayContaining(['/panel', '/i/', '/compartir/', '/api']))
})
