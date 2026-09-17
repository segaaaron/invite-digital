'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { checkInByGroupAction, undoCheckInAction } from '@/app/_acciones/checkin/actions'
import { CheckIcon, ScanIcon, UsersIcon } from '@/shared/design/ui/icons'
import { SearchField } from '@/shared/design/ui/panel/PanelKit'
import type { EstadoDeLlegada } from '../domain/lista-de-llegadas'

export type FilaDeIngreso = {
  readonly clave: string
  readonly invitacionId: string
  readonly personaId: string | null
  readonly nombre: string
  readonly invitacion: string | null
  readonly estado: EstadoDeLlegada
  /** «19:40», en hora de Bolivia, ya formateada. */
  readonly hora: string | null
  readonly mesa: string | null
  readonly vip: boolean
}

type Filtro = 'por_llegar' | 'dentro' | 'no_viene' | 'todos'

const FILTROS: ReadonlyArray<{ clave: Filtro; texto: string }> = [
  { clave: 'por_llegar', texto: 'Por llegar' },
  { clave: 'dentro', texto: 'Dentro' },
  { clave: 'no_viene', texto: 'No vienen' },
  { clave: 'todos', texto: 'Todos' },
]

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const horaAhora = () => new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' }).format(new Date())

/**
 * El control de la puerta: **buscar a la persona y marcar que entró**, con un toque. Es lo que
 * hacen las aplicaciones de recepción de eventos: la lista es la pantalla, el contador va arriba y
 * el escáner está a un botón. Empieza en «Por llegar», que es a quien se espera.
 *
 * Se refresca sola cada veinte segundos: la recepción escanea en otro teléfono y aquí se ve.
 */
