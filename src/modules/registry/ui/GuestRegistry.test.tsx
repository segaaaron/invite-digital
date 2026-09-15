import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { en } from '@/shared/i18n/messages/en'
import type { FundView } from '../application/list-registry'
import type { GiftRow } from '../application/ports'
import { GuestRegistry } from './GuestRegistry'

type ActionResult = { ok: true; message?: string } | { ok: false; kind: string; message: string }

const claimGiftAction = vi.fn<(input: Record<string, unknown>) => Promise<ActionResult>>(async () => ({ ok: true }))
const releaseGiftAction = vi.fn<(input: Record<string, unknown>) => Promise<ActionResult>>(async () => ({ ok: true }))

vi.mock('@/app/_acciones/registry/actions', () => ({
  claimGiftAction: (...args: unknown[]) => claimGiftAction(...(args as [Record<string, unknown>])),
  releaseGiftAction: (...args: unknown[]) => releaseGiftAction(...(args as [Record<string, unknown>])),
}))

const AHORA = new Date('2026-08-21T12:00:00.000Z')
const MI_GRUPO = 'grupo-ana'

const regalo = (over: Partial<GiftRow> = {}): GiftRow => ({
  id: 'g1',
  eventId: 'e1',
  name: 'Cafetera italiana',
  priceCents: 45_000,
  store: 'Casa Ideal',
  url: 'https://casaideal.bo/cafetera',
  status: 'available',
  claimedByGroupId: null,
  claimedAt: null,
  claimedByLabel: null,
  ...over,
})

const mio = regalo({
  id: 'g2',
  name: 'Juego de sábanas',
  status: 'reserved',
  claimedByGroupId: MI_GRUPO,
  claimedAt: AHORA,
  claimedByLabel: 'Familia Rojas',
})

const deOtro = regalo({
  id: 'g3',
  name: 'Batidora',
  status: 'reserved',
  claimedByGroupId: 'grupo-bruno',
  claimedAt: AHORA,
  claimedByLabel: 'Familia Vargas',
})

const comprado = regalo({ id: 'g4', name: 'Vajilla', status: 'purchased' })

const fondo: FundView = {
  fund: { id: 'f1', eventId: 'e1', name: 'Luna de miel', description: 'Pasajes y hotel.', goalCents: 100_000 },
  progress: { raisedCents: 50_000, goalCents: 100_000, percent: 50, exceeded: false },
  contributions: [],
}

const props = {
  token: 'tok',
  groupId: MI_GRUPO,
  currency: 'BOB',
  // La mesa abierta es lo normal; los casos de mesa congelada pasan `open={false}`.
  open: true,
  dictionary: es.registry,
  gifts: [regalo()],
  funds: [] as FundView[],
}

beforeEach(() => {
  claimGiftAction.mockClear()
  releaseGiftAction.mockClear()
})

