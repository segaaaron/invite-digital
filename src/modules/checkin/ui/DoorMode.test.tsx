import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DoorMode } from './DoorMode'

vi.mock('../actions', () => ({
  recordScansAction: vi.fn(async ({ scans }: { scans: { scanId: string }[] }) => [
    {
      scanId: scans[0]!.scanId,
      kind: 'welcome',
      group: { id: 'g1', label: 'Familia Rojas Peña', seats: 4 },
      arrivedCount: 4,
    },
  ]),
  checkInByGroupAction: vi.fn(async ({ scanId }: { scanId: string }) => ({
    scanId,
    kind: 'welcome',
    group: { id: 'g1', label: 'Familia Rojas Peña', seats: 4 },
    arrivedCount: 4,
  })),
  adjustArrivalAction: vi.fn(async () => ({ status: 'success' as const })),
  voidArrivalAction: (...args: unknown[]) => voidArrivalAction(...(args as [])),
}))

const voidArrivalAction = vi.fn<() => Promise<{ status: 'success' } | { status: 'error'; kind: string }>>(async () => ({
  status: 'success',
}))

// El mismo SHA-256 que produce el servidor sobre 'AbCdEfGhIjKlMnOpQrStUv': desde que la
// puerta resuelve en local, un hash de relleno haría que el pase saliera desconocido.
const HASH = '8bfb4a7f6c1cb4073b47072626084118324bcbb904ec7f27e62a39270926b999'

const manifest = {
  eventId: 'e1',
  groups: [{ id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, leadName: null, tableLabel: 'Mesa 03', tokenHashHex: HASH }],
  arrivals: [],
}

describe('DoorMode', () => {
  it('muestra el contador de llegadas sobre los esperados', () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    expect(screen.getByLabelText('Grupos que han llegado')).toHaveTextContent('0')
    expect(screen.getByText(/de 1/)).toBeInTheDocument()
  })

  it('un lector de códigos por teclado registra al pulsar Enter', async () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    for (const ch of 'AbCdEfGhIjKlMnOpQrStUv') fireEvent.keyDown(document, { key: ch })
    fireEvent.keyDown(document, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument())
  })

  it('abre el buscador por nombre', () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    fireEvent.click(screen.getByRole('button', { name: /buscar por nombre/i }))
    expect(screen.getByPlaceholderText(/nombre del grupo/i)).toBeInTheDocument()
  })

  it('si deshacer no llega al servidor, la puerta lo dice en vez de dejar el contador mintiendo', async () => {
    // La pantalla se corrige antes de que el servidor conteste: a la puerta no se la
    // hace esperar. Si el servidor rechaza, quien está en la puerta tiene que enterarse
    // en ese momento, no al cerrar el salón.
    voidArrivalAction.mockResolvedValueOnce({ status: 'error', kind: 'storage_failure' })
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)

    for (const ch of 'AbCdEfGhIjKlMnOpQrStUv') fireEvent.keyDown(document, { key: ch })
    fireEvent.keyDown(document, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /deshacer/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo deshacer/i)
  })

  it('deshacer que sí llega no deja ninguna alerta', async () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)

    for (const ch of 'AbCdEfGhIjKlMnOpQrStUv') fireEvent.keyDown(document, { key: ch })
    fireEvent.keyDown(document, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /deshacer/i }))

    await waitFor(() => expect(voidArrivalAction).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('avisa cuando la cámara no puede abrirse por falta de contexto seguro', async () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    await waitFor(() => expect(screen.getByText(/cámara/i)).toBeInTheDocument())
  })
})
