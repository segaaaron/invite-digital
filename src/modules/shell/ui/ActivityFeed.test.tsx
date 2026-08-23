import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityFeed, mergeActivity, type ActivityItem } from './ActivityFeed'

const item = (at: string, text: string): ActivityItem => ({ at: new Date(at), icon: '●', text })

describe('mergeActivity', () => {
  it('mezcla las fuentes y ordena de lo más reciente a lo más viejo', () => {
    const filas = mergeActivity(
      [item('2026-08-20T10:00:00Z', 'antiguo')],
      [item('2026-08-22T10:00:00Z', 'reciente')],
      [item('2026-08-21T10:00:00Z', 'medio')],
    )
    expect(filas.map((f) => f.text)).toEqual(['reciente', 'medio', 'antiguo'])
  })

  it('recorta a las diez últimas: el panel enseña lo de hoy, no un archivo', () => {
    const muchas = Array.from({ length: 30 }, (_, i) => item(`2026-08-${String(i + 1).padStart(2, '0')}T10:00:00Z`, `n${i}`))
    expect(mergeActivity(muchas)).toHaveLength(10)
  })
})

describe('ActivityFeed', () => {
  it('sin actividad lo dice con palabras', () => {
    render(<ActivityFeed items={[]} />)
    expect(screen.getByText(/todavía no ha pasado nada/i)).toBeInTheDocument()
  })

  it('enseña cada línea con su hora', () => {
    render(<ActivityFeed items={[item('2026-08-22T10:00:00Z', 'Ana confirmó')]} />)
    expect(screen.getByText('Ana confirmó')).toBeInTheDocument()
    expect(screen.getByText(/22 de agosto/i)).toBeInTheDocument()
  })
})
