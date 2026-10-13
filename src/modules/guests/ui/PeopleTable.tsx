'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FilterChip, IconButton, IconLink, Iniciales, PanelButton, Pill, SearchField } from '@/shared/design/ui/panel/PanelKit'
import { removePersonAction } from '@/app/_acciones/guests/actions'
import type { Attendance } from '../domain/person'
import { PenIcon, QrIcon, SendIcon, TrashIcon } from '@/shared/design/ui/icons'
import { hora } from '@/shared/format/fecha'

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

type Filtro = 'todos' | 'asistiran' | 'por-responder' | 'no-vienen' | 'sin-enviar'

/** Los filtros de la maqueta (E09): quién viene, quién falta, quién dijo que no y lo que aún no salió. */
const CASA: Record<Filtro, (fila: PersonRowView) => boolean> = {
  todos: () => true,
  asistiran: (f) => f.attending === 'yes',
  'por-responder': (f) => f.attending === null || f.attending === 'maybe',
  'no-vienen': (f) => f.attending === 'no',
  'sin-enviar': (f) => (f.sentAt ?? null) === null,
}

const ETIQUETA: Record<Filtro, string> = {
  todos: 'Todos',
  asistiran: 'Asistirán',
  'por-responder': 'Por responder',
  'no-vienen': 'No vienen',
  'sin-enviar': 'Sin enviar',
}

const ESTADO = { yes: 'Asistirá', no: 'No vendrá', maybe: 'Tal vez' } as const
const TONO = { yes: 'ok', no: 'no', maybe: 'maybe' } as const

/** Diez invitaciones más cada vez: una familia no se parte. */
const POR_TANDA = 10

const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', timeZone: 'America/La_Paz' })

/** Lo que dice la invitación entera, una vez, en su cabecera o bajo el nombre. */
function estadoDeInvitacion(filas: readonly PersonRowView[]): string {
  const primera = filas[0]!
  if ((primera.sentAt ?? null) === null) return 'Sin enviar'
  if ((primera.respondedAt ?? null) === null) return 'Enviada, sin respuesta'
  return `Respondió el ${DIA.format(primera.respondedAt!)}`
}

/** La píldora de una invitación en el celular (maqueta M08): «Vienen 3», «Sin responder», «Sin enviar». */
function pildoraDeInvitacion(filas: readonly PersonRowView[]): { tono: 'ok' | 'no' | 'pending' | 'neutro'; texto: string } {
  const vienen = filas.filter((f) => f.attending === 'yes').length
  if (vienen > 0) return { tono: 'ok', texto: vienen === 1 && filas.length === 1 ? 'Viene' : `Vienen ${vienen}` }
  if (filas.every((f) => f.attending === 'no')) return { tono: 'no', texto: filas.length === 1 ? 'No viene' : 'No vienen' }
  if ((filas[0]?.sentAt ?? null) === null) return { tono: 'neutro', texto: 'Sin enviar' }
  return { tono: 'pending', texto: 'Sin responder' }
}

/**
 * **La lista de invitados de la maqueta «Esmeralda y Latón»** (E09 · T04 · M08, 12 de octubre), agrupada por
 * invitación: la familia tiene su fila de cabecera —iniciales, nombre, cuántos son, si se envió, cuándo respondió y
 * su botón (Enviar o Recordar)— y debajo sus personas, sangradas, cada una con su confirmación, restricciones y mesa.
 * Una invitación de una sola persona es una sola fila. En el celular, una tarjeta por invitación.
 */
