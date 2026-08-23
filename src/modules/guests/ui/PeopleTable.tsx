'use client'

import { useMemo, useState } from 'react'
import { removePersonAction, updatePersonAction } from '../actions'
import type { Attendance } from '../domain/person'

export type PersonRowView = {
  readonly id: string
  readonly fullName: string
  readonly groupLabel: string
  readonly isCompanion: boolean
  readonly dietaryNote: string | null
  readonly vip: boolean
  readonly attending: Attendance | null
  readonly tableLabel: string | null
}

type Filtro = 'todos' | 'confirmados' | 'pendientes' | 'no-vienen' | 'tal-vez' | 'vip'

/** «No vienen» es quien dijo que no; «pendientes» es quien no ha dicho nada. */
const CASA: Record<Filtro, (fila: PersonRowView) => boolean> = {
  todos: () => true,
  confirmados: (f) => f.attending === 'yes',
  pendientes: (f) => f.attending === null,
  'no-vienen': (f) => f.attending === 'no',
  'tal-vez': (f) => f.attending === 'maybe',
  vip: (f) => f.vip,
}

const ETIQUETA: Record<Filtro, string> = {
  todos: 'Todos',
  confirmados: 'Confirmados',
  pendientes: 'Pendientes',
  'no-vienen': 'No vienen',
  'tal-vez': 'Tal vez',
  vip: 'VIP',
}

const ESTADO: Record<string, string> = { yes: 'Confirmado', no: 'No viene', maybe: 'Tal vez' }

const SIGUIENTE: Record<string, Attendance | null> = { null: 'yes', yes: 'maybe', maybe: 'no', no: null }

export function PeopleTable({ rows, eventSlug }: { rows: readonly PersonRowView[]; eventSlug: string }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Quién está a un clic de ser borrado. Borrar no tiene deshacer, y un clic de más se
  // lleva a alguien de la lista sin que nadie se entere hasta el día del evento.
  const [porQuitar, setPorQuitar] = useState<string | null>(null)

  // Los contadores se calculan sobre todas las filas, nunca sobre las visibles.
  const cuentas = useMemo(
    () =>
      Object.fromEntries((Object.keys(CASA) as Filtro[]).map((k) => [k, rows.filter(CASA[k]).length])) as Record<
        Filtro,
        number
      >,
    [rows],
  )

  const visibles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter(
      (fila) =>
        CASA[filtro](fila) &&
        (needle === '' ||
          fila.fullName.toLowerCase().includes(needle) ||
          fila.groupLabel.toLowerCase().includes(needle)),
    )
  }, [rows, filtro, query])

  const aplicar = (accion: Promise<{ status: string; message?: string }>) => {
    void accion.then((estado) => {
      // Un fallo que solo va al registro deja al atelier creyendo que marcó a alguien.
      if (estado.status === 'error') setError(estado.message ?? 'No se pudo guardar el cambio.')
    })
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
        <p className="text-[13px] text-ink-mute">Ningún invitado coincide.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
                {['Nombre', 'Grupo', 'RSVP', 'Acomp.', 'Restricciones', 'Mesa'].map((columna) => (
                  <th key={columna} className="border-b border-line py-3 pr-4 font-normal whitespace-nowrap">
                    {columna}
                  </th>
                ))}
                <th className="border-b border-line py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((fila) => (
                <tr key={fila.id}>
                  <td className="border-b border-line py-3.5 pr-4 text-[14px] text-ink">
                    {fila.fullName}
                    {fila.vip ? (
                      <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] text-gold-deep uppercase">
                        VIP
                      </span>
                    ) : null}
                  </td>
                  <td className="border-b border-line py-3.5 pr-4 text-[13px] text-ink-soft">{fila.groupLabel}</td>
                  <td className="border-b border-line py-3.5 pr-4">
                    <button
                      className="rounded-full border border-line px-3 py-1 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-soft uppercase transition-colors hover:border-gold/60"
                      onClick={() =>
                        aplicar(
                          updatePersonAction({
                            eventSlug,
                            id: fila.id,
                            attending: SIGUIENTE[fila.attending ?? 'null'] ?? null,
                          }),
                        )
                      }
                      title="Cambiar el estado"
                      type="button"
                    >
                      {fila.attending === null ? 'Pendiente' : ESTADO[fila.attending]}
                    </button>
                  </td>
                  <td className="border-b border-line py-3.5 pr-4 text-[13px] text-ink-soft">
                    {fila.isCompanion ? 'Sí' : '—'}
                  </td>
                  <td className="border-b border-line py-3.5 pr-4 text-[13px] text-ink-soft">
                    {fila.dietaryNote ?? '—'}
                  </td>
                  <td className="border-b border-line py-3.5 pr-4 text-[13px] text-ink-soft">
                    {fila.tableLabel ?? 'Sin mesa'}
                  </td>
                  <td className="border-b border-line py-3.5 text-right whitespace-nowrap">
                    <button
                      className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase hover:text-gold-deep"
                      onClick={() => aplicar(updatePersonAction({ eventSlug, id: fila.id, vip: !fila.vip }))}
                      type="button"
                    >
                      {fila.vip ? 'Quitar VIP' : 'Marcar VIP'}
                    </button>
                    {porQuitar === fila.id ? (
                      <>
                        <button
                          className="ml-3 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-danger uppercase"
                          onClick={() => {
                            setPorQuitar(null)
                            aplicar(removePersonAction({ eventSlug, id: fila.id }))
                          }}
                          type="button"
                        >
                          Confirmar
                        </button>
                        <button
                          className="ml-3 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase"
                          onClick={() => setPorQuitar(null)}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        className="ml-3 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase hover:text-gold-deep"
                        onClick={() => setPorQuitar(fila.id)}
                        type="button"
                      >
                        Quitar
                      </button>
                    )}
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
