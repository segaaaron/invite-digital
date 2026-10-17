import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { PeopleTable, type PersonRowView } from './PeopleTable'

vi.mock('@/app/_acciones/guests/actions', () => ({
  updatePersonAction: vi.fn(async () => ({ status: 'success' })),
  removePersonAction: vi.fn(async () => ({ status: 'success' })),
}))

const filas: PersonRowView[] = [
  {
    id: 'p1',
    fullName: 'Ana Lucía Vega',
    groupId: 'g1',
    groupLabel: 'Familia Rojas Peña',
    isCompanion: false,
    dietaryNote: 'Sin gluten',
    vip: true,
    attending: 'yes',
    tableLabel: 'Mesa 01',
  },
  {
    id: 'p2',
    fullName: 'Acompañante de Ana',
    groupId: 'g1',
    groupLabel: 'Familia Rojas Peña',
    isCompanion: true,
    dietaryNote: null,
    vip: false,
    attending: 'maybe',
    tableLabel: 'Mesa 01',
  },
  {
    id: 'p3',
    fullName: 'Roberto Núñez',
    groupId: 'g2',
    groupLabel: 'Roberto Núñez',
    isCompanion: false,
    dietaryNote: null,
    vip: false,
    attending: null,
    tableLabel: null,
  },
]

/** La tabla de escritorio: en el DOM también está la lista del celular, oculta por CSS. */
const tabla = () => screen.getByRole('table')
const fila = (nombre: string) => within(tabla()).getByRole('row', { name: new RegExp(nombre) })

describe('PeopleTable', () => {
  // La respuesta la da el invitado; cambiarla a mano es de «Editar», no de un toque suelto.
  it('el RSVP se lee, no se cambia desde la fila', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    const celda = fila('Roberto Núñez').querySelectorAll('td')[1]!
    expect(celda).toHaveTextContent('Sin responder')
    expect(celda.querySelector('button')).toBeNull()
  })

  it('enseña las columnas de la maqueta (E09)', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    for (const columna of ['Invitado', 'Confirmación', 'Restricciones', 'Mesa']) {
      expect(within(tabla()).getByRole('columnheader', { name: columna })).toBeInTheDocument()
    }
  })

  it('una familia tiene su fila de cabecera: cuántos son, si se envió y su pase', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    const cabecera = within(tabla()).getAllByRole('row').find((r) => r.querySelector('td[colspan]') !== null)!
    expect(cabecera).toHaveTextContent('Familia Rojas Peña')
    expect(cabecera).toHaveTextContent('2 personas, sin enviar')
    // Su pase es de la invitación: va en la cabecera, no repetido en cada persona.
    expect(within(tabla()).getByRole('link', { name: 'Ver el pase de Familia Rojas Peña' })).toBeInTheDocument()
    expect(within(tabla()).queryByRole('link', { name: 'Ver el pase de Ana Lucía Vega' })).toBeNull()
    // Sus personas, debajo.
    expect(fila('Ana Lucía Vega')).toBeInTheDocument()
    expect(fila('Acompañante de Ana')).toBeInTheDocument()
  })

  it('las acciones de la fila son iconos dibujados con su rótulo, nunca caracteres', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    for (const nombre of ['Ver el pase de Roberto Núñez', 'Editar a Roberto Núñez', 'Eliminar a Roberto Núñez']) {
      const accion = within(tabla()).getByRole(nombre.startsWith('Eliminar') ? 'button' : 'link', { name: nombre })
      expect(accion.querySelector('svg')).not.toBeNull()
      expect(accion.textContent?.trim()).toBe('')
    }
  })

  it('el estado se lee en texto, no solo por color', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    const rsvp = (nombre: string) => fila(nombre).querySelectorAll('td')[1]
    expect(rsvp('Ana Lucía Vega')).toHaveTextContent('Viene')
    expect(rsvp('Acompañante de Ana')).toHaveTextContent('Tal vez')
    expect(rsvp('Roberto Núñez')).toHaveTextContent('Sin responder')
  })

  it('la invitación dice si se envió y cuándo respondió', () => {
    render(<PeopleTable eventSlug="boda" rows={[{ ...filas[2]!, sentAt: new Date('2026-08-20T12:00:00Z'), respondedAt: new Date('2026-08-22T12:00:00Z') }]} />)
    expect(fila('Roberto Núñez')).toHaveTextContent('Respondió el 22 de agosto')
  })

  it('los filtros de la maqueta: asistirán, por responder, no vienen y sin enviar', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)

    fireEvent.click(screen.getByRole('button', { name: /^Vienen \d+$/ }))
    expect(within(tabla()).getByText('Ana Lucía Vega')).toBeInTheDocument()
    expect(within(tabla()).queryByText('Roberto Núñez')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Sin responder \d+$/ }))
    expect(within(tabla()).getByText('Acompañante de Ana')).toBeInTheDocument()
    expect(within(tabla()).getByText('Roberto Núñez')).toBeInTheDocument()
    expect(within(tabla()).queryByText('Ana Lucía Vega')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^No vienen \d+$/ }))
    expect(screen.getByText('Ningún invitado coincide.')).toBeInTheDocument()
  })

  it('busca por nombre y por invitación', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'roberto' } })
    expect(within(tabla()).getByText('Roberto Núñez')).toBeInTheDocument()
    expect(within(tabla()).queryByText('Ana Lucía Vega')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'rojas' } })
    expect(within(tabla()).getByText('Ana Lucía Vega')).toBeInTheDocument()
  })

  it('quitar a una persona pide confirmación antes de borrarla', () => {
    // Borrar es inmediato y no hay deshacer: un clic de más se lleva a alguien de la lista.
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    fireEvent.click(within(tabla()).getAllByRole('button', { name: /^eliminar a /i })[0]!)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('sin mesa lo dice con una raya, en vez de dejar la celda muda', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    expect(fila('Roberto Núñez').querySelectorAll('td')[3]).toHaveTextContent('—')
  })
})

