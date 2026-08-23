'use client'

import { useMemo, useState } from 'react'
import { markInvitationSentAction } from '../actions'
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
}

const estado = (row: GuestGroupRowView): string => {
  if (row.revokedAt !== null) return 'Revocada'
  return row.confirmed === null ? 'Pendiente' : 'Confirmada'
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex-1">
          <span className="sr-only">Buscar invitado o grupo</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar invitado o grupo..."
            autoComplete="off"
            className="w-full min-w-[220px] rounded-full border border-line bg-bg-top/80 px-4 py-2.5 text-[13px] text-ink outline-none focus-visible:border-gold"
          />
        </label>
        {(Object.keys(CASA) as Filtro[]).map((clave) => (
          <button
            key={clave}
            type="button"
            aria-pressed={filtro === clave}
            onClick={() => setFiltro(clave)}
            className={`rounded-full border px-3.5 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase transition-colors ${
              filtro === clave ? 'border-gold bg-gold/15 text-ink' : 'border-line text-ink-mute hover:border-gold/50'
            }`}
          >
            {ETIQUETA[clave]} {cuentas[clave]}
          </button>
        ))}
      </div>

      {error === null ? null : (
        <p className="text-[13px] text-gold-deep" role="alert">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Ningún grupo coincide.</p>
      ) : (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="text-[10.5px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
          <th className="border-b border-[var(--color-line)] py-3 font-normal">Grupo</th>
          <th className="border-b border-[var(--color-line)] py-3 font-normal">Confirmados</th>
          <th className="border-b border-[var(--color-line)] py-3 font-normal">Estado</th>
          <th className="border-b border-[var(--color-line)] py-3 font-normal">Enviado</th>
          <th className="border-b border-[var(--color-line)] py-3 font-normal" />
        </tr>
      </thead>
      <tbody>
        {visibles.map((row) => (
          <tr key={row.id}>
            <td className="border-b border-[var(--color-line)] py-4 text-[14px] text-ink">{row.label}</td>
            <td className="border-b border-[var(--color-line)] py-4 text-[14px] text-ink-soft">
              {`${row.confirmed ?? '—'} / ${row.seats}`}
            </td>
            <td className="border-b border-[var(--color-line)] py-4 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
              {estado(row)}
            </td>
            <td className="border-b border-[var(--color-line)] py-4">
              <button
                className="rounded-full border border-line px-3 py-1 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-soft uppercase transition-colors hover:border-gold/60"
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
                {row.invitationSentAt ? 'Enviada' : 'Sin enviar'}
              </button>
            </td>
            <td className="border-b border-[var(--color-line)] py-4 text-right">
              {row.revokedAt === null ? (
                <RevokeInvitationForm eventSlug={eventSlug} groupId={row.id} />
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
      )}
    </div>
  )
}
