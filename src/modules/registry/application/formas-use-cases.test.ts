import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { SIN_FORMAS, type FormasDeRegalar } from '../domain/formas-de-regalar'
import type { FormasDeRegalarStore, ImagenDeQr } from './ports'
import { guardarFormasDeRegalar, MAX_QR_BYTES } from './formas-use-cases'

const almacen = (inicial: FormasDeRegalar = SIN_FORMAS) => {
  let formas = inicial
  let qr: ImagenDeQr | null = inicial.tieneQr ? { bytes: new Uint8Array([1]), tipo: 'image/png' } : null
  const store: FormasDeRegalarStore = {
    leer: async () => ({ ...formas, tieneQr: qr !== null }),
    guardar: async (_id, datos, imagen) => {
      formas = { ...datos, tieneQr: false }
      if (imagen === 'quitar') qr = null
      else if (imagen !== 'mantener') qr = imagen
    },
    qr: async () => qr,
  }
  return { store, qrActual: () => qr }
}
const tipoDeImagen = (bytes: Uint8Array) => (bytes[0] === 0x89 ? 'image/png' : null)
const soloQr = { sobres: false, transferencia: true }

describe('guardarFormasDeRegalar', () => {
  it('una transferencia solo con QR vale si se sube el QR en ese mismo guardado', async () => {
    const { store, qrActual } = almacen()
    const r = await guardarFormasDeRegalar({ formas: store, tipoDeImagen })({ eventId: 'e', entrada: soloQr, qr: { bytes: new Uint8Array([0x89, 1]) } })
    expect(isOk(r)).toBe(true)
    expect(qrActual()?.tipo).toBe('image/png')
  })

  it('quitar el único QR de una transferencia sin cuenta se rechaza y no escribe nada', async () => {
    const { store, qrActual } = almacen({ ...SIN_FORMAS, transferencia: true, tieneQr: true })
    const r = await guardarFormasDeRegalar({ formas: store, tipoDeImagen })({ eventId: 'e', entrada: soloQr, qr: 'quitar' })
    expect(isErr(r)).toBe(true)
    expect(qrActual()).not.toBeNull()
  })

  it('rechaza lo que no es imagen por sus bytes y lo que pesa de más', async () => {
    const { store } = almacen()
    const guardar = guardarFormasDeRegalar({ formas: store, tipoDeImagen })
    expect(isErr(await guardar({ eventId: 'e', entrada: soloQr, qr: { bytes: new Uint8Array([0x25, 0x50]) } }))).toBe(true)
    expect(isErr(await guardar({ eventId: 'e', entrada: soloQr, qr: { bytes: new Uint8Array(MAX_QR_BYTES + 1).fill(0x89) } }))).toBe(true)
  })
})
