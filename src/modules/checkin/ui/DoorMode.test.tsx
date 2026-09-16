import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DoorMode } from './DoorMode'

vi.mock('@/app/_acciones/checkin/actions', () => ({
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
  groups: [{ id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, leadName: null, tableLabel: 'Mesa 03', tokenHashHex: HASH, people: [] }],
  arrivals: [],
}

describe('DoorMode', () => {
  it('muestra el contador de llegadas sobre los esperados', () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    expect(screen.getByLabelText('Invitaciones que han llegado')).toHaveTextContent('0')
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
    expect(screen.getByPlaceholderText(/nombre del invitado/i)).toBeInTheDocument()
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

  it('usa las acciones que recibe: la puerta del portero no llama a las del panel', async () => {
    const checkInByGroup = vi.fn(async ({ scanId }: { scanId: string }) => ({
      scanId,
      kind: 'welcome' as const,
      group: { id: 'g1', label: 'Familia Rojas Peña', leadName: null, seats: 4, tableLabel: 'Mesa 03', people: [] },
      arrivedCount: 4,
      personas: {},
    }))
    const acciones = { recordScans: vi.fn(async () => []), checkInByGroup, adjust: vi.fn(), void: vi.fn() }
    render(<DoorMode acciones={acciones} eventId="e1" eventSlug="boda" manifest={manifest} />)

    fireEvent.click(screen.getByRole('button', { name: /buscar por nombre/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Familia Rojas Peña/ }))

    await waitFor(() => expect(checkInByGroup).toHaveBeenCalled())
  })

  it('si el acceso del portero se cerró, la puerta lo dice en vez de seguir escaneando a ciegas', async () => {
    const acciones = {
      recordScans: vi.fn(async () => []),
      checkInByGroup: vi.fn(async () => {
        throw new Error('porter_denied')
      }),
      adjust: vi.fn(),
      void: vi.fn(),
      comprobarAcceso: vi.fn(async () => false),
    }
    render(<DoorMode acciones={acciones} eventId="e1" eventSlug="boda" manifest={manifest} />)

    fireEvent.click(screen.getByRole('button', { name: /buscar por nombre/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Familia Rojas Peña/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/tu acceso a esta puerta se cerró/i)
  })
})

/**
 * La pareja llega partida. La puerta ve los nombres, marca quién entra y, cuando llega el
 * otro con el mismo QR, ve que su pareja ya está dentro.
 */
describe('DoorMode · por persona', () => {
  const escanear = () => {
    for (const ch of 'AbCdEfGhIjKlMnOpQrStUv') fireEvent.keyDown(document, { key: ch })
    fireEvent.keyDown(document, { key: 'Enter' })
  }
  const pareja = (arrivals: DoorManifestArrivals = []) => ({
    eventId: 'e1',
    groups: [
      {
        id: 'g1',
        label: 'Ana Rojas',
        seats: 2,
        attending: 2,
        revoked: false,
        leadName: 'Ana Rojas',
        tableLabel: 'Mesa 03',
        tokenHashHex: HASH,
        people: [
          { id: 'ana', fullName: 'Ana Rojas' },
          { id: 'luis', fullName: 'Luis Peña' },
        ],
      },
    ],
    arrivals,
  })
  type DoorManifestArrivals = { guestGroupId: string; arrivedAt: Date; arrivedCount: number; scanCount: number; personas: Record<string, Date> }[]

  it('con dos por llegar, la puerta elige quién entra ahora y solo registra a esos', async () => {
    const recordScans = vi.fn(async ({ scans }: { scans: { scanId: string }[] }) => scans.map((scan) => ({ scanId: scan.scanId, kind: 'unknown' as const })))
    const acciones = { recordScans, checkInByGroup: vi.fn(), adjust: vi.fn(), void: vi.fn() }
    render(<DoorMode acciones={acciones} eventId="e1" eventSlug="boda" manifest={pareja()} />)

    escanear()
    const luis = await screen.findByRole('checkbox', { name: 'Luis Peña' })
    expect(screen.getByRole('checkbox', { name: 'Ana Rojas' })).toBeChecked()
    fireEvent.click(luis)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrada (1)' }))

    // La bandeja de salida es compartida entre pruebas: se busca el escaneo con nombres.
    const conNombres = () =>
      recordScans.mock.calls
        .flatMap((llamada) => (llamada[0] as unknown as { scans: { personIds?: string[] | null }[] }).scans)
        .find((scan) => Array.isArray(scan.personIds))
    await waitFor(() => expect(conNombres()?.personIds).toEqual(['ana']))
    expect(await screen.findByText(/Luis Peña · Por llegar/)).toBeInTheDocument()
    expect(screen.getByText(/Ana Rojas · Entró/)).toBeInTheDocument()
  })

  it('cuando llega el que faltaba, entra de un escaneo y la puerta ve que su pareja ya estaba', async () => {
    const recordScans = vi.fn(async () => [])
    const acciones = { recordScans, checkInByGroup: vi.fn(), adjust: vi.fn(), void: vi.fn() }
    const dentro = [{ guestGroupId: 'g1', arrivedAt: new Date('2026-10-18T23:40:00Z'), arrivedCount: 1, scanCount: 1, personas: { ana: new Date('2026-10-18T23:40:00Z') } }]
    render(<DoorMode acciones={acciones} eventId="e1" eventSlug="boda" manifest={pareja(dentro)} />)

    escanear()
    expect(await screen.findByText(/Luis Peña · Entró/)).toBeInTheDocument()
    expect(screen.getByText(/Ana Rojas · Entró 19:40/)).toBeInTheDocument()
    await waitFor(() => expect(recordScans).toHaveBeenCalled())
  })

  it('si ya entraron todos, lo dice y no registra nada', async () => {
    const recordScans = vi.fn(async () => [])
    const acciones = { recordScans, checkInByGroup: vi.fn(), adjust: vi.fn(), void: vi.fn() }
    const hora = new Date('2026-10-18T23:40:00Z')
    const dentro = [{ guestGroupId: 'g1', arrivedAt: hora, arrivedCount: 2, scanCount: 1, personas: { ana: hora, luis: hora } }]
    render(<DoorMode acciones={acciones} eventId="e1" eventSlug="boda" manifest={pareja(dentro)} />)

    escanear()
    expect(await screen.findByText(/Ya entraron todos/)).toBeInTheDocument()
    expect(recordScans).not.toHaveBeenCalled()
  })
})
