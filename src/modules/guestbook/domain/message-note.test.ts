import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createReply, isFeatured, isUnread, MAX_REPLY_LENGTH } from './message-note'

const valor = (r: ReturnType<typeof createReply>): string => {
  if (isErr(r)) throw new Error(`se esperaba ok, llegó ${r.error.kind}: ${r.error.detail}`)
  return r.value
}

describe('createReply', () => {
  it('acepta una respuesta normal', () => {
    expect(isOk(createReply('¡Gracias, nos vemos!'))).toBe(true)
  })

  it('recorta los espacios de los extremos', () => {
    expect(valor(createReply('  gracias  '))).toBe('gracias')
  })

  it('rechaza vacío', () => {
    expect(isErr(createReply(''))).toBe(true)
  })

  it('rechaza solo espacios', () => {
    expect(isErr(createReply('   '))).toBe(true)
  })

  it('el rechazo dice que la respuesta está vacía', () => {
    const r = createReply('   ')
    expect(isErr(r) && r.error.kind).toBe('invalid_reply')
  })

  it('acepta justo mil caracteres', () => {
    expect(isOk(createReply('a'.repeat(MAX_REPLY_LENGTH)))).toBe(true)
  })

  it('rechaza mil uno', () => {
    expect(isErr(createReply('a'.repeat(MAX_REPLY_LENGTH + 1)))).toBe(true)
  })

  it('el rechazo por largo lleva el límite en el mensaje', () => {
    const r = createReply('a'.repeat(MAX_REPLY_LENGTH + 1))
    expect(isErr(r) && r.error.detail).toContain(String(MAX_REPLY_LENGTH))
  })

  it('cuenta el largo después de recortar: mil caracteres entre espacios caben', () => {
    expect(isOk(createReply(`  ${'a'.repeat(MAX_REPLY_LENGTH)}  `))).toBe(true)
  })
})

describe('isUnread', () => {
  it('sin readAt está sin leer', () => {
    expect(isUnread({ readAt: null })).toBe(true)
  })

  it('con readAt está leído', () => {
    expect(isUnread({ readAt: new Date() })).toBe(false)
  })
})

describe('isFeatured', () => {
  it('sin featuredAt no está destacado', () => {
    expect(isFeatured({ featuredAt: null })).toBe(false)
  })

  it('con featuredAt está destacado', () => {
    expect(isFeatured({ featuredAt: new Date() })).toBe(true)
  })
})
