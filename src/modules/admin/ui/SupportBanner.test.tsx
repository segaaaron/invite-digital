import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/_acciones/admin/support-actions', () => ({ leaveSupportAction: vi.fn() }))

describe('SupportBanner', () => {
  it('dice como quién está el admin y ofrece regresar', async () => {
    const { SupportBanner } = await import('./SupportBanner')
    render(<SupportBanner clienteEmail="novios@ejemplo.bo" />)
    expect(screen.getByRole('status')).toHaveTextContent('novios@ejemplo.bo')
    expect(screen.getByRole('button', { name: 'Regresar como admin' })).toBeInTheDocument()
  })
})