describe('GuestRegistry', () => {
  it('lista los regalos disponibles con su precio y su tienda', () => {
    render(<GuestRegistry {...props} />)
    expect(screen.getByText('Cafetera italiana')).toBeInTheDocument()
    expect(screen.getByText(/450,00/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /casa ideal/i })).toBeInTheDocument()
  })

  it('el enlace a la tienda se abre fuera y sin arrastrar de dónde viene el invitado', () => {
    render(<GuestRegistry {...props} />)
    const enlace = screen.getByRole('link', { name: /casa ideal/i })
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('reservar llama a la acción con el token y el regalo', () => {
    render(<GuestRegistry {...props} />)
    fireEvent.click(screen.getByRole('button', { name: es.registry.reserve }))
    expect(claimGiftAction).toHaveBeenCalledWith({ token: 'tok', giftId: 'g1' })
  })

  it('el que reservó otro se ve reservado y SIN botón', () => {
    render(<GuestRegistry {...props} gifts={[deOtro]} />)
    expect(screen.getByText(es.registry.reservedByOther)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('el que reservó este mismo invitado ofrece soltarlo', () => {
    render(<GuestRegistry {...props} gifts={[mio]} />)
    expect(screen.getByText(es.registry.reservedByYou)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: es.registry.release }))
    expect(releaseGiftAction).toHaveBeenCalledWith({ token: 'tok', giftId: 'g2' })
  })

  it('no revela la etiqueta del grupo que reservó: el invitado no tiene por qué saberlo', () => {
    // El panel sí la muestra; la invitación no. Es un dato de otros invitados.
    render(<GuestRegistry {...props} gifts={[deOtro]} />)
    expect(screen.queryByText(/Familia Vargas/)).not.toBeInTheDocument()
  })

  it('el comprado se ve comprado y sin botón', () => {
    render(<GuestRegistry {...props} gifts={[comprado]} />)
    expect(screen.getByText(es.registry.purchased)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('el aviso de «ya lo reservó otro» sale del diccionario, no en duro', async () => {
    claimGiftAction.mockResolvedValueOnce({ ok: false, kind: 'already_claimed', message: 'already_claimed' })
    render(<GuestRegistry {...props} />)
    fireEvent.click(screen.getByRole('button', { name: es.registry.reserve }))
    expect(await screen.findByRole('alert')).toHaveTextContent(es.registry.errors.already_claimed)
  })

  it('un error que no está en el diccionario no deja al invitado sin mensaje', async () => {
    claimGiftAction.mockResolvedValueOnce({ ok: false, kind: 'kind_inventado', message: 'kind_inventado' })
    render(<GuestRegistry {...props} />)
    fireEvent.click(screen.getByRole('button', { name: es.registry.reserve }))
    expect((await screen.findByRole('alert')).textContent).not.toBe('')
  })

  it('habla el idioma del evento, no el del panel', () => {
    render(<GuestRegistry {...props} dictionary={en.registry} />)
    expect(screen.getByRole('button', { name: en.registry.reserve })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: en.registry.title })).toBeInTheDocument()
  })

  it('los fondos muestran su progreso', () => {
    render(<GuestRegistry {...props} funds={[fondo]} />)
    expect(screen.getByText('Luna de miel')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  })

  it('la barra del fondo nunca pasa del 100 y el exceso se dice con palabras', () => {
    const pasado: FundView = {
      ...fondo,
      progress: { raisedCents: 140_000, goalCents: 100_000, percent: 100, exceeded: true },
    }
    render(<GuestRegistry {...props} funds={[pasado]} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText(new RegExp(es.registry.fundExceeded, 'i'))).toBeInTheDocument()
  })

  it('sin regalos ni fondos no pinta el bloque entero en blanco', () => {
    const { container } = render(<GuestRegistry {...props} gifts={[]} funds={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

/**
 * Sin la mesa de regalos en el plan, la lista **se congela, no desaparece**. Ocultarla
 * entera haría que quien ya reservó la cafetera creyera que no reservó nada y la
 * comprase dos veces.
 */
describe('GuestRegistry con la mesa cerrada', () => {
  const cerrada = { ...props, open: false }

  it('el invitado que reservó sigue viendo su reserva', () => {
    render(<GuestRegistry {...cerrada} gifts={[mio]} />)
    expect(screen.getByText('Juego de sábanas')).toBeInTheDocument()
    expect(screen.getByText(es.registry.reservedByYou)).toBeInTheDocument()
  })

  it('no hay botón de reservar en ningún regalo', () => {
    render(<GuestRegistry {...cerrada} gifts={[regalo(), mio, deOtro, comprado]} />)
    expect(screen.queryByRole('button', { name: es.registry.reserve })).not.toBeInTheDocument()
  })

  it('tampoco se puede soltar: liberar devolvería el regalo a un catálogo cerrado', () => {
    render(<GuestRegistry {...cerrada} gifts={[mio]} />)
    expect(screen.queryByRole('button', { name: es.registry.release })).not.toBeInTheDocument()
  })

  it('un aviso explica que la lista está cerrada', () => {
    render(<GuestRegistry {...cerrada} gifts={[mio]} />)
    expect(screen.getByText(es.registry.closed)).toBeInTheDocument()
  })

  it('el aviso habla el idioma del evento, no el del navegador', () => {
    render(<GuestRegistry {...cerrada} dictionary={en.registry} gifts={[mio]} />)
    expect(screen.getByText(en.registry.closed)).toBeInTheDocument()
  })

  it('los regalos disponibles se siguen viendo, solo que sin poder reservarlos', () => {
    render(<GuestRegistry {...cerrada} gifts={[regalo()]} />)
    expect(screen.getByText('Cafetera italiana')).toBeInTheDocument()
  })

  it('los fondos siguen la misma regla: se ven con su progreso y no admiten nada nuevo', () => {
    render(<GuestRegistry {...cerrada} funds={[fondo]} gifts={[]} />)
    expect(screen.getByText('Luna de miel')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('con la mesa abierta todo sigue funcionando como hasta ahora', () => {
    render(<GuestRegistry {...props} gifts={[regalo(), mio]} />)
    fireEvent.click(screen.getByRole('button', { name: es.registry.reserve }))
    expect(claimGiftAction).toHaveBeenCalledWith({ token: 'tok', giftId: 'g1' })
    expect(screen.getByRole('button', { name: es.registry.release })).toBeInTheDocument()
    expect(screen.queryByText(es.registry.closed)).not.toBeInTheDocument()
  })
})
