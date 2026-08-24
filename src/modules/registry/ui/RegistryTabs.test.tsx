import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RegistryTabs } from './RegistryTabs'

describe('RegistryTabs', () => {
  it('abre en los fondos, como la maqueta', () => {
    render(<RegistryTabs funds={<p>los fondos</p>} gifts={<p>los regalos</p>} />)
    expect(screen.getByText('los fondos')).toBeInTheDocument()
    expect(screen.queryByText('los regalos')).not.toBeInTheDocument()
  })

  it('cambia a la lista de regalos y lo anuncia', () => {
    render(<RegistryTabs funds={<p>los fondos</p>} gifts={<p>los regalos</p>} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lista de regalos' }))
    expect(screen.getByText('los regalos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lista de regalos' })).toHaveAttribute('aria-pressed', 'true')
  })
})
