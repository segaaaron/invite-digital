import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PassDialog } from './PassDialog'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))

const props = {
  closeHref: '/panel/eventos/boda/invitados',
  eventTitle: 'Marcia & Ricardo',
  eventMeta: '18 de octubre de 2026',
  venue: 'Hacienda Los Álamos',
  group: { id: 'g1', label: 'Familia Rojas Peña', revoked: false },
  personName: 'Ana Lucía Vega',
  tableLabel: 'Mesa 03',
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})

describe('PassDialog', () => {
  it('enseña el QR que ya tiene el invitado, para descargar o compartir', () => {
    render(<PassDialog {...props} url="http://localhost:3000/i/GUARDADO" />)
    expect(screen.getByText('http://localhost:3000/i/GUARDADO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar QR' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /imprimir/i })).toBeNull()
  })

  it('nunca ofrece generar otro pase: uno nuevo por descuido deja fuera al invitado', () => {
    render(<PassDialog {...props} url="http://localhost:3000/i/GUARDADO" />)
    expect(screen.queryByRole('button', { name: /generar/i })).toBeNull()
    render(<PassDialog {...props} url={null} />)
    expect(screen.queryByRole('button', { name: /generar/i })).toBeNull()
    expect(screen.getByText(/ya tiene su pase/)).toBeInTheDocument()
  })

  it('una invitación revocada lo dice', () => {
    render(<PassDialog {...props} group={{ ...props.group, revoked: true }} url="http://x/i/T" />)
    expect(screen.getByText(/revocada/)).toBeInTheDocument()
  })
})
