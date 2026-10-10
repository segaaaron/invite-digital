import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReminderActionState } from '@/app/_acciones/reminders/actions'
import type { DueReminder } from '../domain/due'
import { ReminderQueue } from './ReminderQueue'

const anotar = vi.hoisted(() => vi.fn<() => Promise<ReminderActionState>>(async () => ({ status: 'success' })))
vi.mock('@/app/_acciones/reminders/actions', () => ({ markReminderSentAction: anotar }))

const CIERRE = new Date('2026-09-28T00:00:00Z')

const fila = (patch: Partial<DueReminder> = {}): DueReminder => ({
  groupId: 'g1',
  label: 'Familia Rojas Peña',
  phone: '+59170011122',
  seats: 4,
  kind: 'sin_respuesta',
  waitingDays: 10,
  ...patch,
})

const pintar = (filas: DueReminder[]) =>
  render(
    <ReminderQueue
      deadline={CIERRE}
      eventId="e1"
      eventLocale="es"
      eventSlug="boda"
      rows={filas}
    />,
  )

describe('ReminderQueue', () => {
  it('dice el motivo con palabras, no solo con color', () => {
    pintar([fila(), fila({ groupId: 'g2', label: 'Ana Lucía Vega', kind: 'sin_abrir' })])

    expect(screen.getByRole('heading', { name: /abrieron y no confirmaron/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /no han abierto/i })).toBeInTheDocument()
  })

  it('el enlace de WhatsApp lleva el mensaje del motivo y NUNCA un enlace de invitación', () => {
    pintar([fila()])

    const boton = screen.getByRole('link', { name: /whatsapp/i })
    const href = boton.getAttribute('href') ?? ''
    const texto = decodeURIComponent(href.split('text=')[1] ?? '')

    expect(href).toContain('wa.me/59170011122')
    expect(texto).toContain('Familia Rojas Peña')
    // De ese token la base guarda solo el SHA-256: aquí no hay enlace que meter.
    expect(texto).not.toMatch(/\/i\//)
  })

  it('sin teléfono no ofrece WhatsApp: no hay a quién escribirle', () => {
    pintar([fila({ phone: null })])

    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/sin teléfono/i).length).toBeGreaterThan(0)
  })

  it('marcar recordado anota el motivo de esa fila, no otro', async () => {
    anotar.mockClear()
    pintar([fila({ kind: 'sin_abrir' })])

    fireEvent.click(screen.getByRole('button', { name: /ya le avisé/i }))

    await waitFor(() =>
      expect(anotar).toHaveBeenCalledWith({
        eventId: 'e1',
        eventSlug: 'boda',
        guestGroupId: 'g1',
        kind: 'sin_abrir',
      }),
    )
  })

  it('si no se pudo anotar, lo dice: la fila sigue pendiente', async () => {
    anotar.mockImplementationOnce(async () => ({ status: 'error', message: 'No pudimos anotar el recordatorio.' }))
    pintar([fila()])

    fireEvent.click(screen.getByRole('button', { name: /ya le avisé/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos anotar/i))
  })

  it('con la cola vacía felicita en vez de enseñar una tabla en blanco', () => {
    pintar([])

    expect(screen.getByText(/nadie por recordar/i)).toBeInTheDocument()
  })

  it('tocar «Recordar» abre WhatsApp y ya lo anota: un solo paso (9 oct)', async () => {
    anotar.mockClear()
    pintar([fila()])
    fireEvent.click(screen.getByRole('link', { name: /recordar a familia rojas peña por whatsapp/i }))
    await waitFor(() => expect(anotar).toHaveBeenCalledWith(expect.objectContaining({ guestGroupId: 'g1', kind: 'sin_respuesta' })))
  })

  it('el motivo se dice una vez por grupo, no en cada fila, y «1 lugar» en singular', () => {
    pintar([fila({ groupId: 'a', label: 'Ana', seats: 1 }), fila({ groupId: 'b', label: 'Luis' }), fila({ groupId: 'c', label: 'Rosa', kind: 'sin_abrir' })])
    expect(screen.getAllByText(/abrió la invitación y no ha confirmado/i)).toHaveLength(1)
    expect(screen.getByRole('heading', { name: /abrieron y no confirmaron · 2/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /no han abierto · 1/i })).toBeInTheDocument()
    expect(screen.getByText(/1 lugar\b/)).toBeInTheDocument()
  })

  it('enseña las cinco primeras y deja ver el resto', () => {
    pintar(Array.from({ length: 8 }, (_, i) => fila({ groupId: `g${i}`, label: `Invitado ${i}` })))
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: /ver las 3 restantes/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })

  it('enseña cuántos días lleva esperando cada grupo', () => {
    pintar([fila({ waitingDays: 12 })])

    expect(within(screen.getByRole('listitem')).getByText(/12 días/)).toBeInTheDocument()
  })
})
