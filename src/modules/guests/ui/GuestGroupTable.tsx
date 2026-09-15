'use client'

import { useMemo, useState } from 'react'
import { FilterChip, Pill, SearchField } from '@/shared/design/ui/panel/PanelKit'
import { markInvitationSentAction } from '@/app/_acciones/guests/actions'
import { RevokeInvitationForm } from './RevokeInvitationForm'

export type GuestGroupRowView = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly revokedAt: Date | null
  /** Cupos confirmados en la última respuesta; `null` si el grupo aún no respondió. */
  readonly confirmed: number | null
  /** Cuándo dio el atelier por repartida la invitación. No es prueba de entrega. */
  readonly invitationSentAt?: Date | null
  readonly phone?: string | null
  /** Cuándo entró el grupo. El resumen lo usa para el «↑ N esta semana». */
  readonly createdAt?: Date
}

// Quien respondió **cero** dijo que no viene: llamarlo «Confirmada» junto a un «0 / 2»
// hace leer lo contrario de lo que pasó.
const estado = (row: GuestGroupRowView): string => {
  if (row.revokedAt !== null) return 'Revocada'
  if (row.confirmed === null) return 'Pendiente'
  return row.confirmed === 0 ? 'No vienen' : 'Confirmada'
}

type Filtro = 'todos' | 'confirmados' | 'pendientes' | 'no-vienen'

/**
 * «No vienen» es quien respondió **cero**, no quien no respondió. Meter a los que aún no
 * contestaron en ese montón hace que la pareja dé por perdida a gente que todavía puede
 * decir que sí.
 */
const CASA: Record<Filtro, (row: GuestGroupRowView) => boolean> = {
  todos: () => true,
  confirmados: (row) => row.revokedAt === null && row.confirmed !== null && row.confirmed > 0,
  pendientes: (row) => row.revokedAt === null && row.confirmed === null,
  'no-vienen': (row) => row.revokedAt === null && row.confirmed === 0,
}

const ETIQUETA: Record<Filtro, string> = {
  todos: 'Todos',
  confirmados: 'Confirmados',
  pendientes: 'Pendientes',
  'no-vienen': 'No vienen',
}

export function GuestGroupTable({ eventSlug, groups }: { eventSlug: string; groups: readonly GuestGroupRowView[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Los contadores se calculan sobre **todos** los grupos, nunca sobre los visibles: un
  // contador que baja al filtrar no cuenta nada, solo repite lo que ya se ve.
  const cuentas = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(CASA) as Filtro[]).map((clave) => [clave, groups.filter(CASA[clave]).length]),
      ) as Record<Filtro, number>,
    [groups],
  )

  const visibles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return groups.filter((row) => CASA[filtro](row) && (needle === '' || row.label.toLowerCase().includes(needle)))
  }, [groups, filtro, query])

  if (groups.length === 0) {
    return <p className="text-[14px] text-ink-soft">Todavía no hay invitados en este evento.</p>
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchField
          label="Buscar grupo"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar grupo..."
          value={query}
        />
        {(Object.keys(CASA) as Filtro[]).map((clave) => (
          <FilterChip key={clave} active={filtro === clave} onClick={() => setFiltro(clave)}>
            {ETIQUETA[clave]} {cuentas[clave]}
          </FilterChip>
        ))}
      </div>

      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Ningún grupo coincide.</p>
      ) : (
        // La tabla se desplaza dentro de su propia caja. Sin esto, en un teléfono empuja
        // la página entera y aparece una barra horizontal que nadie busca.
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
      <thead>
        <tr>
          {['Grupo', 'Confirmados', 'Estado', 'Enviado'].map((columna) => (
            <th
              key={columna}
              className="border-b border-line-panel py-3 font-mono text-[9px] font-medium tracking-[0.3em] text-ink-mute uppercase"
              scope="col"
            >
              {columna}
            </th>
          ))}
          <th className="border-b border-line-panel py-3" />
        </tr>
      </thead>
      <tbody>
        {visibles.map((row) => (
          <tr key={row.id}>
            <td className="border-b border-line-panel py-4 text-[14px] text-ink">{row.label}</td>
            <td className="border-b border-line-panel py-4 text-[14px] text-ink-soft">
              {`${row.confirmed ?? '—'} / ${row.seats}`}
            </td>
            <td className="border-b border-line-panel py-4">
              <Pill tone={row.revokedAt !== null ? 'no' : row.confirmed === null ? 'pending' : row.confirmed === 0 ? 'no' : 'ok'}>
                {estado(row)}
              </Pill>
            </td>
            <td className="border-b border-line-panel py-4">
              <button
                className="cursor-pointer"
                onClick={() => {
                  void markInvitationSentAction({
                    eventSlug,
                    id: row.id,
                    sent: !row.invitationSentAt,
                  }).then((estado) => {
                    if (estado.status === 'error') setError(estado.message)
                  })
                }}
                title="Marca que ya repartiste el enlace. No es una prueba de entrega."
                type="button"
              >
                <Pill tone={row.invitationSentAt ? 'ok' : 'pending'}>
                  {row.invitationSentAt ? 'Enviada' : 'Sin enviar'}
                </Pill>
              </button>
            </td>
            <td className="border-b border-line-panel py-4 text-right">
              {row.revokedAt === null ? (
                <RevokeInvitationForm eventSlug={eventSlug} groupId={row.id} />
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
