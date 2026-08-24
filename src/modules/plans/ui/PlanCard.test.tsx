import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Allowance } from '../domain/allowance'
import { PlanCard } from './PlanCard'

const atelier: Allowance = {
  planSlug: 'atelier',
  maxGuestGroups: 30,
  seating: true,
  registry: false,
  checkin: false,
}

const alta: Allowance = {
  planSlug: 'alta-costura',
  maxGuestGroups: null,
  seating: true,
  registry: true,
  checkin: true,
}

describe('PlanCard', () => {
  it('marca el plan actual arriba y en el pie, como la maqueta', () => {
    render(<PlanCard current plan={atelier} />)

    expect(screen.getAllByText(/plan actual/i)).toHaveLength(2)
  })

  it('el plan actual no ofrece nada que pulsar', () => {
    render(<PlanCard changeHref="/panel/eventos/boda/plan?plan=atelier" current plan={atelier} />)

    expect(screen.queryByRole('link', { name: /cambiar a/i })).not.toBeInTheDocument()
  })

  it('los demás llevan a pedir el cambio, con su plan ya elegido', () => {
    render(<PlanCard changeHref="/panel/eventos/boda/plan?plan=atelier" current={false} plan={atelier} />)

    expect(screen.getByRole('link', { name: /cambiar a/i }).getAttribute('href')).toBe(
      '/panel/eventos/boda/plan?plan=atelier',
    )
  })

  it('el que no es el actual no se marca', () => {
    render(<PlanCard current={false} plan={alta} />)

    expect(screen.queryByText(/plan actual/i)).not.toBeInTheDocument()
  })

  it('dice qué incluye y qué no, no solo lo que incluye', () => {
    // Una lista de solo lo incluido obliga a comparar tarjetas para deducir lo que
    // falta. Aquí las tres funciones salen siempre, con su respuesta.
    render(<PlanCard current={false} plan={atelier} />)

    const regalos = screen.getByRole('listitem', { name: /mesa de regalos/i })
    expect(within(regalos).getByText('No')).toBeInTheDocument()

    const salon = screen.getByRole('listitem', { name: /salón/i })
    expect(within(salon).getByText('Sí')).toBeInTheDocument()
  })

  it('sin límite de grupos lo dice con palabras, no con un número enorme', () => {
    render(<PlanCard current={false} plan={alta} />)

    expect(screen.getByText(/sin límite/i)).toBeInTheDocument()
  })

  it('con límite enseña el número', () => {
    render(<PlanCard current plan={atelier} />)

    expect(screen.getByText(/30/)).toBeInTheDocument()
  })
})