describe('PeopleTable · de diez en diez', () => {
  const muchas: PersonRowView[] = Array.from({ length: 23 }, (_, i) => ({
    id: `x${i}`,
    fullName: `Invitado ${i}`,
    groupId: `g${i}`,
    groupLabel: `Invitado ${i}`,
    isCompanion: false,
    dietaryNote: null,
    vip: false,
    attending: 'yes' as const,
    tableLabel: null,
  }))

  it('enseña diez invitaciones y «Ver 10 invitaciones más» trae las siguientes', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas} />)
    expect(within(tabla()).getByText('Invitado 0')).toBeInTheDocument()
    expect(within(tabla()).queryByText('Invitado 10')).not.toBeInTheDocument()
    expect(screen.getByText('Mostrando 10 de 23 invitaciones')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver 10 invitaciones más' }))
    expect(within(tabla()).getByText('Invitado 10')).toBeInTheDocument()
    expect(within(tabla()).getByText('Invitado 0')).toBeInTheDocument()
  })

  it('con todo a la vista no ofrece más', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas.slice(0, 4)} />)
    expect(screen.queryByRole('button', { name: /invitaciones? más/ })).not.toBeInTheDocument()
  })
})

describe('PeopleTable · la fecha de confirmación', () => {
  it('es el día de Bolivia, no el de UTC', () => {
    // Quien contestó a las 22:30 del 21 en Cochabamba tiene que leer «21 de agosto». En UTC eso ya es el 22.
    render(<PeopleTable eventSlug="boda" rows={[{ ...filas[2]!, sentAt: new Date('2026-08-20T12:00:00Z'), respondedAt: new Date('2026-08-22T02:30:00Z') }]} />)
    expect(fila('Roberto Núñez')).toHaveTextContent('Respondió el 21 de agosto')
  })
})

/**
 * Las tres acciones de fila: ver el pase, editar y eliminar. Ver pase y editar abren su panel **por la
 * dirección** (`?panel=pase&persona=…`): cada guardado remonta la tabla.
 */
describe('PeopleTable · acciones de la fila', () => {
  it('ver pase y editar llevan a su propio panel, con la persona en la dirección', () => {
    render(<PeopleTable eventSlug="boda" rows={[filas[0]!]} />)
    expect(within(tabla()).getByRole('link', { name: 'Ver el pase de Ana Lucía Vega' })).toHaveAttribute('href', '/panel/eventos/boda/invitados?panel=pase&persona=p1')
    expect(within(tabla()).getByRole('link', { name: 'Editar a Ana Lucía Vega' })).toHaveAttribute('href', '/panel/eventos/boda/invitados?panel=editar&persona=p1')
  })

  it('eliminar pregunta y solo el segundo clic borra', async () => {
    const { removePersonAction } = await import('@/app/_acciones/guests/actions')
    render(<PeopleTable eventSlug="boda" rows={[filas[0]!]} />)

    fireEvent.click(within(tabla()).getByRole('button', { name: 'Eliminar a Ana Lucía Vega' }))
    expect(removePersonAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(removePersonAction).toHaveBeenCalledWith({ eventSlug: 'boda', id: 'p1' })
  })
})

describe('PeopleTable · llegadas', () => {
  it('dice a qué hora llegó cada persona que ya entró', () => {
    render(<PeopleTable eventSlug="boda" rows={[{ ...filas[2]!, llegoA: new Date('2026-10-18T23:40:00Z') }, filas[0]!]} />)
    expect(screen.getByText('Llegó 19:40')).toBeInTheDocument()
    expect(screen.getAllByText(/^Llegó/)).toHaveLength(1)
  })
})
