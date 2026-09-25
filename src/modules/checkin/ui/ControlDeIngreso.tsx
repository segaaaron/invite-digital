'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { checkInByGroupAction, undoCheckInAction } from '@/app/_acciones/checkin/actions'
import { CheckIcon, ChevronIcon, RefreshIcon, ScanIcon, UsersIcon } from '@/shared/design/ui/icons'
import { avatarColor } from '@/shared/design/ui/avatar-color'
import { SearchField } from '@/shared/design/ui/panel/PanelKit'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import type { EstadoDeLlegada } from '../domain/lista-de-llegadas'

export type PersonaDeRecepcion = { readonly id: string; readonly nombre: string; readonly puerta: string | null; readonly registradas: number }

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
  /** El código corto del pase de su invitación (`K7P3X`). */
  readonly codigo?: string | null
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

const horaDe = (cuando: Date) => new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' }).format(cuando)

const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 min-[760px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_92px_140px_112px]'

/**
 * El control de la puerta. **Se entra con el pase**: escaneando su QR o escribiendo su código corto.
 * Registrar a alguien sin pase existe, pero es el último recurso y así se ve (pedido por el usuario).
 * Debajo, la lista de invitados como tabla: quién, de qué invitación y mesa, y su estado.
 *
 * **No se refresca sola**, y es a propósito: una pantalla que se recarga cada pocos segundos mueve
 * la lista bajo el dedo de quien está registrando. Lo que se hace aquí se ve al momento; lo que
 * escanea la recepción desde otro teléfono se trae con el botón «Actualizar», cuando se quiere.
 */
