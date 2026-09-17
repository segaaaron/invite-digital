'use client'

import { useMemo, useState } from 'react'
import { FilterChip, IconButton, IconLink, Pill, SearchField } from '@/shared/design/ui/panel/PanelKit'
import { removePersonAction } from '@/app/_acciones/guests/actions'
import type { Attendance } from '../domain/person'
import { ChevronIcon, PenIcon, QrIcon, TrashIcon } from '@/shared/design/ui/icons'
import { hora } from '@/shared/format/fecha'
import { avatarColor } from '@/shared/design/ui/avatar-color'

export type PersonRowView = {
  readonly id: string
  readonly fullName: string
  /** El grupo es el dueño del enlace, del cupo y de la mesa; la fila necesita su id. */
  readonly groupId: string
  readonly groupLabel: string
  /** Cuándo entró por la puerta; nulo o ausente si todavía no llegó. */
  readonly llegoA?: Date | null
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

/** Diez invitaciones por página: una familia no se parte entre dos páginas. */
const POR_PAGINA = 10

const CELDA = 'border-b border-line-panel py-3 pr-4 align-middle'

/**
 * La lista de invitados, **agrupada por invitación** como las listas de Joy o Zola: la familia se
 * lee junta —el principal y, debajo, sus acompañantes— y el envío y la respuesta se dicen una vez
 * por invitación, no en cada persona. Sigue siendo una tabla: se lee por columnas y se recorre
 * con lector de pantalla.
 */
export function PeopleTable({ rows, eventSlug }: { rows: readonly PersonRowView[]; eventSlug: string }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Quién está a un clic de ser borrado. Borrar no tiene deshacer.
  const [porQuitar, setPorQuitar] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  /** Qué invitaciones de varias personas están desplegadas. */
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(new Set())

  const base = `/panel/eventos/${eventSlug}/invitados`

  // Los contadores se calculan sobre todas las filas, nunca sobre las visibles.
  const cuentas = useMemo(
    () => Object.fromEntries((Object.keys(CASA) as Filtro[]).map((k) => [k, rows.filter(CASA[k]).length])) as Record<Filtro, number>,
    [rows],
  )

  // Las visibles, juntas por invitación y con el principal primero.
  const grupos = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const visibles = rows.filter(
      (fila) => CASA[filtro](fila) && (needle === '' || fila.fullName.toLowerCase().includes(needle) || fila.groupLabel.toLowerCase().includes(needle)),
    )
    const porGrupo = new Map<string, PersonRowView[]>()
    for (const fila of visibles) porGrupo.set(fila.groupId, [...(porGrupo.get(fila.groupId) ?? []), fila])
    return [...porGrupo.values()].map((filas) => [...filas].sort((a, b) => Number(a.isCompanion) - Number(b.isCompanion)))
  }, [rows, filtro, query])

  const paginas = Math.max(1, Math.ceil(grupos.length / POR_PAGINA))
  const enPagina = grupos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  // Cuántas personas tiene cada invitación en total, no solo las visibles.
  const personasDe = (groupId: string) => rows.filter((r) => r.groupId === groupId).length

  const aplicar = (accion: Promise<{ status: string; message?: string }>) => {
    void accion.then((estado) => {
      if (estado.status === 'error') setError(estado.message ?? 'No se pudo guardar el cambio.')
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <SearchField
          autoComplete="off"
          className="w-full"
          label="Buscar invitado"
          onChange={(e) => {
            setQuery(e.target.value)
            setPagina(1)
          }}
          placeholder="Buscar por nombre o invitación…"
          value={query}
        />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CASA) as Filtro[]).map((clave) => (
            <FilterChip
              active={filtro === clave}
              key={clave}
              onClick={() => {
                setFiltro(clave)
                setPagina(1)
              }}
            >
              {ETIQUETA[clave]} {cuentas[clave]}
            </FilterChip>
          ))}
        </div>
      </div>

      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      {grupos.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-mute">Ningún invitado coincide.</p>
      ) : (
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr>
                {['Invitado', 'Confirmación', 'Restricciones', 'Mesa', 'Invitación'].map((columna) => (
                  <th className="border-b border-line-panel pt-1 pb-3 pr-4 font-mono text-[9px] font-medium tracking-[0.3em] whitespace-nowrap text-ink-mute uppercase" key={columna} scope="col">
                    {columna}
                  </th>
                ))}
                <th className="border-b border-line-panel pb-3" scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            {enPagina.map((filas) => {
              const primera = filas[0]!
              const familia = personasDe(primera.groupId) > 1
              // Plegada, la familia es una línea; con filtro o búsqueda se abre sola, que es cuando se busca a alguien.
              const abierta = !familia || abiertas.has(primera.groupId) || query.trim() !== '' || filtro !== 'todos'
              return (
                <tbody className="group/invitacion" key={primera.groupId}>
                  {/* Una familia se presenta como su invitación: nombre, cuántos son, si se envió y su pase. */}
                  {familia ? (
                    <tr>
                      <td className="border-b border-line-panel bg-bg-top/70 py-2.5 pr-3 pl-3" colSpan={6}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <button
                            aria-expanded={abierta}
                            className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 text-left"
                            onClick={() =>
                              setAbiertas((previo) => {
                                const siguiente = new Set(previo)
                                if (siguiente.has(primera.groupId)) siguiente.delete(primera.groupId)
                                else siguiente.add(primera.groupId)
                                return siguiente
                              })
                            }
                            type="button"
                          >
                            <ChevronIcon className={`size-4 shrink-0 text-ink-mute transition-transform ${abierta ? '' : '-rotate-90'}`} />
                            <span aria-hidden className="flex -space-x-2">
                              {rows
                                .filter((r) => r.groupId === primera.groupId)
                                .slice(0, 3)
                                .map((r) => (
                                  <span className={`grid size-7 place-items-center rounded-full bg-linear-to-br text-[11px] text-white ring-2 ring-white ${avatarColor(r.fullName)}`} key={r.id}>
                                    {(r.fullName.trim()[0] ?? '·').toUpperCase()}
                                  </span>
                                ))}
                            </span>
                            <span className="text-[13.5px] text-ink">{primera.groupLabel}</span>
                            <span className="text-[12px] text-ink-mute">{`${personasDe(primera.groupId)} personas`}</span>
                            <Pill tone={primera.sentAt ? 'ok' : 'pending'}>{primera.sentAt ? 'Enviado' : 'Sin enviar'}</Pill>
                            {primera.respondedAt === null || primera.respondedAt === undefined ? null : (
                              <span className="font-mono text-[10.5px] text-ink-mute">{`respondió ${fechaCorta(primera.respondedAt)}`}</span>
                            )}
                          </button>
                          <span className="ml-auto">
                            <IconLink href={`${base}?panel=pase&persona=${primera.id}`} label={`Ver el pase de ${primera.groupLabel}`}>
                              <QrIcon />
                            </IconLink>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {(abierta ? filas : []).map((fila, i) => (
                    <tr className="transition-colors hover:bg-bg-top/60" key={fila.id}>
                      <td className={`${CELDA} ${familia ? 'border-l-2 border-l-gold/40 pl-7' : 'pl-3'}`}>
                        <span className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br text-white ${avatarColor(fila.fullName)} ${fila.isCompanion ? 'size-8 text-[12px]' : 'size-10 text-[14px]'}`}
                          >
                            {(fila.fullName.trim()[0] ?? '·').toUpperCase()}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2 text-[14.5px] text-ink">
                              {fila.fullName}
                              {fila.vip ? (
                                <span aria-hidden className="rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] text-gold-deep" title="VIP">
                                  VIP
                                </span>
                              ) : null}
                            </span>
                            {fila.llegoA === undefined || fila.llegoA === null ? null : (
                              <span className="mt-0.5 block text-[11px] text-sage">{`Llegó ${hora(fila.llegoA)}`}</span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className={CELDA}>
                        {/* Lo que respondió el invitado. Corregirlo a mano es de «Editar». */}
                        <Pill tone={fila.attending === null ? 'pending' : TONO[fila.attending]}>
                          {fila.attending === null ? 'Pendiente' : ESTADO[fila.attending]}
                        </Pill>
                      </td>
                      <td className={`${CELDA} text-[13px] text-ink-soft`}>{fila.dietaryNote ?? '—'}</td>
                      <td className={`${CELDA} text-[13px] text-ink-soft`}>{fila.tableLabel ?? 'Sin mesa'}</td>
                      <td className={`${CELDA} text-[13px]`}>
                        {i === 0 && !familia ? (
                          <span className="flex flex-col gap-1">
                            <span className="text-ink-soft">
                              {fila.isCompanion ? (
                                `Acompaña a ${fila.groupLabel}`
                              ) : fila.groupLabel === fila.fullName ? (
                                <span className="text-ink-mute">{familia ? `Propia · ${personasDe(fila.groupId)} personas` : 'Propia'}</span>
                              ) : familia ? (
                                `${fila.groupLabel} · ${personasDe(fila.groupId)} personas`
                              ) : (
                                fila.groupLabel
                              )}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5">
                              <Pill tone={fila.sentAt ? 'ok' : 'pending'}>{fila.sentAt ? 'Enviado' : 'Sin enviar'}</Pill>
                              {fila.respondedAt === null || fila.respondedAt === undefined ? null : (
                                <span className="font-mono text-[10.5px] text-ink-mute">{`respondió ${fechaCorta(fila.respondedAt)}`}</span>
                              )}
                            </span>
                          </span>
                        ) : null}
                      </td>
                      <td className={`${CELDA} pr-0 whitespace-nowrap`}>
                        {porQuitar === fila.id ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              className="cursor-pointer rounded-lg border border-danger px-2.5 py-1 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-danger uppercase"
                              onClick={() => {
                                setPorQuitar(null)
                                aplicar(removePersonAction({ eventSlug, id: fila.id }))
                              }}
                              title="Si es la última persona de su invitación, su enlace se borra con ella."
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
                          <div className="flex justify-end gap-1.5 opacity-70 transition-opacity group-hover/invitacion:opacity-100 focus-within:opacity-100">
                            {familia ? null : (
                              <IconLink href={`${base}?panel=pase&persona=${fila.id}`} label={`Ver el pase de ${fila.fullName}`}>
                                <QrIcon />
                              </IconLink>
                            )}
                            <IconLink href={`${base}?panel=editar&persona=${fila.id}`} label={`Editar a ${fila.fullName}`}>
                              <PenIcon />
                            </IconLink>
                            <IconButton className="hover:border-danger hover:text-danger" label={`Eliminar a ${fila.fullName}`} onClick={() => setPorQuitar(fila.id)}>
                              <TrashIcon />
                            </IconButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )
            })}
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
                  aria-current={numero === pagina ? 'page' : undefined}
                  aria-label={`Página ${numero}`}
                  className={`size-8 cursor-pointer rounded-lg border font-mono text-[11px] ${numero === pagina ? 'border-ink bg-ink text-white' : 'border-line-panel bg-white text-ink'}`}
                  key={numero}
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
