import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/_acciones/admin/support-actions', () => ({ leaveSupportAction: vi.fn() }))

describe('SupportBanner', () => {
  it('dice como quién está el admin', async () => {
    const { SupportBanner } = await import('./SupportBanner')
    render(<SupportBanner cliente="novios@ejemplo.bo" />)
    expect(screen.getByRole('status')).toHaveTextContent('novios@ejemplo.bo')
  })

  it('la salida vive en la barra de arriba, no en la franja', async () => {
    const { SalidaDeSoporte } = await import('./SupportBanner')
    render(<SalidaDeSoporte />)
    expect(screen.getByRole('button', { name: 'Volver al admin' })).toBeInTheDocument()
  })
})
