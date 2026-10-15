'use client'

import { DownloadIcon } from '@/shared/design/ui/icons'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traductor, type T } from '@/shared/i18n/t'

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

const estado = (fila: CsvRow, t: T): string => {
  if (fila.revokedAt !== null) return t('Revocada', 'Revoked')
  return fila.confirmed === null ? t('Pendiente', 'Pending') : t('Confirmada', 'Confirmed')
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

export function filasToCsv(rows: readonly CsvRow[], t: T = traductor('es')): string {
  const cabecera = [t('Invitación', 'Invitation'), t('Cupos', 'Seats'), t('Confirmados', 'Confirmed'), t('Estado', 'Status')].map(celda).join(';')
  const cuerpo = rows.map((fila) =>
    [celda(fila.label), celda(String(fila.seats)), celda(fila.confirmed === null ? '' : String(fila.confirmed)), celda(estado(fila, t))].join(';'),
  )
  // BOM al principio: sin él Excel en Windows abre los acentos rotos.
  return `﻿${[cabecera, ...cuerpo].join('\n')}\n`
}

const estadoPersona = (t: T): Record<string, string> => ({ yes: t('Confirmado', 'Confirmed'), no: t('No viene', 'Not coming'), maybe: t('Tal vez', 'Maybe') })

/**
 * El CSV por persona, que es lo que pide el catering y el protocolo. Cuando el evento no
 * tiene personas cargadas se exporta el de grupos, que es lo único que hay.
 */
export function personasToCsv(people: readonly CsvPerson[], t: T = traductor('es')): string {
  const ESTADO_PERSONA = estadoPersona(t)
  const cabecera = [t('Nombre', 'Name'), t('Invitación', 'Invitation'), 'RSVP', t('Acompañante', 'Companion'), t('Restricciones', 'Dietary'), t('Mesa', 'Table'), 'VIP'].map(celda).join(';')
  const cuerpo = people.map((p) =>
    [
      celda(p.fullName),
      celda(p.groupLabel),
      celda(p.attending === null ? t('Pendiente', 'Pending') : (ESTADO_PERSONA[p.attending] ?? '')),
      celda(p.isCompanion ? t('Sí', 'Yes') : 'No'),
      celda(p.dietaryNote ?? ''),
      celda(p.tableLabel ?? t('Sin mesa', 'No table')),
      celda(p.vip ? t('Sí', 'Yes') : 'No'),
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
  const t = useT()
  return (
    <PanelButton
      onClick={() => {
        const contenido = people && people.length > 0 ? personasToCsv(people, t) : filasToCsv(rows, t)
        const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const enlace = document.createElement('a')
        enlace.href = url
        enlace.download = `${t('invitados', 'guests')}-${eventSlug}.csv`
        enlace.click()
        URL.revokeObjectURL(url)
      }}
    >
      <DownloadIcon className="size-3.5" /> {t('Exportar CSV', 'Export CSV')}
    </PanelButton>
  )
}
