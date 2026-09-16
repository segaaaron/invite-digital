'use client'

import { useSeatingSearch } from './SeatingSearchContext'
import { SearchField } from '@/shared/design/ui/panel/PanelKit'
import type { SeatedTable } from '../application/list-seating'
import type { SeatedGroupRow } from '../application/ports'

/**
 * El buscador ancho de la maqueta, justo debajo de la cabecera. Responde a la pregunta
 * que más se hace el día antes: «¿dónde se sienta esta familia?».
 *
 * Busca sobre lo que ya está en pantalla, sin ir al servidor: una lista de invitados cabe
 * en memoria y un viaje por tecla no aporta nada.
 */
export function SeatSearch({
  tables,
  unseated,
}: {
  tables: readonly SeatedTable[]
  unseated: readonly SeatedGroupRow[]
}) {
  const { termino, setTermino } = useSeatingSearch()

  const q = termino.trim().toLocaleLowerCase()
  let hallazgo: string | null = null
  if (q !== '') {
    const enMesa = tables
      .map((table) => ({ table, group: table.groups.find((g) => g.label.toLocaleLowerCase().includes(q)) }))
      .find((par) => par.group !== undefined)

    if (enMesa?.group !== undefined) hallazgo = `${enMesa.group.label} se sienta en ${enMesa.table.label}.`
    else {
      const suelto = unseated.find((g) => g.label.toLocaleLowerCase().includes(q))
      hallazgo = suelto ? `${suelto.label} todavía está sin mesa.` : 'No encontramos a nadie que se llame así.'
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex">
        <SearchField
          label="Buscar invitado"
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar invitado para ver su mesa…"
          value={termino}
        />
      </div>
      <p className="min-h-4 text-[12px] text-ink-soft" role="status">
        {hallazgo ?? ''}
      </p>
    </div>
  )
}
