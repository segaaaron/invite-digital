import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SegmentedTabs } from './SegmentedTabs'

const SEGMENTOS = [
  { key: 'personas', label: 'Personas', href: '/invitados', count: 27 },
  { key: 'grupos', label: 'Grupos', href: '/invitados?vista=grupos', count: 8 },
]

describe('SegmentedTabs', () => {
  it('marca el segmento activo para quien navega con lector de pantalla', () => {
    render(<SegmentedTabs current="grupos" label="Vista de invitados" segments={SEGMENTOS} />)

    expect(screen.getByRole('link', { name: /grupos/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /personas/i })).not.toHaveAttribute('aria-current')
  })

  it('son enlaces de verdad: la vista vive en la URL y se puede compartir', () => {
    render(<SegmentedTabs current="personas" label="Vista de invitados" segments={SEGMENTOS} />)

    expect(screen.getByRole('link', { name: /grupos/i })).toHaveAttribute('href', '/invitados?vista=grupos')
  })

  it('enseña la cifra de cada vista sin que haya que entrar a contarla', () => {
    render(<SegmentedTabs current="personas" label="Vista de invitados" segments={SEGMENTOS} />)

    expect(within(screen.getByRole('link', { name: /personas/i })).getByText('27')).toBeInTheDocument()
  })

  it('el grupo tiene nombre accesible: dos conmutadores en una página se distinguen', () => {
    render(<SegmentedTabs current="personas" label="Vista de invitados" segments={SEGMENTOS} />)

    expect(screen.getByRole('group', { name: 'Vista de invitados' })).toBeInTheDocument()
  })
})