export function ControlDeIngreso({
  filas,
  eventId,
  eventSlug,
  escanerHref,
  recepcion,
}: {
  filas: readonly FilaDeIngreso[]
  eventId: string
  eventSlug: string
  escanerHref: string
  /** Quiénes reciben en la puerta y dónde se suman. `null` para la propia recepción. */
  recepcion: { readonly gestionarHref: string; readonly personas: readonly PersonaDeRecepcion[] } | null
}) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>('por_llegar')
  const [busqueda, setBusqueda] = useState('')
  const [codigo, setCodigo] = useState('')
  /** La invitación que encontró el código, esperando a que se confirme quién entra. */
  const [porCodigo, setPorCodigo] = useState<{ invitacionId: string; marcadas: ReadonlySet<string> } | null>(null)
  const [entraron, setEntraron] = useState<Readonly<Record<string, string>>>({})
  const [salieron, setSalieron] = useState<ReadonlySet<string>>(new Set())
  const [confirmar, setConfirmar] = useState<string | null>(null)
  /** Qué invitaciones de varias personas están desplegadas. Plegadas, la lista se lee de un vistazo. */
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(new Set())
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  /** Lo que hay que decir sin que sea un fallo: «ya estaba dentro». Rojo aquí sería mentir. */
  const [nota, setNota] = useState<string | null>(null)
  const [actualizando, actualizar] = useTransition()

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

  const buscado = normal(busqueda.trim())
  const visibles = vistas
    .filter((f) => buscado !== '' || filtro === 'todos' || f.estado === filtro)
    .filter((f) => buscado === '' || normal(`${f.nombre} ${f.invitacion ?? ''} ${f.codigo ?? ''}`).includes(buscado))
    .sort((a, b) => (a.estado === 'dentro' && b.estado === 'dentro' ? (b.hora ?? '').localeCompare(a.hora ?? '') : a.nombre.localeCompare(b.nombre, 'es')))

  const porInvitacion: Array<{ id: string; filas: FilaDeIngreso[] }> = []
  for (const f of visibles) {
    const bloque = porInvitacion.find((b) => b.id === f.invitacionId)
    if (bloque) bloque.filas.push(f)
    else porInvitacion.push({ id: f.invitacionId, filas: [f] })
  }

  const recientes = vistas
    .filter((f) => f.estado === 'dentro' && f.hora !== null)
    .sort((a, b) => (b.hora ?? '').localeCompare(a.hora ?? ''))
    .slice(0, 5)

  /** Registra a una persona o a varias de la misma invitación, en un solo registro. */
  const registrar = (quienes: readonly FilaDeIngreso[], ahoraMs: number, clave: string) => {
    const primero = quienes[0]
    if (primero === undefined) return
    setEnCurso(clave)
    setAviso(null)
    setNota(null)
    setConfirmar(null)
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
      .then((resultado) => {
        // El servidor es quien sabe: si otra puerta ya lo registró, dice `already` y desde cuándo.
        // Registrar de nuevo no duplica —los escaneos se unen—, pero la pantalla no puede fingir
        // que acaba de entrar alguien que ya estaba dentro.
        const yaEstaba = resultado.kind === 'already'
        const hora = horaDe(yaEstaba ? new Date(resultado.arrivedAt) : new Date())
        setEntraron((previo) => ({ ...previo, ...Object.fromEntries(quienes.map((q) => [q.clave, hora])) }))
        setSalieron((previo) => new Set([...previo].filter((c) => !quienes.some((q) => q.clave === c))))
        setPorCodigo(null)
        setCodigo('')
        setNota(yaEstaba ? `${quienes.length === 1 ? primero.nombre : (primero.invitacion ?? primero.nombre)} ya estaba dentro desde las ${hora}.` : null)
        router.refresh()
      })
      .catch(() => setAviso(`No se pudo registrar a ${quienes.length === 1 ? primero.nombre : primero.invitacion}. Vuelve a intentarlo.`))
      .finally(() => setEnCurso(null))
  }

  const deshacer = (f: FilaDeIngreso) => {
    setConfirmar(null)
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

  const buscarCodigo = () => {
    setAviso(null)
    const corto = codigo.replace(/[\s-]/g, '').toUpperCase()
    const suyas = vistas.filter((f) => f.codigo === corto)
    if (corto === '' || suyas.length === 0) {
      setPorCodigo(null)
      setAviso('Ese código no es de este evento. Revísalo con el invitado.')
      return
    }
    const invitacionId = suyas[0]!.invitacionId
    setPorCodigo({ invitacionId, marcadas: new Set(suyas.filter((f) => f.invitacionId === invitacionId && f.estado !== 'dentro').map((f) => f.clave)) })
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
      setAviso('Este equipo no tiene cámara. Escribe el código del pase, o abre esta página en el celular de la puerta.')
    })()
  }

  const encontrada = porCodigo === null ? [] : vistas.filter((f) => f.invitacionId === porCodigo.invitacionId)

  return (
    <div className="grid items-start gap-4.5 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <aside className="flex flex-col gap-4.5 max-[1099px]:contents min-[1100px]:sticky min-[1100px]:top-6 min-[1100px]:order-2">
        <section aria-label="Cómo va el ingreso" className="flex flex-col gap-5 rounded-[18px] border border-line-panel bg-white p-5 shadow-card max-[1099px]:order-2">
          <div className="flex items-center gap-5">
            <div
              aria-hidden
              className="grid size-[88px] shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(var(--color-sage) ${Math.round(avance * 360)}deg, var(--color-line-panel) 0deg)` }}
            >
              <span className="grid size-[72px] place-items-center rounded-full bg-white font-display text-[22px] font-light text-ink [font-variant-numeric:lining-nums]">
                {`${Math.round(avance * 100)}%`}
              </span>
            </div>
            <p className="flex flex-col">
              <span className="font-display text-[42px] leading-none font-light text-ink [font-variant-numeric:lining-nums_tabular-nums]">{dentro}</span>
              <span className="mt-1 text-[13px] text-ink-soft">{`de ${esperados} ${esperados === 1 ? 'persona' : 'personas'} dentro`}</span>
            </p>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-line-panel rounded-[14px] bg-bg-top/60 py-3 text-center">
            {(
              [
                ['Dentro', cuantos('dentro'), 'text-sage'],
                ['Por llegar', cuantos('por_llegar'), 'text-ink'],
                ['No vienen', cuantos('no_viene'), 'text-ink-mute'],
              ] as const
            ).map(([k, v, tono]) => (
              <div className="flex flex-col gap-0.5" key={k}>
                <dt className="text-[11px] text-ink-mute">{k}</dt>
                <dd className={`font-display text-[24px] leading-none ${tono} [font-variant-numeric:lining-nums]`}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Últimas llegadas" className="hidden flex-col gap-3 rounded-[18px] border border-line-panel bg-white p-5 shadow-card min-[1100px]:flex">
          <h2 className="m-0 font-display text-[19px] font-light text-ink italic">Últimas llegadas</h2>
          {recientes.length === 0 ? (
            <p className="text-[12.5px] text-ink-mute">Todavía no entró nadie.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recientes.map((f) => (
                <li className="flex items-center justify-between gap-3 text-[13px]" key={f.clave}>
                  <span className="min-w-0 truncate text-ink">{f.nombre}</span>
                  <span className="shrink-0 font-mono text-[11px] text-sage">{f.hora}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recepcion === null ? null : (
          <section aria-label="Recepción" className="flex flex-col gap-3 rounded-[18px] border border-line-panel bg-white p-5 shadow-card max-[1099px]:order-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="m-0 font-display text-[19px] font-light text-ink italic">Recepción</h2>
              <span className="text-[12px] text-ink-mute">{`${recepcion.personas.length} con acceso`}</span>
            </div>
            {recepcion.personas.length === 0 ? (
              <p className="text-[12.5px] leading-[1.6] text-ink-soft">
                Solo tú registras ingresos. Suma a quien reciba en la puerta: le llega un enlace y un PIN para escanear desde su celular, sin crear cuenta.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {recepcion.personas.map((p) => (
                  <li className="flex items-center gap-3" key={p.id}>
                    <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br ${avatarColor(p.nombre)} text-[12px] text-white`}>
                      {(p.nombre.trim()[0] ?? '·').toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13.5px] text-ink">{p.nombre}</span>
                      <span className="truncate text-[11.5px] text-ink-mute">{[p.puerta, `${p.registradas} ${p.registradas === 1 ? 'ingreso registrado' : 'ingresos registrados'}`].filter(Boolean).join(' · ')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="flex items-center justify-center gap-2 rounded-full border border-line-panel-strong px-5 py-2.5 text-[12.5px] text-ink transition hover:border-ink" href={recepcion.gestionarHref}>
              <UsersIcon className="size-4" />
              {recepcion.personas.length === 0 ? 'Sumar personal de recepción' : 'Sumar o quitar personal'}
            </Link>
          </section>
        )}
      </aside>

      <div className="flex min-w-0 flex-col gap-4.5 max-[1099px]:contents min-[1100px]:order-1">
        {/* Cómo se entra: con el pase. El QR o su código. */}
        <section aria-label="Registrar un ingreso" className="flex flex-col gap-4 rounded-[18px] border border-line-panel bg-white p-5 shadow-card max-[1099px]:order-1">
          <div className="flex flex-col gap-3 min-[640px]:flex-row min-[640px]:items-stretch">
            <button
              className="flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-ink px-6 py-3.5 text-[14px] text-white transition-colors hover:bg-ink/90"
              onClick={abrirEscaner}
              type="button"
            >
              <ScanIcon className="size-5" />
              Escanear QR
            </button>
            <span className="self-center text-[12px] text-ink-mute">o</span>
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                buscarCodigo()
              }}
            >
              <label className="sr-only" htmlFor="codigo-del-pase">
                Código del pase
              </label>
              <input
                autoCapitalize="characters"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-[14px] border border-line-panel-strong bg-bg-top/40 px-4 py-3 font-mono text-[16px] tracking-[0.25em] text-ink uppercase outline-none placeholder:font-sans placeholder:text-[13px] placeholder:tracking-normal placeholder:normal-case focus-visible:border-ink"
                id="codigo-del-pase"
                maxLength={8}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código del pase, ej. K7P3X"
                value={codigo}
              />
              <button className="shrink-0 cursor-pointer rounded-[14px] border border-ink px-5 text-[13px] text-ink transition-colors hover:bg-ink hover:text-white" type="submit">
                Buscar
              </button>
            </form>
          </div>

          {porCodigo === null || encontrada.length === 0 ? null : (
            <div className="flex flex-col gap-3 rounded-[14px] border border-gold/40 bg-bg-top/60 p-4" role="status">
              <p className="m-0 flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-[22px] font-light text-ink">{encontrada[0]!.invitacion ?? encontrada[0]!.nombre}</span>
                <span className="text-[12.5px] text-ink-soft">{encontrada[0]!.mesa ?? 'Sin mesa'}</span>
              </p>
              <ul className="flex flex-col gap-1.5">
                {encontrada.map((f) =>
                  f.estado === 'dentro' ? (
                    <li className="flex items-center justify-between rounded-[10px] bg-white/70 px-3 py-2 text-[13.5px]" key={f.clave}>
                      <span className="text-ink-soft">{f.nombre}</span>
                      <span className="text-[12px] text-sage">{f.hora === null ? 'Ya entró' : `Entró ${f.hora}`}</span>
                    </li>
                  ) : (
                    <li key={f.clave}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-[10px] bg-white px-3 py-2 text-[13.5px] text-ink">
                        <input
                          checked={porCodigo.marcadas.has(f.clave)}
                          className="size-4 accent-ink"
                          onChange={(e) => {
                            // Se lee ya: dentro del actualizador React ya devolvió la casilla a su valor controlado.
                            const marcada = e.target.checked
                            setPorCodigo((previo) => {
                              if (previo === null) return previo
                              const marcadas = new Set(previo.marcadas)
                              if (marcada) marcadas.add(f.clave)
                              else marcadas.delete(f.clave)
                              return { ...previo, marcadas }
                            })
                          }}
                          type="checkbox"
                        />
                        {f.nombre}
                        {f.vip ? <span className="rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[10.5px] tracking-[0.2em] text-gold-deep">VIP</span> : null}
                      </label>
                    </li>
                  ),
                )}
              </ul>
              {encontrada.every((f) => f.estado === 'dentro') ? (
                <p className="m-0 text-[13px] text-ink-soft">Ya entraron todos los de esta invitación.</p>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="cursor-pointer rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-40"
                    disabled={enCurso !== null || porCodigo.marcadas.size === 0}
                    onClick={(e) => registrar(encontrada.filter((f) => porCodigo.marcadas.has(f.clave)), e.timeStamp + performance.timeOrigin, 'codigo')}
                    type="button"
                  >
                    {enCurso === 'codigo' ? 'Registrando…' : `Registrar ingreso${porCodigo.marcadas.size > 1 ? ` (${porCodigo.marcadas.size})` : ''}`}
                  </button>
                  <button className="cursor-pointer rounded-full border border-line-panel-strong px-4 py-2.5 text-[13px] text-ink" onClick={() => setPorCodigo(null)} type="button">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {aviso === null ? null : (
            <p className="m-0 rounded-[12px] bg-danger/10 px-4 py-3 text-[13px] text-danger" role="alert">
              {aviso}
            </p>
          )}

          {nota === null ? null : (
            <p className="m-0 rounded-[12px] bg-sage/12 px-4 py-3 text-[13px] text-ink-soft" role="status">
              {nota}
            </p>
          )}
        </section>

        <section aria-label="Invitados" className="flex flex-col gap-4 rounded-[18px] border border-line-panel bg-white p-4 shadow-card max-[1099px]:order-3 min-[560px]:p-5">
          <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-center">
            <div className="flex gap-1 overflow-x-auto rounded-full bg-bg-top p-1" role="tablist">
              {FILTROS.map((f) => (
                <button
                  aria-selected={buscado === '' && filtro === f.clave}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${buscado === '' && filtro === f.clave ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                  key={f.clave}
                  onClick={() => {
                    setFiltro(f.clave)
                    setBusqueda('')
                  }}
                  role="tab"
                  type="button"
                >
                  {`${f.texto} ${cuantos(f.clave)}`}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <SearchField className="w-full" label="Buscar invitado" onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre…" value={busqueda} />
            </div>
            {/* Traer lo que registró la recepción desde otro teléfono. A mano: quien mira decide cuándo. */}
            <button
              aria-busy={actualizando}
              className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-panel-strong px-4 py-2 text-[12.5px] text-ink transition hover:border-ink disabled:opacity-50"
              disabled={actualizando}
              onClick={() => actualizar(() => router.refresh())}
              type="button"
            >
              <RefreshIcon className={`size-4 ${actualizando ? 'animate-spin' : ''}`} />
              {actualizando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          {porInvitacion.length === 0 ? (
            <EmptyState
              compact
              {...(filas.length === 0 ? { icon: <UsersIcon />, description: 'Cuando cargues invitados, aquí se registra su llegada.' } : filtro === 'por_llegar' && buscado === '' ? { icon: <CheckIcon /> } : {})}
              title={filas.length === 0 ? 'Aún no hay invitados' : buscado !== '' ? 'Nadie con ese nombre' : filtro === 'por_llegar' ? 'Llegaron todos los que se esperaban' : 'Nadie en esta lista'}
            />
          ) : (
            <div aria-label="Ingresos" role="table">
              <div className={`${COLUMNAS} border-b border-line-panel pb-2.5 font-mono text-[10.5px] tracking-[0.16em] text-ink-mute uppercase max-[759px]:hidden`} role="row">
                <span role="columnheader">Invitado</span>
                <span role="columnheader">Invitación · Mesa</span>
                <span role="columnheader">Personas</span>
                <span role="columnheader">Estado</span>
                <span className="text-right" role="columnheader">
                  <span className="sr-only">Acción</span>
                </span>
              </div>
              {porInvitacion.map((bloque) => {
                const todas = vistas.filter((v) => v.invitacionId === bloque.id)
                const pendientes = todas.filter((v) => v.estado !== 'dentro')
                const familia = todas.length > 1
                // Plegada, una familia se lee como una línea; buscando se abre sola, que es cuando se busca a alguien.
                const abierta = !familia || abiertas.has(bloque.id) || buscado !== ''
                const dentroN = todas.length - pendientes.length
                const nombreDeBloque = bloque.filas[0]?.invitacion ?? bloque.filas[0]?.nombre ?? ''
                return (
                  <div className={familia ? 'border-l-2 border-l-gold/40' : ''} key={bloque.id} role="rowgroup">
                    {familia ? (
                      <div className={`${COLUMNAS} border-b border-line-panel py-3 pl-3`} role="row">
                        <span className="flex min-w-0" role="cell">
                          <button
                            aria-expanded={abierta}
                            className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
                            onClick={() =>
                              setAbiertas((previo) => {
                                const siguiente = new Set(previo)
                                if (siguiente.has(bloque.id)) siguiente.delete(bloque.id)
                                else siguiente.add(bloque.id)
                                return siguiente
                              })
                            }
                            type="button"
                          >
                            <ChevronIcon className={`size-4 shrink-0 text-ink-mute transition-transform ${abierta ? '' : '-rotate-90'}`} />
                            <span aria-hidden className="flex -space-x-2">
                              {todas.slice(0, 3).map((v) => (
                                <span
                                  className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] text-white ring-2 ring-white ${v.estado === 'dentro' ? 'bg-sage' : `bg-linear-to-br ${avatarColor(v.nombre)}`}`}
                                  key={v.clave}
                                >
                                  {(v.nombre.trim()[0] ?? '·').toUpperCase()}
                                </span>
                              ))}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-[14.5px] text-ink">{nombreDeBloque}</span>
                              <span className="truncate text-[11.5px] text-ink-mute min-[760px]:hidden">
                                {[`${todas.length} personas`, bloque.filas[0]?.mesa, dentroN === 0 ? 'Por llegar' : `${dentroN} dentro`].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </button>
                        </span>
                        <span className="min-w-0 truncate text-[13px] text-ink-soft max-[759px]:hidden" role="cell">
                          {bloque.filas[0]?.mesa ?? 'Sin mesa'}
                        </span>
                        <span className="text-[13px] text-ink-soft max-[759px]:hidden" role="cell">
                          {`${todas.length} personas`}
                        </span>
                        <span className="max-[759px]:hidden" role="cell">
                          {dentroN === 0 ? (
                            todas.every((v) => v.estado === 'no_viene') ? (
                              <span className="inline-flex rounded-full bg-bg-top px-2.5 py-1 text-[12px] text-ink-mute">No vienen</span>
                            ) : (
                              <span className="inline-flex rounded-full border border-line-panel-strong px-2.5 py-1 text-[12px] text-ink-soft">Por llegar</span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-2.5 py-1 text-[12px] text-sage">
                              {dentroN === todas.length ? 'Dentro' : `${dentroN} de ${todas.length} dentro`}
                            </span>
                          )}
                        </span>
                        <span className="flex justify-end" role="cell">
                          {pendientes.length > 1 ? (
                            <button
                              aria-label={`Registrar sin pase a los ${pendientes.length} de ${nombreDeBloque}`}
                              className="cursor-pointer text-[12px] text-ink-mute underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
                              disabled={enCurso !== null}
                              onClick={() => registrar(pendientes, Date.now(), `todos:${bloque.id}`)}
                              title="Solo si la familia no trae ni el QR ni el código del pase"
                              type="button"
                            >
                              {enCurso === `todos:${bloque.id}` ? 'Registrando…' : `Sin pase, los ${pendientes.length}`}
                            </button>
                          ) : null}
                        </span>
                      </div>
                    ) : null}
                    {!abierta
                      ? null
                      : bloque.filas.map((f) => (
                          <div aria-label={f.nombre} className={`${COLUMNAS} border-b border-line-panel py-3 ${familia ? 'pl-9' : ''}`} key={f.clave} role="row">
                            <span className="flex min-w-0 items-center gap-3" role="cell">
                              <span
                                aria-hidden
                                className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] text-white ${f.estado === 'dentro' ? 'bg-sage' : `bg-linear-to-br ${avatarColor(f.nombre)}`}`}
                              >
                                {f.estado === 'dentro' ? <CheckIcon className="size-4" /> : (f.nombre.trim()[0] ?? '·').toUpperCase()}
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="truncate text-[14.5px] text-ink">{f.nombre}</span>
                                  {f.vip ? <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[10.5px] tracking-[0.2em] text-gold-deep">VIP</span> : null}
                                </span>
                                <span className="truncate text-[11.5px] text-ink-mute min-[760px]:hidden">
                                  {[familia || f.invitacion === f.nombre ? null : f.invitacion, familia ? null : f.mesa, f.estado === 'dentro' ? (f.hora === null ? 'Dentro' : `Entró ${f.hora}`) : null]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                              </span>
                            </span>
                            <span className="min-w-0 truncate text-[13px] text-ink-soft max-[759px]:hidden" role="cell">
                              {familia ? '' : [f.invitacion ?? f.nombre, f.mesa ?? 'Sin mesa'].join(' · ')}
                            </span>
                            <span className="text-[13px] text-ink-soft max-[759px]:hidden" role="cell">
                              {familia ? '' : '1 persona'}
                            </span>
                            <span className="max-[759px]:hidden" role="cell">
                              {f.estado === 'dentro' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-2.5 py-1 text-[12px] text-sage">{f.hora === null ? 'Dentro' : `Entró ${f.hora}`}</span>
                              ) : f.estado === 'no_viene' ? (
                                <span className="inline-flex rounded-full bg-bg-top px-2.5 py-1 text-[12px] text-ink-mute">No viene</span>
                              ) : (
                                <span className="inline-flex rounded-full border border-line-panel-strong px-2.5 py-1 text-[12px] text-ink-soft">Por llegar</span>
                              )}
                            </span>
                            <span className="flex justify-end" role="cell">
                              {confirmar === f.clave ? (
                                <span className="flex items-center gap-1.5" role="alert">
                                  <button
                                    className={`cursor-pointer rounded-full px-3 py-1.5 text-[12px] text-white ${f.estado === 'dentro' ? 'bg-danger' : 'bg-ink'}`}
                                    onClick={() => (f.estado === 'dentro' ? deshacer(f) : registrar([f], Date.now(), f.clave))}
                                    type="button"
                                  >
                                    {f.estado === 'dentro' ? 'Deshacer' : 'Registrar'}
                                  </button>
                                  <button className="cursor-pointer px-2 py-1.5 text-[12px] text-ink-soft" onClick={() => setConfirmar(null)} type="button">
                                    No
                                  </button>
                                </span>
                              ) : f.estado === 'dentro' ? (
                                <button
                                  aria-label={`Deshacer el ingreso de ${f.nombre}`}
                                  className="cursor-pointer text-[12px] text-ink-mute underline-offset-4 hover:text-danger hover:underline disabled:opacity-50"
                                  disabled={enCurso !== null}
                                  onClick={() => setConfirmar(f.clave)}
                                  type="button"
                                >
                                  {enCurso === f.clave ? 'Deshaciendo…' : 'Deshacer'}
                                </button>
                              ) : (
                                <button
                                  aria-label={`Registrar sin pase a ${f.nombre}`}
                                  className="cursor-pointer text-[12px] text-ink-mute underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
                                  disabled={enCurso !== null}
                                  onClick={() => setConfirmar(f.clave)}
                                  title="Solo si no trae ni el QR ni el código del pase"
                                  type="button"
                                >
                                  {enCurso === f.clave ? 'Registrando…' : 'Sin pase'}
                                </button>
                              )}
                            </span>
                          </div>
                        ))}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
