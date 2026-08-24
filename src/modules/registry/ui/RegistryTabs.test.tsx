import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RegistryTabs } from './RegistryTabs'

const props = { base: '/panel/eventos/boda/regalos', funds: <p>los fondos</p>, gifts: <p>los regalos</p> }

describe('RegistryTabs', () => {
  it('enseña lo que pide la URL, no un estado propio', () => {
    render(<RegistryTabs {...props} current="regalos" />)
    expect(screen.getByText('los regalos')).toBeInTheDocument()
    expect(screen.queryByText('los fondos')).not.toBeInTheDocument()
  })

  it('los fondos son la vista de partida', () => {
    render(<RegistryTabs {...props} current="fondos" />)
    expect(screen.getByText('los fondos')).toBeInTheDocument()
  })

  it('cada pestaña es un enlace, así que sobrevive a la revalidación de un alta', () => {
    render(<RegistryTabs {...props} current="fondos" />)
    expect(screen.getByRole('link', { name: 'Lista de regalos' }).getAttribute('href')).toBe(
      '/panel/eventos/boda/regalos?vista=regalos',
    )
    expect(screen.getByRole('link', { name: 'Fondos en efectivo' }).getAttribute('href')).toBe(
      '/panel/eventos/boda/regalos',
    )
  })

  it('marca la pestaña abierta para quien no ve el contraste', () => {
    render(<RegistryTabs {...props} current="regalos" />)
    expect(screen.getByRole('link', { name: 'Lista de regalos' })).toHaveAttribute('aria-current', 'page')
  })
})