export function ControlDeIngreso({
  filas,
  eventId,
  eventSlug,
  escanerHref,
  recepcionHref,
}: {
  filas: readonly FilaDeIngreso[]
  eventId: string
  eventSlug: string
  escanerHref: string
  /** Sumar personal de recepción; `null` para quien no puede. */
  recepcionHref: string | null
}) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>('por_llegar')
  const [busqueda, setBusqueda] = useState('')
  const [entraron, setEntraron] = useState<Readonly<Record<string, string>>>({})
  /** Deshechos aquí: cuentan como por llegar hasta que el servidor vuelva a pintar. */
  const [salieron, setSalieron] = useState<ReadonlySet<string>>(new Set())
  const [confirmarDeshacer, setConfirmarDeshacer] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000)
    return () => clearInterval(t)
  }, [router])

  // Lo registrado aquí cuenta ya, aunque el servidor aún no haya vuelto a pintar.
  const vistas = filas.map((f) => {
    if (entraron[f.clave] !== undefined && f.estado !== 'dentro') return { ...f, estado: 'dentro' as const, hora: entraron[f.clave] ?? null }
    if (salieron.has(f.clave) && f.estado === 'dentro') return { ...f, estado: 'por_llegar' as const, hora: null }
    return f
  })
  const cuantos = (f: Filtro) => (f === 'todos' ? vistas.length : vistas.filter((x) => x.estado === f).length)
  const dentro = cuantos('dentro')
  const esperados = dentro + cuantos('por_llegar')
  const avance = esperados === 0 ? 0 : dentro / esperados
  const ultima = vistas.filter((f) => f.estado === 'dentro' && f.hora !== null).sort((a, b) => (b.hora ?? '').localeCompare(a.hora ?? ''))[0]

  const buscado = normal(busqueda.trim())
  // Buscando, se busca en todos: quien llega no sabe en qué pestaña está.
  const visibles = vistas
    .filter((f) => buscado !== '' || filtro === 'todos' || f.estado === filtro)
    .filter((f) => buscado === '' || normal(`${f.nombre} ${f.invitacion ?? ''}`).includes(buscado))
    .sort((a, b) => (a.estado === 'dentro' && b.estado === 'dentro' ? (b.hora ?? '').localeCompare(a.hora ?? '') : a.nombre.localeCompare(b.nombre, 'es')))

  /** Registra a una persona o a varias de la misma invitación, en un solo escaneo. */
  const registrar = (quienes: readonly FilaDeIngreso[], ahoraMs: number, clave: string) => {
    const primero = quienes[0]
    if (primero === undefined) return
    setEnCurso(clave)
    setAviso(null)
    const conNombres = quienes.every((q) => q.personaId !== null)
    void checkInByGroupAction({
      eventId,
      eventSlug,
      groupId: primero.invitacionId,
      scanId: crypto.randomUUID(),
      arrivedCount: null,
      scannedAtMs: ahoraMs,
      personIds: conNombres ? quienes.map((q) => q.personaId as string) : null,
    })
      .then(() => {
        const hora = horaAhora()
        setEntraron((previo) => ({ ...previo, ...Object.fromEntries(quienes.map((q) => [q.clave, hora])) }))
        setSalieron((previo) => new Set([...previo].filter((c) => !quienes.some((q) => q.clave === c))))
        router.refresh()
      })
      // Dar el ingreso por bueno sin que la base lo tenga deja a alguien fuera de la lista toda la noche.
      .catch(() => setAviso(`No se pudo registrar a ${quienes.length === 1 ? primero.nombre : primero.invitacion}. Vuelve a intentarlo.`))
      .finally(() => setEnCurso(null))
  }

  const deshacer = (f: FilaDeIngreso) => {
    setConfirmarDeshacer(null)
    setEnCurso(f.clave)
    setAviso(null)
    void undoCheckInAction({ eventId, eventSlug, groupId: f.invitacionId, personId: f.personaId })
      .then((r) => {
        if (r.status === 'error') {
          setAviso(`No se pudo deshacer el ingreso de ${f.nombre}.`)
          return
        }
        setSalieron((previo) => new Set(previo).add(f.clave))
        setEntraron((previo) => Object.fromEntries(Object.entries(previo).filter(([c]) => c !== f.clave)))
        router.refresh()
      })
      .catch(() => setAviso(`No se pudo deshacer el ingreso de ${f.nombre}.`))
      .finally(() => setEnCurso(null))
  }

  // Las filas visibles, juntas por invitación: la familia se ve junta y entra de un toque.
  const porInvitacion: Array<{ id: string; filas: FilaDeIngreso[] }> = []
  for (const f of visibles) {
    const bloque = porInvitacion.find((b) => b.id === f.invitacionId)
    if (bloque) bloque.filas.push(f)
    else porInvitacion.push({ id: f.invitacionId, filas: [f] })
  }

  const abrirEscaner = () => {
    setAviso(null)
    void (async () => {
      try {
        const dispositivos = (await navigator.mediaDevices?.enumerateDevices()) ?? []
        if (dispositivos.some((d) => d.kind === 'videoinput')) {
          router.push(escanerHref)
          return
        }
      } catch {
        // Sin poder enumerar, se trata como sin cámara.
      }
      setAviso('Este equipo no tiene cámara. Abre esta página en el celular o la tablet de la puerta, o registra aquí buscando por nombre.')
    })()
  }

  return (
    <div className="flex flex-col gap-4.5">
      <section aria-label="Cómo va el ingreso" className="flex flex-col gap-5 rounded-[18px] border border-line-panel bg-white p-5 shadow-card min-[860px]:flex-row min-[860px]:items-center min-[860px]:p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="flex items-baseline gap-2.5">
            <span className="font-display text-[52px] leading-none font-light text-ink [font-variant-numeric:lining-nums_tabular-nums]">{dentro}</span>
            <span className="text-[15px] text-ink-soft">{`de ${esperados} ${esperados === 1 ? 'persona' : 'personas'} dentro`}</span>
          </p>
          <div aria-hidden className="h-2 overflow-hidden rounded-full bg-bg-top">
            <div className="h-full rounded-full bg-sage transition-[width] duration-500" style={{ width: `${Math.round(avance * 100)}%` }} />
          </div>
          <p className="text-[12.5px] text-ink-mute">
            {[`${cuantos('por_llegar')} por llegar`, cuantos('no_viene') > 0 ? `${cuantos('no_viene')} no vienen` : null, ultima ? `última llegada ${ultima.hora}, ${ultima.nombre}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[860px]:w-[260px]">
          <button
            className="flex cursor-pointer items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-3.5 font-mono text-[10.5px] tracking-[0.25em] text-white uppercase transition-colors hover:bg-ink/90"
            onClick={abrirEscaner}
            type="button"
          >
            <ScanIcon className="size-4.5" />
            Escanear QR
          </button>
          {recepcionHref === null ? null : (
            <Link className="flex items-center justify-center gap-2 rounded-full border border-line-panel-strong px-6 py-3 text-[12.5px] text-ink transition hover:border-ink" href={recepcionHref}>
              <UsersIcon className="size-4" />
              Personal de recepción
            </Link>
          )}
        </div>
      </section>

      {aviso === null ? null : (
        <p className="rounded-[12px] bg-danger/10 px-4 py-3 text-[13px] text-danger" role="alert">
          {aviso}
        </p>
      )}

      <section aria-label="Invitados" className="flex flex-col gap-4 rounded-[18px] border border-line-panel bg-white p-4 shadow-card min-[560px]:p-5">
        <SearchField className="w-full" label="Buscar invitado" onChange={(e) => setBusqueda(e.target.value)} placeholder="Busca por nombre para registrar su ingreso…" value={busqueda} />

        <div className="flex gap-1 overflow-x-auto rounded-full bg-bg-top p-1" role="tablist">
          {FILTROS.map((f) => (
            <button
              aria-selected={buscado === '' && filtro === f.clave}
              className={`flex-1 cursor-pointer rounded-full px-3 py-2 text-[12.5px] whitespace-nowrap transition-colors ${buscado === '' && filtro === f.clave ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
              key={f.clave}
              onClick={() => {
                setFiltro(f.clave)
                setBusqueda('')
              }}
              role="tab"
              type="button"
            >
              {`${f.texto} (${cuantos(f.clave)})`}
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13.5px] text-ink-soft">
            {filas.length === 0 ? 'Todavía no hay invitados.' : buscado !== '' ? 'Nadie con ese nombre.' : filtro === 'por_llegar' ? 'Llegaron todos los que se esperaban.' : 'Nadie en esta lista.'}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-panel">
            {porInvitacion.map((bloque) => {
              const pendientes = vistas.filter((v) => v.invitacionId === bloque.id && v.estado !== 'dentro')
              const cabecera = bloque.filas.length > 1 || pendientes.length > 1
              const nombre = bloque.filas[0]?.invitacion ?? bloque.filas[0]?.nombre ?? ''
              return (
                <li className="flex flex-col py-1" key={bloque.id}>
                  {cabecera ? (
                    <div className="flex items-center justify-between gap-3 pt-2.5 pb-1">
                      <span className="min-w-0 truncate text-[12px] tracking-[0.04em] text-ink-soft">
                        {[nombre, bloque.filas[0]?.mesa].filter(Boolean).join(' · ')}
                      </span>
                      {pendientes.length > 1 ? (
                        <button
                          aria-label={`Registrar a los ${pendientes.length} de ${nombre}`}
                          className="shrink-0 cursor-pointer rounded-full bg-ink px-3.5 py-2 font-mono text-[9.5px] tracking-[0.18em] text-white uppercase transition-colors hover:bg-ink/90 disabled:cursor-wait disabled:opacity-50"
                          disabled={enCurso !== null}
                          onClick={() => registrar(pendientes, Date.now(), `todos:${bloque.id}`)}
                          type="button"
                        >
                          {enCurso === `todos:${bloque.id}` ? 'Registrando…' : `Registrar a los ${pendientes.length}`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <ul className={cabecera ? 'flex flex-col border-l border-line-panel pl-3' : 'flex flex-col'}>
                    {bloque.filas.map((f) => (
                      <li aria-label={f.nombre} className="flex items-center gap-3 py-2.5" key={f.clave}>
                        <span
                          aria-hidden
                          className={`grid size-10 shrink-0 place-items-center rounded-full text-[14px] ${f.estado === 'dentro' ? 'bg-sage text-white' : 'bg-bg-top text-ink-soft'}`}
                        >
                          {f.estado === 'dentro' ? <CheckIcon className="size-4" /> : (f.nombre.trim()[0] ?? '·').toUpperCase()}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[15px] text-ink">{f.nombre}</span>
                            {f.vip ? <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] text-gold-deep">VIP</span> : null}
                          </span>
                          <span className="truncate text-[12px] text-ink-mute">
                            {[cabecera ? null : f.invitacion !== null && f.invitacion !== f.nombre ? f.invitacion : null, cabecera ? null : f.mesa, f.estado === 'no_viene' ? 'dijo que no viene' : null].filter(Boolean).join(' · ') || ' '}
                          </span>
                        </span>
                        {f.estado === 'dentro' ? (
                          confirmarDeshacer === f.clave ? (
                            <span className="flex shrink-0 items-center gap-2" role="alert">
                              <span className="text-[12px] text-ink-soft">¿Deshacer?</span>
                              <button className="cursor-pointer rounded-full border border-danger px-3 py-1.5 text-[12px] text-danger hover:bg-danger hover:text-white" onClick={() => deshacer(f)} type="button">
                                Sí
                              </button>
                              <button className="cursor-pointer rounded-full border border-line-panel-strong px-3 py-1.5 text-[12px] text-ink" onClick={() => setConfirmarDeshacer(null)} type="button">
                                No
                              </button>
                            </span>
                          ) : (
                            <span className="flex shrink-0 flex-col items-end gap-0.5">
                              <span className="text-[12.5px] text-sage">{f.hora === null ? 'Entró' : `Entró ${f.hora}`}</span>
                              <button
                                aria-label={`Deshacer el ingreso de ${f.nombre}`}
                                className="cursor-pointer text-[11.5px] text-ink-mute underline underline-offset-2 hover:text-danger disabled:opacity-50"
                                disabled={enCurso !== null}
                                onClick={() => setConfirmarDeshacer(f.clave)}
                                type="button"
                              >
                                {enCurso === f.clave ? 'Deshaciendo…' : 'Deshacer'}
                              </button>
                            </span>
                          )
                        ) : (
                          <button
                            aria-busy={enCurso === f.clave || undefined}
                            aria-label={`Registrar el ingreso de ${f.nombre}`}
                            className="shrink-0 cursor-pointer rounded-full border border-ink px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-ink uppercase transition-colors hover:bg-ink hover:text-white disabled:cursor-wait disabled:opacity-50"
                            disabled={enCurso !== null}
                            onClick={() => registrar([f], Date.now(), f.clave)}
                            type="button"
                          >
                            {enCurso === f.clave ? 'Registrando…' : 'Registrar'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
