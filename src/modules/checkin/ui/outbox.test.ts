import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { openOutbox } from './outbox'

const scan = (scanId: string) => ({
  scanId,
  scanned: 'AbCdEfGhIjKlMnOpQrStUv',
  arrivedCount: 2,
  scannedAtMs: Date.parse('2026-10-18T21:00:00Z'),
  tries: 0,
})

describe('outbox', () => {
  beforeEach(async () => {
    const box = await openOutbox()
    await box.drop((await box.all()).map((s) => s.scanId))
  })

  it('guarda un escaneo y lo devuelve', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    expect((await box.all()).map((s) => s.scanId)).toEqual(['s1'])
  })

  it('sobrevive a cerrar y volver a abrir: es la razón de existir', async () => {
    await (await openOutbox()).push(scan('s1'))
    expect(await (await openOutbox()).count()).toBe(1)
  })

  it('el mismo scanId no se acumula dos veces', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.push(scan('s1'))
    expect(await box.count()).toBe(1)
  })

  it('vacía solo lo aceptado y deja el resto', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.push(scan('s2'))
    await box.drop(['s1'])
    expect((await box.all()).map((s) => s.scanId)).toEqual(['s2'])
  })

  it('mantiene el orden de llegada, que es el orden en que hay que reenviar', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.push(scan('s2'))
    await box.push(scan('s3'))
    expect((await box.all()).map((s) => s.scanId)).toEqual(['s1', 's2', 's3'])
  })

  it('el orden sobrevive a reabrir la bandeja: no se reinicia el contador', async () => {
    await (await openOutbox()).push(scan('s1'))
    const otra = await openOutbox()
    await otra.push(scan('s2'))
    expect((await otra.all()).map((s) => s.scanId)).toEqual(['s1', 's2'])
  })

  it('cuenta los intentos para poder rendirse con criterio', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.bumpTries(['s1'])
    expect((await box.all())[0]?.tries).toBe(1)
  })
})
