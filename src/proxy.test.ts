import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

const request = (path: string) => new NextRequest(new URL(`http://localhost:3000${path}`))

describe('proxy', () => {
  it('pone CSP en las rutas del panel y del invitado', () => {
    for (const path of ['/panel', '/panel/entrar', '/i/abc123', '/compartir/xyz']) {
      const response = proxy(request(path))
      expect(response.headers.get('Content-Security-Policy'), path).toContain("script-src 'self' 'nonce-")
    }
  })

  it('sigue sin tocar /api ni /_next', () => {
    expect(proxy(request('/api/cualquiera')).headers.get('Content-Security-Policy')).toBeNull()
  })

  it('redirige la raíz al idioma negociado', () => {
    expect(proxy(request('/')).status).toBe(307)
  })
})
