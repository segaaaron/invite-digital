'use client'

import { PanelButton } from '@/shared/design/ui/panel/PanelKit'

export type CsvRow = {
  readonly label: string
  readonly seats: number
  readonly confirmed: number | null
  readonly revokedAt: Date | null
}

/** Una persona, con lo que el catering y el protocolo necesitan. */
export type CsvPerson = {
  readonly fullName: string
  readonly groupLabel: string
  readonly attending: 'yes' | 'no' | 'maybe' | null
  readonly isCompanion: boolean
  readonly dietaryNote: string | null
  readonly vip: boolean
  readonly tableLabel: string | null
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
const celda = (valor: string): string => `"${neutralizarFormula(valor).replace(/"/g, '""')}"`

/**
 * Antepone un apóstrofo a lo que una hoja de cálculo tomaría por fórmula.
 *
 * Un invitado escribe `=HYPERLINK("http://malo","gracias")` en su restricción alimentaria
 * y Excel lo ejecuta al abrir el archivo que el atelier acaba de exportar. El texto se
 * sigue leyendo igual; lo que se pierde es la ejecución.
 */
function neutralizarFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
}

export function filasToCsv(rows: readonly CsvRow[]): string {
  const cabecera = ['Invitación', 'Cupos', 'Confirmados', 'Estado'].map(celda).join(';')
  const cuerpo = rows.map((fila) =>
    [celda(fila.label), celda(String(fila.seats)), celda(fila.confirmed === null ? '' : String(fila.confirmed)), celda(estado(fila))].join(';'),
  )
  // BOM al principio: sin él Excel en Windows abre los acentos rotos.
  return `﻿${[cabecera, ...cuerpo].join('\n')}\n`
}

const ESTADO_PERSONA: Record<string, string> = { yes: 'Confirmado', no: 'No viene', maybe: 'Tal vez' }

/**
 * El CSV por persona, que es lo que pide el catering y el protocolo. Cuando el evento no
 * tiene personas cargadas se exporta el de grupos, que es lo único que hay.
 */
export function personasToCsv(people: readonly CsvPerson[]): string {
  const cabecera = ['Nombre', 'Invitación', 'RSVP', 'Acompañante', 'Restricciones', 'Mesa', 'VIP'].map(celda).join(';')
  const cuerpo = people.map((p) =>
    [
      celda(p.fullName),
      celda(p.groupLabel),
      celda(p.attending === null ? 'Pendiente' : (ESTADO_PERSONA[p.attending] ?? '')),
      celda(p.isCompanion ? 'Sí' : 'No'),
      celda(p.dietaryNote ?? ''),
      celda(p.tableLabel ?? 'Sin mesa'),
      celda(p.vip ? 'Sí' : 'No'),
    ].join(';'),
  )
  return `\ufeff${[cabecera, ...cuerpo].join('\n')}\n`
}

export function ExportCsvButton({
  rows,
  people,
  eventSlug,
}: {
  rows: readonly CsvRow[]
  people?: readonly CsvPerson[]
  eventSlug: string
}) {
  return (
    <PanelButton
      onClick={() => {
        const contenido = people && people.length > 0 ? personasToCsv(people) : filasToCsv(rows)
        const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const enlace = document.createElement('a')
        enlace.href = url
        enlace.download = `invitados-${eventSlug}.csv`
        enlace.click()
        URL.revokeObjectURL(url)
      }}
    >
      Exportar CSV ↓
    </PanelButton>
  )
}
