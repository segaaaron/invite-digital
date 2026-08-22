import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DoorMode } from './DoorMode'
import { openOutbox } from './outbox'

const recordScansAction = vi.fn()
vi.mock('../actions', () => ({
  recordScansAction: (...args: unknown[]) => recordScansAction(...args),
  checkInByGroupAction: vi.fn(async () => ({ scanId: 'x', kind: 'unknown' })),
  adjustArrivalAction: vi.fn(async () => {}),
  voidArrivalAction: vi.fn(async () => {}),
}))

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
// El mismo SHA-256 que produce el servidor sobre ese token.
const HASH = '8bfb4a7f6c1cb4073b47072626084118324bcbb904ec7f27e62a39270926b999'
const manifest = {
  eventId: 'e1',
  groups: [{ id: 'g1', label: 'Familia Rojas Pe\u00f1a', seats: 4, attending: 4, revoked: false, tableLabel: 'Mesa 03', tokenHashHex: HASH }],
  arrivals: [],
}

const escanear = (token: string) => {
  for (const ch of token) fireEvent.keyDown(document, { key: ch })
  fireEvent.keyDown(document, { key: 'Enter' })
}

/** El servidor acepta el lote y devuelve un resultado por cada `scanId` recibido. */
const aceptaTodo = async ({ scans }: { scans: { scanId: string }[] }) =>
  scans.map((s) => ({
    scanId: s.scanId,
    kind: 'welcome' as const,
    group: { id: 'g1', label: 'Familia Rojas Pe\u00f1a', seats: 4 },
    arrivedCount: 4,
  }))

describe('DoorMode sin conexi\u00f3n', () => {
  beforeEach(async () => {
    recordScansAction.mockReset()
    const box = await openOutbox()
    await box.drop((await box.all()).map((s) => s.scanId))
  })

  it('da la bienvenida aunque el servidor no responda', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear(TOKEN)
    await waitFor(() => expect(screen.getByText('Familia Rojas Pe\u00f1a')).toBeInTheDocument())
  })

  it('muestra cu\u00e1ntos escaneos faltan por subir', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear(TOKEN)
    await waitFor(() => expect(screen.getByLabelText('Escaneos por subir')).toHaveTextContent('1'))
  })

  it('al volver la red sube lo acumulado y el contador vuelve a cero', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear(TOKEN)
    await waitFor(() => expect(screen.getByLabelText('Escaneos por subir')).toHaveTextContent('1'))

    recordScansAction.mockImplementation(aceptaTodo)
    fireEvent(window, new Event('online'))
    await waitFor(() => expect(screen.getByLabelText('Escaneos por subir')).toHaveTextContent('0'))
  })

  it('no duplica al reenviar: el scanId es el mismo', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear(TOKEN)
    await waitFor(() => expect(recordScansAction).toHaveBeenCalled())
    const primero = recordScansAction.mock.calls[0]?.[0].scans[0].scanId

    fireEvent(window, new Event('online'))
    await waitFor(() => expect(recordScansAction.mock.calls.length).toBeGreaterThan(1))
    const segundo = recordScansAction.mock.calls.at(-1)?.[0].scans[0].scanId
    expect(segundo).toBe(primero)
  })

  it('un pase que no est\u00e1 en el manifiesto sale en rojo sin tocar la bandeja', async () => {
    recordScansAction.mockImplementation(aceptaTodo)
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear('ZzYyXxWwVvUuTtSsRrQqPp')
    await waitFor(() => expect(screen.getByText(/no es de tu evento/i)).toBeInTheDocument())
    expect(recordScansAction).not.toHaveBeenCalled()
  })
})