export function PeopleTable({ rows, eventSlug }: { rows: readonly PersonRowView[]; eventSlug: string }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Quién está a un clic de ser borrado. Borrar no tiene deshacer.
  const [porQuitar, setPorQuitar] = useState<string | null>(null)
  const [cuantas, setCuantas] = useState(POR_TANDA)
  /** En la tableta, la invitación abierta al lado de la lista (maqueta T04). */
  const [elegida, setElegida] = useState<string | null>(null)
  /** En el celular, la invitación abierta a pantalla completa (maqueta M09). */
  const [enCelular, setEnCelular] = useState<string | null>(null)

  const base = `/panel/eventos/${eventSlug}/invitados`

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

  const enVista = grupos.slice(0, cuantas)
  // Cuántas personas tiene cada invitación en total, no solo las visibles.
  const todasDe = (groupId: string) => rows.filter((r) => r.groupId === groupId)

  const aplicar = (accion: Promise<{ status: string; message?: string }>) => {
    void accion.then((estado) => {
      if (estado.status === 'error') setError(estado.message ?? 'No se pudo guardar el cambio.')
    })
  }

  const accionesDePersona = (fila: PersonRowView, conPase: boolean) =>
    porQuitar === fila.id ? (
      <span className="flex justify-end gap-1.5">
        <button
          className="min-h-9 cursor-pointer rounded-lg border border-danger px-3 text-[13px] font-medium text-danger"
          onClick={() => {
            setPorQuitar(null)
            aplicar(removePersonAction({ eventSlug, id: fila.id }))
          }}
          title="Si es la última persona de su invitación, su enlace se borra con ella."
          type="button"
        >
          Confirmar
        </button>
        <button className="min-h-9 cursor-pointer rounded-lg border border-line-panel-strong px-3 text-[13px]" onClick={() => setPorQuitar(null)} type="button">
          Cancelar
        </button>
      </span>
    ) : (
      <span className="flex justify-end gap-1.5">
        {conPase ? (
          <IconLink href={`${base}?panel=pase&persona=${fila.id}`} label={`Ver el pase de ${fila.fullName}`}>
            <QrIcon />
          </IconLink>
        ) : null}
        <IconLink href={`${base}?panel=editar&persona=${fila.id}`} label={`Editar a ${fila.fullName}`}>
          <PenIcon />
        </IconLink>
        <IconButton className="hover:border-danger hover:text-danger" label={`Eliminar a ${fila.fullName}`} onClick={() => setPorQuitar(fila.id)}>
          <TrashIcon />
        </IconButton>
      </span>
    )

  /** El botón de la invitación: enviarla si no salió, recordarla si salió y nadie contestó. */
  const botonDeInvitacion = (primera: PersonRowView) =>
    (primera.sentAt ?? null) === null ? (
      <PanelButton href={`${base}?panel=envio`} size="sm" variant="primary">
        <SendIcon className="size-4" /> Enviar
      </PanelButton>
    ) : (primera.respondedAt ?? null) === null ? (
      <PanelButton href={`${base}?panel=recordar`} size="sm">
        Recordar
      </PanelButton>
    ) : null

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchField
          autoComplete="off"
          className="min-w-0 flex-[1_1_280px]"
          label="Buscar invitado"
          onChange={(e) => {
            setQuery(e.target.value)
            setCuantas(POR_TANDA)
          }}
          placeholder="Buscar por nombre"
          value={query}
        />
        <div className="flex flex-wrap gap-2.5">
          {(Object.keys(CASA) as Filtro[]).map((clave) => (
            <FilterChip
              active={filtro === clave}
              key={clave}
              onClick={() => {
                setFiltro(clave)
                setCuantas(POR_TANDA)
              }}
            >
              {ETIQUETA[clave]}
            </FilterChip>
          ))}
        </div>
      </div>

      {error === null ? null : (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      )}

      {grupos.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-ink-mute">Ningún invitado coincide.</p>
      ) : (
        <>
          {/* Computadora: la tabla de la maqueta (E09). */}
          <div className="relative min-w-0 overflow-x-auto max-[1279px]:hidden">
            <table className="w-full min-w-[760px] border-collapse text-left text-[14.5px]">
              <thead>
                <tr>
                  {['Invitado', 'Confirmación', 'Restricciones', 'Mesa'].map((columna) => (
                    <th className="border-b border-line-panel-strong px-3.5 pb-2.5 text-[13px] font-medium whitespace-nowrap text-ink-mute" key={columna} scope="col">
                      {columna}
                    </th>
                  ))}
                  <th className="border-b border-line-panel-strong pb-2.5" scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              {enVista.map((filas) => {
                const primera = filas[0]!
                const todas = todasDe(primera.groupId)
                const familia = todas.length > 1
                return (
                  <tbody className="group/invitacion" key={primera.groupId}>
                    {familia ? (
                      <tr>
                        <td className="border-t border-b border-line-panel bg-fila px-3.5 py-3">
                          <span className="flex items-center gap-3">
                            <Iniciales chico nombre={primera.groupLabel} />
                            <span>
                              <span className="block font-semibold">{primera.groupLabel}</span>
                              <span className="text-[13px] text-ink-mute">
                                {todas.length} personas, {(primera.sentAt ?? null) === null ? 'sin enviar' : 'enviada'}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="border-t border-b border-line-panel bg-fila px-3.5 py-3 text-[13.5px] text-ink-mute" colSpan={2}>
                          {estadoDeInvitacion(todas)}
                        </td>
                        <td className="border-t border-b border-line-panel bg-fila px-3.5 py-3 [font-variant-numeric:tabular-nums]">{primera.tableLabel ?? '—'}</td>
                        <td className="border-t border-b border-line-panel bg-fila px-3.5 py-3 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {botonDeInvitacion(primera)}
                            <IconLink href={`${base}?panel=pase&persona=${primera.id}`} label={`Ver el pase de ${primera.groupLabel}`}>
                              <QrIcon />
                            </IconLink>
                            <IconLink href={`${base}?panel=invitacion&grupo=${primera.groupId}`} label={`Editar la invitación ${primera.groupLabel}`}>
                              <PenIcon />
                            </IconLink>
                          </span>
                        </td>
                      </tr>
                    ) : null}
                    {filas.map((fila) => (
                      <tr className="transition-colors hover:bg-fila" key={fila.id}>
                        <td className={`border-b border-line-panel py-3.25 pr-3.5 ${familia ? 'pl-[52px]' : 'pl-3.5'}`}>
                          <span className="flex items-center gap-3">
                            {familia ? null : <Iniciales chico nombre={fila.fullName} />}
                            <span>
                              <span className={`flex items-center gap-2.5 ${familia ? '' : 'font-medium'}`}>
                                {fila.fullName}
                                {fila.vip ? (
                                  <span aria-hidden>
                                    <Pill tone="vip">VIP</Pill>
                                  </span>
                                ) : null}
                              </span>
                              {familia ? null : <span className="text-[13px] text-ink-mute">{estadoDeInvitacion([fila])}</span>}
                              {fila.llegoA === undefined || fila.llegoA === null ? null : <span className="block text-[12.5px] text-pill-ok-ink">{`Llegó ${hora(fila.llegoA)}`}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="border-b border-line-panel px-3.5 py-3.25">
                          {/* Lo que respondió el invitado. Corregirlo a mano es de «Editar». */}
                          <Pill tone={fila.attending === null ? 'pending' : TONO[fila.attending]}>{fila.attending === null ? 'Sin responder' : ESTADO[fila.attending]}</Pill>
                        </td>
                        <td className="border-b border-line-panel px-3.5 py-3.25 text-ink-mute">{fila.dietaryNote ?? (fila.attending === 'yes' ? 'Sin restricciones' : '')}</td>
                        <td className="border-b border-line-panel px-3.5 py-3.25 [font-variant-numeric:tabular-nums]">{fila.tableLabel ?? '—'}</td>
                        <td className="border-b border-line-panel px-3.5 py-3.25 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {familia ? null : botonDeInvitacion(fila)}
                            <span className={familia ? 'opacity-0 transition-opacity group-hover/invitacion:opacity-100 focus-within:opacity-100' : ''}>{accionesDePersona(fila, !familia)}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )
              })}
            </table>
          </div>

          {/* Tableta (maqueta T04): la lista a la izquierda y la invitación elegida al lado, con su gente y lo que se hace. */}
          {(() => {
            const abierta = enVista.find((f) => f[0]!.groupId === elegida) ?? enVista[0]
            if (abierta === undefined) return null
            const primera = abierta[0]!
            const todas = todasDe(primera.groupId)
            return (
              <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 min-[768px]:max-[1279px]:grid">
                <ul className="min-w-0 border-t border-line-panel">
                  {enVista.map((filas) => {
                    const p0 = filas[0]!
                    const suyas = todasDe(p0.groupId)
                    const pildora = pildoraDeInvitacion(suyas)
                    const activa = p0.groupId === primera.groupId
                    return (
                      <li className="border-b border-line-panel" key={p0.groupId}>
                        <button
                          aria-current={activa ? 'true' : undefined}
                          className={`flex min-h-[72px] w-full cursor-pointer items-center gap-3 px-3 py-3 text-left ${activa ? 'bg-bg-raised shadow-[inset_3px_0_0_var(--color-gold)]' : 'hover:bg-fila'}`}
                          onClick={() => setElegida(p0.groupId)}
                          type="button"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-display text-[20px] leading-tight font-medium">{suyas.length > 1 ? p0.groupLabel : p0.fullName}</span>
                            <span className="text-[13.5px] text-ink-mute">
                              {suyas.length === 1 ? '1 persona' : `${suyas.length} personas`}
                              {p0.tableLabel === null ? '' : `, ${p0.tableLabel.toLowerCase()}`}
                            </span>
                          </span>
                          <Pill tone={pildora.tono}>{pildora.texto}</Pill>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <section aria-label={`Invitación ${primera.groupLabel}`} className="sticky top-24 flex flex-col gap-4 self-start rounded-[16px] border border-line-panel bg-bg-raised p-5.5">
                  <div>
                    <h2 className="font-display text-[28px] leading-tight font-medium">{todas.length > 1 ? primera.groupLabel : primera.fullName}</h2>
                    <p className="mt-1 text-[14.5px] text-ink-mute">
                      {todas.length === 1 ? '1 persona' : `${todas.length} personas`}
                      {primera.tableLabel === null ? '' : ` en la ${primera.tableLabel.toLowerCase()}`}. {estadoDeInvitacion(todas)}.
                    </p>
                  </div>
                  <ul className="flex flex-col">
                    {todas.map((f) => (
                      <li className="flex min-h-11 items-center gap-2.5 border-b border-line-panel last:border-b-0" key={f.id}>
                        <Link className="flex min-h-11 min-w-0 flex-1 items-center truncate text-[15px] text-ink no-underline hover:underline" href={`${base}?panel=editar&persona=${f.id}`}>
                          {f.fullName}
                          {f.dietaryNote === null ? null : <span className="ml-2 text-[13px] text-ink-mute">{f.dietaryNote}</span>}
                        </Link>
                        {f.vip ? <Pill tone="vip">VIP</Pill> : null}
                        <Pill tone={f.attending === null ? 'pending' : TONO[f.attending]}>{f.attending === null ? 'Sin responder' : ESTADO[f.attending]}</Pill>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2.5">
                    {(primera.sentAt ?? null) === null ? (
                      <a className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-whatsapp px-4.5 text-[14.5px] font-medium text-white no-underline hover:bg-whatsapp-hover" href={`${base}?panel=envio`}>
                        <SendIcon className="size-4" /> Enviar por WhatsApp
                      </a>
                    ) : null}
                    <PanelButton href={`${base}?panel=pase&persona=${primera.id}`}>
                      <QrIcon className="size-4" /> Ver el pase
                    </PanelButton>
                    <PanelButton href={`${base}?panel=invitacion&grupo=${primera.groupId}`}>Editar</PanelButton>
                  </div>
                </section>
              </div>
            )
          })()}

          {/* Celular: una tarjeta por invitación (maqueta M08). Tocarla abre su edición. */}
          <ul className="min-[768px]:hidden">
            {enVista.map((filas) => {
              const primera = filas[0]!
              const todas = todasDe(primera.groupId)
              const pildora = pildoraDeInvitacion(todas)
              return (
                <li className="border-b border-line-panel" key={primera.groupId}>
                  <button className="flex min-h-[84px] w-full cursor-pointer items-center gap-3 py-3.5 text-left text-ink" onClick={() => setEnCelular(primera.groupId)} type="button">
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[22px] leading-tight font-medium">{todas.length > 1 ? primera.groupLabel : primera.fullName}</span>
                      <span className="text-[14px] text-ink-mute">
                        {todas.length === 1 ? '1 persona' : `${todas.length} personas`}
                        {primera.tableLabel === null ? '' : `, ${primera.tableLabel.toLowerCase()}`}
                      </span>
                    </span>
                    <Pill tone={pildora.tono}>{pildora.texto}</Pill>
                    <svg aria-hidden className="size-4.5 shrink-0 text-ink-mute" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24">
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>

          {(() => {
            const filas = enCelular === null ? undefined : todasDe(enCelular)
            const primera = filas?.[0]
            if (filas === undefined || primera === undefined) return null
            const cerrarFicha = () => setEnCelular(null)
            return (
              <div aria-label={`Invitación ${primera.groupLabel}`} aria-modal="true" className="fixed inset-0 z-[60] overflow-y-auto bg-bg px-4 pt-2.5 pb-[max(24px,env(safe-area-inset-bottom))] min-[768px]:hidden" role="dialog">
                <div className="mb-5 flex min-h-15 items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)]">
                  <button aria-label="Volver a invitados" className="grid size-11 shrink-0 cursor-pointer place-items-center" onClick={cerrarFicha} type="button">
                    <svg aria-hidden className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24">
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="text-[13px] text-ink-mute">Invitados</span>
                    <span className="truncate text-[16px] font-medium">{filas.length > 1 ? primera.groupLabel : primera.fullName}</span>
                  </span>
                  <Link className="flex min-h-11 items-center px-3 text-[15px] font-medium text-gold-deep no-underline" href={`${base}?panel=invitacion&grupo=${primera.groupId}`}>
                    Editar
                  </Link>
                </div>
                <h2 className="font-display text-[30px] leading-tight font-medium">{filas.length > 1 ? primera.groupLabel : primera.fullName}</h2>
                <p className="mt-1.5 text-[15px] text-ink-mute">
                  {filas.length === 1 ? '1 persona' : `${filas.length} personas`}
                  {primera.tableLabel === null ? '' : ` en la ${primera.tableLabel.toLowerCase()}`}. {estadoDeInvitacion(filas)}.
                </p>
                <ul className="mt-5 flex flex-col">
                  {filas.map((f) => (
                    <li className="flex min-h-[60px] items-center gap-3 border-b border-line-panel last:border-b-0" key={f.id}>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2 text-[15.5px] font-medium">
                          {f.fullName}
                          {f.vip ? <Pill tone="vip">VIP</Pill> : null}
                        </span>
                        <span className="text-[13px] text-ink-mute">{f.dietaryNote ?? (f.attending === 'no' ? 'Avisó que no puede' : 'Sin restricciones')}</span>
                      </span>
                      <Pill tone={f.attending === null ? 'pending' : TONO[f.attending]}>{f.attending === null ? 'Sin responder' : ESTADO[f.attending]}</Pill>
                    </li>
                  ))}
                </ul>
                <Link className="mt-5 flex items-center gap-4 rounded-[14px] border border-line-panel bg-bg-raised px-4 py-4 text-ink no-underline" href={`${base}?panel=pase&persona=${primera.id}`}>
                  <QrIcon className="size-9 shrink-0" />
                  <span className="flex flex-col">
                    <span className="text-[13px] text-ink-mute">Pase de ingreso</span>
                    <span className="text-[15px] font-medium text-gold-deep">Ver el pase y copiar el enlace</span>
                  </span>
                </Link>
                <div className="mt-5 flex flex-col gap-2.5">
                  <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-whatsapp px-4.5 text-[15.5px] font-medium text-white no-underline" href={`${base}?panel=${(primera.sentAt ?? null) === null ? 'envio' : 'recordar'}`}>
                    <SendIcon className="size-4" /> {(primera.sentAt ?? null) === null ? 'Enviar por WhatsApp' : 'Enviar recordatorio'}
                  </a>
                  <PanelButton href={`${base}?panel=invitacion&grupo=${primera.groupId}`}>Editar la invitación</PanelButton>
                </div>
              </div>
            )
          })()}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] text-ink-mute">
              Mostrando {enVista.length} de {grupos.length} {grupos.length === 1 ? 'invitación' : 'invitaciones'}
            </span>
            {enVista.length < grupos.length ? (
              <PanelButton onClick={() => setCuantas((n) => n + POR_TANDA)}>
                Ver {Math.min(POR_TANDA, grupos.length - enVista.length)} {Math.min(POR_TANDA, grupos.length - enVista.length) === 1 ? 'invitación' : 'invitaciones'} más
              </PanelButton>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
