import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { resolveLocally, sha256Hex } from './local-resolve'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
const HASH = createHash('sha256').update(TOKEN).digest('hex')

const groups = [{ id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, tokenHashHex: HASH }]

describe('sha256Hex', () => {
  it('produce el mismo hash que el servidor', async () => {
    // El servidor usa createHash('sha256').update(token) sobre la misma cadena.
    expect(await sha256Hex(TOKEN)).toBe(HASH)
  })
})

describe('resolveLocally', () => {
  it('reconoce un pase del evento sin preguntar al servidor', async () => {
    const r = await resolveLocally(`https://x.bo/i/${TOKEN}`, groups, new Set())
    expect(r.kind).toBe('welcome')
    expect(r.group?.label).toBe('Familia Rojas Peña')
    expect(r.arrivedCount).toBe(4)
  })

  it('avisa de repetido si el grupo ya está registrado', async () => {
    const r = await resolveLocally(TOKEN, groups, new Set(['g1']))
    expect(r.kind).toBe('already')
  })

  it('un pase de otro evento no está en el manifiesto: desconocido', async () => {
    const r = await resolveLocally('ZzYyXxWwVvUuTtSsRrQqPp', groups, new Set())
    expect(r.kind).toBe('unknown')
  })

  it('un QR de la calle es desconocido sin llegar a hashear', async () => {
    expect((await resolveLocally('https://coca-cola.com', groups, new Set())).kind).toBe('unknown')
  })

  it('arranca en 1 cuando el grupo no confirmó', async () => {
    const sinConfirmar = [{ ...groups[0]!, attending: null }]
    const r = await resolveLocally(TOKEN, sinConfirmar, new Set())
    expect(r.arrivedCount).toBe(1)
  })
})
