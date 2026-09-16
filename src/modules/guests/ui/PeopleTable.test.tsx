import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

describe('PeopleTable', () => {
  it('enseña las columnas de la maqueta', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    for (const columna of ['Nombre', 'Invitación', 'RSVP', 'Restricciones', 'Mesa']) {
      expect(screen.getByRole('columnheader', { name: columna })).toBeInTheDocument()
    }
    // «Acomp.» repetía lo que ya dice la invitación.
    expect(screen.queryByRole('columnheader', { name: 'Acomp.' })).toBeNull()
  })

  it('la invitación se lee sin repetir el nombre: propia, con nombre propio, o a quién acompaña', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    const celda = (nombre: string) => screen.getByRole('row', { name: new RegExp(nombre) }).querySelectorAll('td')[1]

    expect(celda('Roberto Núñez')).toHaveTextContent(/^Propia$/)
    expect(celda('Ana Lucía Vega')).toHaveTextContent(/^Familia Rojas Peña$/)
    expect(celda('Acompañante de Ana')).toHaveTextContent(/^Acompaña a Familia Rojas Peña$/)
  })

  it('las acciones de la fila son iconos dibujados con su rótulo, nunca caracteres', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    for (const nombre of ['Ver el pase de Roberto Núñez', 'Editar a Roberto Núñez', 'Eliminar a Roberto Núñez']) {
      const accion = screen.getByRole(nombre.startsWith('Eliminar') ? 'button' : 'link', { name: nombre })
      expect(accion.querySelector('svg')).not.toBeNull()
      expect(accion.textContent?.trim()).toBe('')
    }
  })

  it('el estado se lee en texto, no solo por color', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    // «Confirmado» es además una columna de la tabla, como en la maqueta: se busca el
    // botón de la fila, que es el que cambia el estado.
    expect(screen.getByRole('button', { name: 'Confirmado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tal vez' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendiente' })).toBeInTheDocument()
  })

  it('trae las columnas Enviado y Confirmado de la maqueta', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    expect(screen.getByRole('columnheader', { name: 'Enviado' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Confirmado' })).toBeInTheDocument()
  })

  it('filtra por «tal vez» y por VIP, que es lo que la maqueta añade', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)

    fireEvent.click(screen.getByRole('button', { name: /tal vez 1/i }))
    expect(screen.getByText('Acompañante de Ana')).toBeInTheDocument()
    expect(screen.queryByText('Roberto Núñez')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /vip 1/i }))
    expect(screen.getByText('Ana Lucía Vega')).toBeInTheDocument()
    expect(screen.queryByText('Acompañante de Ana')).not.toBeInTheDocument()
  })

  it('busca por nombre y por invitación', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'roberto' } })
    // Su invitación es la suya: la celda dice «Propia» en vez de repetir el nombre.
    expect(screen.getAllByText('Roberto Núñez')).toHaveLength(1)
    expect(screen.queryByText('Ana Lucía Vega')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'rojas' } })
    expect(screen.getByText('Ana Lucía Vega')).toBeInTheDocument()
  })

  it('quitar a una persona pide confirmación antes de borrarla', () => {
    // Borrar es inmediato y no hay deshacer: un clic de más se lleva a alguien de la
    // lista y nadie se entera hasta el día del evento.
    render(<PeopleTable eventSlug="boda" rows={filas} />)

    fireEvent.click(screen.getAllByRole('button', { name: /^eliminar a /i })[0]!)

    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('sin mesa lo dice, en vez de dejar la celda muda', () => {
    render(<PeopleTable eventSlug="boda" rows={filas} />)
    expect(screen.getAllByText('Sin mesa').length).toBeGreaterThan(0)
  })
})

describe('PeopleTable · piel de la maqueta', () => {
  const muchas: PersonRowView[] = Array.from({ length: 23 }, (_, i) => ({
    id: `x${i}`,
    fullName: `Invitado ${i}`,
    groupId: 'g1',
    groupLabel: 'Grupo',
    isCompanion: false,
    dietaryNote: null,
    vip: false,
    attending: 'yes' as const,
    tableLabel: null,
  }))

  it('pagina de diez en diez, como la maqueta', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas} />)
    expect(screen.getByText('Invitado 0')).toBeInTheDocument()
    expect(screen.queryByText('Invitado 10')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(screen.getByText('Invitado 10')).toBeInTheDocument()
    expect(screen.queryByText('Invitado 0')).not.toBeInTheDocument()
  })

  it('al filtrar vuelve a la primera página: si no, la lista se ve vacía sin estarlo', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas} />)
    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }))
    fireEvent.change(screen.getByLabelText('Buscar invitado'), { target: { value: 'Invitado 1' } })
    expect(screen.getByText('Invitado 1')).toBeInTheDocument()
  })

  it('con una sola página no pinta paginación', () => {
    render(<PeopleTable eventSlug="boda" rows={muchas.slice(0, 4)} />)
    expect(screen.queryByRole('button', { name: 'Página 2' })).not.toBeInTheDocument()
  })
})

describe('PeopleTable · la fecha de confirmación', () => {
  it('se pinta igual en el servidor y en el navegador', () => {
    // `toLocaleDateString` depende de la zona horaria de quien lo ejecuta. Este componente
    // se pinta primero en el servidor y luego hidrata en el navegador: con husos distintos
    // salían dos fechas y React avisaba de un desajuste de hidratación.
    render(
      <PeopleTable
        eventSlug="boda"
        rows={[{ ...filas[0]!, respondedAt: new Date('2026-08-22T02:30:00Z') }]}
      />,
    )

    // 22 de agosto en UTC, aunque quien lo pinte esté en La Paz (UTC−4) o en Tokio.
    expect(screen.getByText('22-ago')).toBeInTheDocument()
  })
})


/**
 * Las tres acciones de fila de la maqueta: ver el pase, editar y eliminar, en ese orden y
 * como botones de icono.
 *
 * Ver pase y editar abren un diálogo, y ese diálogo se abre **por la dirección**
 * (`?panel=pase&persona=…`), no con estado del cliente: cada guardado revalida el árbol y
 * remonta la tabla, que es lo que ya se llevó por delante otros modales de este panel.
 */
describe('PeopleTable · acciones de la fila', () => {
  it('cada fila trae ver pase, editar y eliminar', () => {
    render(<PeopleTable eventSlug="boda" rows={[filas[0]!]} />)

    expect(screen.getByRole('link', { name: 'Ver el pase de Ana Lucía Vega' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar a Ana Lucía Vega' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar a Ana Lucía Vega' })).toBeInTheDocument()
  })

  it('ver pase y editar llevan a su propio panel, con la persona en la dirección', () => {
    render(<PeopleTable eventSlug="boda" rows={[filas[0]!]} />)

    expect(screen.getByRole('link', { name: 'Ver el pase de Ana Lucía Vega' })).toHaveAttribute(
      'href',
      '/panel/eventos/boda/invitados?panel=pase&persona=p1',
    )
    expect(screen.getByRole('link', { name: 'Editar a Ana Lucía Vega' })).toHaveAttribute(
      'href',
      '/panel/eventos/boda/invitados?panel=editar&persona=p1',
    )
  })

  it('eliminar pregunta y solo el segundo clic borra', async () => {
    const { removePersonAction } = await import('@/app/_acciones/guests/actions')
    render(<PeopleTable eventSlug="boda" rows={[filas[0]!]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar a Ana Lucía Vega' }))
    expect(removePersonAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(removePersonAction).toHaveBeenCalledWith({ eventSlug: 'boda', id: 'p1' })
  })
})
