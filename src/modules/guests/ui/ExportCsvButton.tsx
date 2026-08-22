'use client'

export type CsvRow = {
  readonly label: string
  readonly seats: number
  readonly confirmed: number | null
  readonly revokedAt: Date | null
}

const estado = (fila: CsvRow): string => {
  if (fila.revokedAt !== null) return 'Revocada'
  return fila.confirmed === null ? 'Pendiente' : 'Confirmada'
}

/**
 * Una celda entre comillas, con las comillas internas dobladas.
 *
 * Sin esto, una etiqueta con `;` o con comillas —«Ana "La Tía" Vega»— parte la fila y
 * corre las columnas de todas las siguientes. La hoja abre igual y los datos están mal.
 */
const celda = (valor: string): string => `"${valor.replace(/"/g, '""')}"`

export function filasToCsv(rows: readonly CsvRow[]): string {
  const cabecera = ['Grupo', 'Cupos', 'Confirmados', 'Estado'].map(celda).join(';')
  const cuerpo = rows.map((fila) =>
    [celda(fila.label), celda(String(fila.seats)), celda(fila.confirmed === null ? '' : String(fila.confirmed)), celda(estado(fila))].join(';'),
  )
  // BOM al principio: sin él Excel en Windows abre los acentos rotos.
  return `﻿${[cabecera, ...cuerpo].join('\n')}\n`
}

export function ExportCsvButton({ rows, eventSlug }: { rows: readonly CsvRow[]; eventSlug: string }) {
  return (
    <button
      className="rounded-full border border-line px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase transition-colors hover:border-gold/60"
      onClick={() => {
        const blob = new Blob([filasToCsv(rows)], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const enlace = document.createElement('a')
        enlace.href = url
        enlace.download = `invitados-${eventSlug}.csv`
        enlace.click()
        URL.revokeObjectURL(url)
      }}
      type="button"
    >
      Exportar CSV ↓
    </button>
  )
}
