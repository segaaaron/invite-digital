'use client'

import { useMemo, useState } from 'react'
import { FilterChip, IconButton, IconLink, Pill, SearchField } from '@/shared/design/ui/panel/PanelKit'
import { removePersonAction, updatePersonAction } from '../actions'
import type { Attendance } from '../domain/person'

export type PersonRowView = {
  readonly id: string
  readonly fullName: string
  /** El grupo es el dueño del enlace, del cupo y de la mesa; la fila necesita su id. */
  readonly groupId: string
  readonly groupLabel: string
  readonly isCompanion: boolean
  readonly dietaryNote: string | null
  readonly vip: boolean
  readonly attending: Attendance | null
  readonly tableLabel: string | null
  /** Cuándo dio el atelier por repartido el enlace del grupo. No es prueba de entrega. */
  readonly sentAt?: Date | null
  /** Cuándo respondió el grupo por última vez. */
  readonly respondedAt?: Date | null
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

/** El tono de la píldora por estado, como en la maqueta. */
const TONO = { yes: 'ok', no: 'no', maybe: 'maybe' } as const

/**
 * La fecha, con la zona fijada a UTC.
 *
 * Este componente se pinta primero en el servidor y luego hidrata en el navegador. Sin
 * fijar la zona, un servidor en UTC y un navegador en La Paz dan dos días distintos para
 * la misma respuesta y React avisa de un desajuste de hidratación.
 */
const fechaCorta = (fecha: Date): string =>
  fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', timeZone: 'UTC' })

/** La maqueta pagina de diez en diez y numera las páginas. */
const POR_PAGINA = 10

const SIGUIENTE: Record<string, Attendance | null> = { null: 'yes', yes: 'maybe', maybe: 'no', no: null }

export function PeopleTable({ rows, eventSlug }: { rows: readonly PersonRowView[]; eventSlug: string }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Quién está a un clic de ser borrado. Borrar no tiene deshacer, y un clic de más se
  // lleva a alguien de la lista sin que nadie se entere hasta el día del evento.
  const [porQuitar, setPorQuitar] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)

  const base = `/panel/eventos/${eventSlug}/invitados`

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

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
  const enPagina = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const aplicar = (accion: Promise<{ status: string; message?: string }>) => {
    void accion.then((estado) => {
      // Un fallo que solo va al registro deja al atelier creyendo que marcó a alguien.
      if (estado.status === 'error') setError(estado.message ?? 'No se pudo guardar el cambio.')
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchField
          label="Buscar invitado o grupo"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value)
            // Buscar con la página 3 puesta enseñaba una tabla vacía con resultados
            // dentro: el filtro y el buscador vuelven siempre a la primera.
            setPagina(1)
          }}
          placeholder="Buscar invitado o grupo..."
          value={query}
        />
        {(Object.keys(CASA) as Filtro[]).map((clave) => (
          <FilterChip
            key={clave}
            active={filtro === clave}
            onClick={() => {
              setFiltro(clave)
              setPagina(1)
            }}
          >
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
        <p className="text-[13px] text-ink-mute">Ningún invitado coincide.</p>
      ) : (
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr>
                {['Nombre', 'Grupo', 'RSVP', 'Acomp.', 'Restricciones', 'Mesa', 'Enviado', 'Confirmado'].map((columna, i) => (
                  <th
                    key={columna}
                    // La primera columna queda fija al desplazar la tabla en el teléfono: sin ella,
                    // a la tercera columna ya no se sabe de quién es la fila.
                    className={`border-b border-line-panel py-3 pr-4 font-mono text-[9px] font-medium tracking-[0.3em] whitespace-nowrap text-ink-mute uppercase ${i === 0 ? 'max-[859px]:sticky max-[859px]:left-0 max-[859px]:z-1 max-[859px]:bg-white max-[859px]:shadow-[1px_0_0_var(--color-line-panel)]' : ''}`}
                    scope="col"
                  >
                    {columna}
                  </th>
                ))}
                <th className="border-b border-line-panel py-3" scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {enPagina.map((fila) => (
                <tr key={fila.id} className="hover:bg-bg-raised">
                  <td className="border-b border-line-panel py-3.5 pr-4 text-[14px] text-ink max-[859px]:max-w-[140px] max-[859px]:sticky max-[859px]:left-0 max-[859px]:z-1 max-[859px]:bg-white max-[859px]:shadow-[1px_0_0_var(--color-line-panel)]">
                    {fila.fullName}
                    {fila.vip ? (
                      <span aria-label="VIP" className="ml-1 text-gold" title="VIP">
                        ★
                      </span>
                    ) : null}
                  </td>
                  <td className="border-b border-line-panel py-3.5 pr-4 text-[13px] text-ink-soft">{fila.groupLabel}</td>
                  <td className="border-b border-line-panel py-3.5 pr-4">
                    <button
                      className="cursor-pointer"
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
                      <Pill tone={fila.attending === null ? 'pending' : TONO[fila.attending]}>
                        {fila.attending === null ? 'Pendiente' : ESTADO[fila.attending]}
                      </Pill>
                    </button>
                  </td>
                  <td className="border-b border-line-panel py-3.5 pr-4 text-[13px] text-ink-soft">
                    {fila.isCompanion ? 'Sí' : '—'}
                  </td>
                  <td className="border-b border-line-panel py-3.5 pr-4 text-[13px] text-ink-soft">
                    {fila.dietaryNote ?? '—'}
                  </td>
                  <td className="border-b border-line-panel py-3.5 pr-4 text-[13px] text-ink-soft">
                    {fila.tableLabel ?? 'Sin mesa'}
                  </td>
                  <td className="border-b border-line-panel py-3.5 pr-4">
                    <Pill tone={fila.sentAt ? 'ok' : 'pending'}>{fila.sentAt ? 'Enviado' : 'Pendiente'}</Pill>
                  </td>
                  <td className="border-b border-line-panel py-3.5 pr-4 font-mono text-[11px] text-ink-soft">
                    {fila.respondedAt === null || fila.respondedAt === undefined
                      ? '—'
                      : fechaCorta(fila.respondedAt)}
                  </td>
                  <td className="border-b border-line-panel py-3.5 whitespace-nowrap">
                    {porQuitar === fila.id ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="cursor-pointer rounded-lg border border-danger px-2.5 py-1 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-danger uppercase"
                          onClick={() => {
                            setPorQuitar(null)
                            aplicar(removePersonAction({ eventSlug, id: fila.id }))
                          }}
                          type="button"
                        >
                          Confirmar
                        </button>
                        <button
                          className="cursor-pointer rounded-lg border border-line-panel px-2.5 py-1 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase"
                          onClick={() => setPorQuitar(null)}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <IconLink href={`${base}?panel=pase&persona=${fila.id}`} label={`Ver el pase de ${fila.fullName}`}>
                          ▣
                        </IconLink>
                        <IconLink href={`${base}?panel=editar&persona=${fila.id}`} label={`Editar a ${fila.fullName}`}>
                          ✎
                        </IconLink>
                        <IconButton label={`Eliminar a ${fila.fullName}`} onClick={() => setPorQuitar(fila.id)}>
                          ×
                        </IconButton>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginas === 1 ? null : (
            <nav aria-label="Páginas de invitados" className="mt-4.5 flex items-center justify-center gap-1.5">
              <button
                className="cursor-pointer rounded-lg border border-line-panel bg-white px-2.5 py-1.5 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-35"
                disabled={pagina === 1}
                onClick={() => setPagina((n) => Math.max(1, n - 1))}
                type="button"
              >
                ‹ Anterior
              </button>
              {Array.from({ length: paginas }, (_, i) => i + 1).map((numero) => (
                <button
                  key={numero}
                  aria-current={numero === pagina ? 'page' : undefined}
                  aria-label={`Página ${numero}`}
                  className={`size-8 cursor-pointer rounded-lg border font-mono text-[11px] ${
                    numero === pagina ? 'border-ink bg-ink text-white' : 'border-line-panel bg-white text-ink'
                  }`}
                  onClick={() => setPagina(numero)}
                  type="button"
                >
                  {numero}
                </button>
              ))}
              <button
                className="cursor-pointer rounded-lg border border-line-panel bg-white px-2.5 py-1.5 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-35"
                disabled={pagina === paginas}
                onClick={() => setPagina((n) => Math.min(paginas, n + 1))}
                type="button"
              >
                Siguiente ›
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
