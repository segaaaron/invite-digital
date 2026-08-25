import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VenueZone } from '../domain/venue-zone'
import { ZoneControls } from './ZoneControls'

const addZoneAction = vi.fn(async () => ({ ok: true as const }))
const updateZoneAction = vi.fn(async () => ({ ok: true as const }))
const removeZoneAction = vi.fn(async () => ({ ok: true as const }))

vi.mock('../actions', () => ({
  addZoneAction: (...args: unknown[]) => addZoneAction(...(args as [])),
  updateZoneAction: (...args: unknown[]) => updateZoneAction(...(args as [])),
  removeZoneAction: (...args: unknown[]) => removeZoneAction(...(args as [])),
}))

const pista: VenueZone = {
  id: 'z1',
  eventId: 'e1',
  kind: 'dance',
  label: 'Pista de baile',
  x: 40,
  y: 40,
  w: 20,
  h: 15,
}

const props = { eventId: 'e1', eventSlug: 'boda', zones: [pista] }

beforeEach(() => {
  addZoneAction.mockClear()
  updateZoneAction.mockClear()
  removeZoneAction.mockClear()
})

describe('ZoneControls', () => {
  it('lista las zonas que ya están en el plano', () => {
    render(<ZoneControls {...props} />)
    expect(screen.getByLabelText('Etiqueta de Pista de baile')).toHaveValue('Pista de baile')
  })

  it('sin zonas lo dice en vez de dejar un hueco', () => {
    render(<ZoneControls {...props} zones={[]} />)
    expect(screen.getByText(/todavía no hay elementos/i)).toBeInTheDocument()
  })

  it('renombrar una zona conserva su sitio y su tamaño', () => {
    // La posición se guarda arrastrando en el plano. Renombrar no puede devolverla al
    // centro, o cada corrección de un nombre descolocaría el salón.
    render(<ZoneControls {...props} />)
    fireEvent.change(screen.getByLabelText('Etiqueta de Pista de baile'), { target: { value: 'Pista' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Pista de baile' }))

    expect(updateZoneAction).toHaveBeenCalledWith({
      id: 'z1',
      eventId: 'e1',
      eventSlug: 'boda',
      kind: 'dance',
      label: 'Pista',
      x: 40,
      y: 40,
      w: 20,
      h: 15,
    })
  })

  it('eliminar una zona llama a la acción con su id', () => {
    render(<ZoneControls {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Pista de baile' }))

    expect(removeZoneAction).toHaveBeenCalledWith({ id: 'z1', eventId: 'e1', eventSlug: 'boda' })
  })

  it('enseña el error del servidor sin recargar la página', async () => {
    updateZoneAction.mockResolvedValueOnce({ ok: false, kind: 'invalid_label', message: 'La zona necesita etiqueta' } as never)
    render(<ZoneControls {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /guardar pista/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La zona necesita etiqueta')
  })
})
