import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy, createNonce } from './csp'

describe('buildContentSecurityPolicy', () => {
  it('lleva el nonce a script-src y no abre unsafe-inline para scripts', () => {
    const policy = buildContentSecurityPolicy('abc123')
    expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'")
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(policy).not.toMatch(/script-src[^;]*unsafe-eval/)
  })

  it('prohíbe el enmarcado y los objetos, y fija base-uri y form-action', () => {
    const policy = buildContentSecurityPolicy('abc123')
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
    expect(policy).toContain("form-action 'self'")
  })
})

describe('createNonce', () => {
  it('genera un valor distinto en cada llamada', () => {
    expect(createNonce()).not.toBe(createNonce())
  })

  it('devuelve base64 no vacío', () => {
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })
})
