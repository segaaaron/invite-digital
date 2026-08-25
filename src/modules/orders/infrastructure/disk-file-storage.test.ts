import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createDiskFileStorage } from './disk-file-storage'

const raiz = mkdtempSync(join(tmpdir(), 'comprobantes-'))
const almacen = createDiskFileStorage(raiz)

afterAll(() => rmSync(raiz, { recursive: true, force: true }))

describe('createDiskFileStorage', () => {
  it('guarda y devuelve los mismos bytes', async () => {
    await almacen.put('abc', Buffer.from([1, 2, 3]))

    expect(Buffer.from((await almacen.get('abc'))!)).toEqual(Buffer.from([1, 2, 3]))
  })

  it('una clave que no existe es null, no un error', async () => {
    expect(await almacen.get('no-existe')).toBeNull()
  })

  it('una clave con separadores no escapa del directorio', async () => {
    // La clave la pone el servidor —es un UUID—, pero esta es la última defensa: si
    // alguna vez llegase a componerse con algo del cliente, no puede escribir fuera.
    await expect(almacen.put('../fuera', Buffer.from([9]))).rejects.toThrow(/clave/i)
    await expect(almacen.get('../../etc/passwd')).rejects.toThrow(/clave/i)
  })
})
