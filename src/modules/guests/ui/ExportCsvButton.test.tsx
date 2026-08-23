import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExportCsvButton, filasToCsv, personasToCsv } from './ExportCsvButton'

const filas = [
  { label: 'Familia Rojas Peña', seats: 4, confirmed: 4, revokedAt: null },
  { label: 'Ana "La Tía" Vega', seats: 2, confirmed: null, revokedAt: null },
  { label: 'Zulema; Castro', seats: 1, confirmed: 0, revokedAt: new Date('2026-08-01') },
]

describe('filasToCsv', () => {
  it('escapa comillas y separadores en vez de partir la fila', () => {
    // Una etiqueta con comillas o punto y coma rompería el CSV y correría las columnas
    // de todas las filas siguientes.
    const csv = filasToCsv(filas)
    const lineas = csv.trim().split('\n')
    expect(lineas).toHaveLength(4)
    expect(lineas[2]).toContain('"Ana ""La Tía"" Vega"')
    expect(lineas[3]).toContain('"Zulema; Castro"')
  })

  it('dice el estado en texto y deja vacío lo que no se ha respondido', () => {
    const csv = filasToCsv(filas)
    expect(csv).toContain('Confirmada')
    expect(csv).toContain('Pendiente')
    expect(csv).toContain('Revocada')
  })
})

describe('personasToCsv', () => {
  it('exporta lo que el catering necesita, con el estado en palabras', () => {
    const csv = personasToCsv([
      {
        fullName: 'Ana Lucía Vega',
        groupLabel: 'Familia Rojas Peña',
        attending: 'maybe',
        isCompanion: false,
        dietaryNote: 'Sin gluten',
        vip: true,
        tableLabel: 'Mesa 01',
      },
      {
        fullName: 'Roberto Núñez',
        groupLabel: 'Roberto Núñez',
        attending: null,
        isCompanion: true,
        dietaryNote: null,
        vip: false,
        tableLabel: null,
      },
    ])

    expect(csv).toContain('"Tal vez"')
    expect(csv).toContain('"Pendiente"')
    expect(csv).toContain('"Sin mesa"')
    expect(csv.trim().split('\n')).toHaveLength(3)
  })
})

describe('escape de fórmulas', () => {
  it('una celda que empieza por = no se ejecuta al abrir la hoja', () => {
    // Un invitado escribe «=HYPERLINK("http://malo","gracias")» como restricción y Excel
    // lo ejecuta al abrir el archivo que el atelier acaba de exportar.
    const csv = personasToCsv([
      {
        fullName: '=HYPERLINK("http://malo","pincha")',
        groupLabel: 'Familia',
        attending: 'yes',
        isCompanion: false,
        dietaryNote: '+1234',
        vip: false,
        tableLabel: null,
      },
    ])

    expect(csv).not.toContain('"=HYPERLINK')
    expect(csv).toContain(`"'=HYPERLINK`)
    expect(csv).toContain(`"'+1234"`)
  })

  it('el texto normal no se toca', () => {
    const csv = filasToCsv([{ label: 'Familia Rojas Peña', seats: 4, confirmed: 4, revokedAt: null }])
    expect(csv).toContain('"Familia Rojas Peña"')
  })
})

describe('ExportCsvButton', () => {
  it('descarga un archivo con el nombre del evento', () => {
    const crear = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', { createObjectURL: crear, revokeObjectURL: vi.fn() })
    render(<ExportCsvButton eventSlug="boda-demo" rows={filas} />)

    fireEvent.click(screen.getByRole('button', { name: /exportar csv/i }))
    expect(crear).toHaveBeenCalled()
  })
})
