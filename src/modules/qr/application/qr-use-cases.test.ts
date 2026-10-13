import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { QrRepository, QrRow } from './ports'
import { resolveQrCode } from './qr-use-cases'

const ID = '7b0f6c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e'
const fila = (eventId: string | null): QrRow => ({ id: ID, userId: null, eventId, label: 'Mesa de regalos', kind: 'custom', target: 'https://tienda.bo', active: true, scanCount: 0, lastScanAt: null, createdAt: new Date() })
const repo = (row: QrRow) => {
  const countScan = vi.fn(async () => undefined)
  return { repo: { findById: async () => row, countScan } as unknown as QrRepository, countScan }
}

describe('resolveQrCode: el cartel de un evento celebrado ya no lleva a ninguna parte (13 oct)', () => {
  it('con el evento celebrado responde «no existe» y no cuenta el escaneo', async () => {
    const { repo: qr, countScan } = repo(fila('e1'))
    const r = await resolveQrCode({ qr, ids: () => 'x', clock: () => new Date(), eventoTerminado: async () => true })(ID)
    expect(isErr(r) && r.error.kind).toBe('not_found')
    expect(countScan).not.toHaveBeenCalled()
  })

  it('con el evento por venir, o sin evento, redirige como siempre', async () => {
    const vivo = await resolveQrCode({ qr: repo(fila('e1')).repo, ids: () => 'x', clock: () => new Date(), eventoTerminado: async () => false })(ID)
    expect(isOk(vivo) && vivo.value.target).toBe('https://tienda.bo')
    const suelto = await resolveQrCode({ qr: repo(fila(null)).repo, ids: () => 'x', clock: () => new Date(), eventoTerminado: async () => true })(ID)
    expect(isOk(suelto)).toBe(true)
  })
})
