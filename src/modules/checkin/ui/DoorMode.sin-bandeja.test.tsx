import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DoorMode } from './DoorMode'
import type { ScanOutcome } from '../application/check-in-by-scan'

/**
 * La puerta sin bandeja de salida: navegación privada o almacenamiento bloqueado, donde
 * `openOutbox` no puede abrir IndexedDB. Pierde el aguante sin red, **no** la función: cada
 * escaneo tiene que ir al servidor y su respuesta tiene que verse en la pantalla.
 */
vi.mock('./outbox', () => ({ openOutbox: async () => null }))

const grupoVisto = { id: 'g1', label: 'Familia Rojas Peña', seats: 4, leadName: null, tableLabel: 'Mesa 03', people: [] }
const recordScansAction = vi.fn(
  async ({ scans }: { scans: { scanId: string }[] }): Promise<ScanOutcome[]> =>
    scans.map((s) => ({ scanId: s.scanId, kind: 'welcome', group: grupoVisto, arrivedCount: 4, personas: {} })),
)
vi.mock('@/app/_acciones/checkin/actions', () => ({
  recordScansAction: (...args: Parameters<typeof recordScansAction>) => recordScansAction(...args),
  checkInByGroupAction: vi.fn(async ({ scanId }: { scanId: string }) => ({ scanId, kind: 'welcome', group: grupoVisto, arrivedCount: 4, personas: {} })),
  adjustArrivalAction: vi.fn(async () => ({ status: 'success' as const })),
  voidArrivalAction: vi.fn(async () => ({ status: 'success' as const })),
}))

// El mismo SHA-256 que produce el servidor sobre ese token.
const HASH = '8bfb4a7f6c1cb4073b47072626084118324bcbb904ec7f27e62a39270926b999'
const manifest = {
  eventId: 'e1',
  groups: [{ id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, leadName: null, tableLabel: 'Mesa 03', tokenHashHex: HASH, people: [] }],
  arrivals: [],
}

const escanear = () => {
  for (const ch of 'AbCdEfGhIjKlMnOpQrStUv') fireEvent.keyDown(document, { key: ch })
  fireEvent.keyDown(document, { key: 'Enter' })
}

describe('DoorMode sin bandeja de salida', () => {
  it('manda el escaneo al servidor: sin bandeja no se queda solo en la pantalla', async () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear()

    await waitFor(() => expect(recordScansAction).toHaveBeenCalled())
    expect(recordScansAction.mock.calls[0]![0].scans[0]).toMatchObject({ scanned: 'AbCdEfGhIjKlMnOpQrStUv' })
  })

  it('si el servidor dice que la invitación se anuló, la pantalla se corrige', async () => {
    recordScansAction.mockImplementationOnce(async ({ scans }: { scans: { scanId: string }[] }) =>
      scans.map((s) => ({ scanId: s.scanId, kind: 'revoked' as const, group: grupoVisto })),
    )
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/anulada/i))
    expect(screen.getByLabelText('Invitaciones que han llegado')).toHaveTextContent('0')
  })

  it('si la sesión del portero caducó, dice que vuelva a escribir su PIN y le deja el camino', async () => {
    // La sesión de puerta caduca a las 24 h aunque el enlace siga valiendo: lo que toca es
    // volver a escribir el PIN en el mismo enlace. El mensaje de antes mandaba pedir otro
    // enlace al anfitrión, y la pantalla de la cámara no tenía ninguna salida.
    recordScansAction.mockRejectedValueOnce(new Error('porter_denied'))
    const acciones = {
      recordScans: recordScansAction,
      checkInByGroup: vi.fn(),
      adjust: vi.fn(),
      void: vi.fn(),
      comprobarAcceso: vi.fn(async () => ({ ok: false as const, motivo: 'invalido' as const })),
    }
    render(<DoorMode acciones={acciones} enlaceDelPin="/p/tok" eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear()

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent(/PIN/)
    expect(screen.getByRole('link', { name: /escribir tu PIN|volver/i })).toHaveAttribute('href', '/p/tok')
  })

  it('con el acceso quitado sí manda pedir otro enlace', async () => {
    recordScansAction.mockRejectedValueOnce(new Error('porter_denied'))
    const acciones = {
      recordScans: recordScansAction,
      checkInByGroup: vi.fn(),
      adjust: vi.fn(),
      void: vi.fn(),
      comprobarAcceso: vi.fn(async () => ({ ok: false as const, motivo: 'quitado' as const })),
    }
    render(<DoorMode acciones={acciones} enlaceDelPin="/p/tok" eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear()

    expect(await screen.findByRole('alert')).toHaveTextContent(/enlace nuevo/i)
  })
})
