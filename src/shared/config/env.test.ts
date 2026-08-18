import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const valid = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/invite',
  SITE_URL: 'https://invitepremium.bo',
  NODE_ENV: 'production',
}

describe('parseEnv', () => {
  it('acepta un entorno válido', () => {
    expect(parseEnv(valid).SITE_URL).toBe('https://invitepremium.bo')
  })

  it('lanza cuando falta DATABASE_URL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/)
  })

  it('lanza cuando SITE_URL no es una URL', () => {
    expect(() => parseEnv({ ...valid, SITE_URL: 'no-es-url' })).toThrow(/SITE_URL/)
  })
})
