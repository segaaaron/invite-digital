import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { parsePass } from './parse-pass'

// 16 bytes en base64url son 22 caracteres.
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'

describe('parsePass', () => {
  it('acepta la URL de invitación completa', () => {
    const r = parsePass(`https://invitepremium.bo/i/${TOKEN}`)
    expect(isOk(r) && r.value).toBe(TOKEN)
  })

  it('acepta el token pelado, que es lo que teclea un lector USB', () => {
    const r = parsePass(TOKEN)
    expect(isOk(r) && r.value).toBe(TOKEN)
  })

  it('tolera espacios alrededor', () => {
    expect(isOk(parsePass(`  ${TOKEN}  `))).toBe(true)
  })

  it('acepta la URL con barra final o parámetros', () => {
    expect(isOk(parsePass(`https://x.bo/i/${TOKEN}/`))).toBe(true)
    expect(isOk(parsePass(`https://x.bo/i/${TOKEN}?utm=wa`))).toBe(true)
  })

  it('rechaza un QR cualquiera de la calle sin tocar la base', () => {
    expect(isErr(parsePass('https://www.coca-cola.com/promo'))).toBe(true)
    expect(isErr(parsePass('BEGIN:VCARD'))).toBe(true)
    expect(isErr(parsePass(''))).toBe(true)
  })

  it('rechaza una longitud que no es la del token', () => {
    expect(isErr(parsePass('AbCdEf'))).toBe(true)
    expect(isErr(parsePass(`${TOKEN}XX`))).toBe(true)
  })

  it('rechaza caracteres fuera de base64url', () => {
    expect(isErr(parsePass('AbCdEfGhIjKlMnOpQrStU+'))).toBe(true)
  })

  it('rechaza una URL de este sitio que no sea de invitación', () => {
    expect(isErr(parsePass(`https://x.bo/compartir/${TOKEN}`))).toBe(true)
  })
})
