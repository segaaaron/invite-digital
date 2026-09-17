'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { checkInByGroupAction } from '@/app/_acciones/checkin/actions'
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
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000)
    return () => clearInterval(t)
  }, [router])

  // Lo registrado aquí cuenta ya, aunque el servidor aún no haya vuelto a pintar.
  const vistas = filas.map((f) => (entraron[f.clave] !== undefined && f.estado !== 'dentro' ? { ...f, estado: 'dentro' as const, hora: entraron[f.clave] ?? null } : f))
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

  const registrar = (f: FilaDeIngreso, ahoraMs: number) => {
    setEnCurso(f.clave)
    setAviso(null)
    void checkInByGroupAction({
      eventId,
      eventSlug,
      groupId: f.invitacionId,
      scanId: crypto.randomUUID(),
      arrivedCount: null,
      scannedAtMs: ahoraMs,
      personIds: f.personaId === null ? null : [f.personaId],
    })
      .then(() => {
        setEntraron((previo) => ({ ...previo, [f.clave]: horaAhora() }))
        router.refresh()
      })
      // Dar el ingreso por bueno sin que la base lo tenga deja a alguien fuera de la lista toda la noche.
      .catch(() => setAviso(`No se pudo registrar a ${f.nombre}. Vuelve a intentarlo.`))
      .finally(() => setEnCurso(null))
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
            {visibles.map((f) => (
              <li aria-label={f.nombre} className="flex items-center gap-3 py-3" key={f.clave}>
                <span
                  aria-hidden
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-[14px] ${f.estado === 'dentro' ? 'bg-sage text-white' : 'bg-bg-top text-ink-soft'}`}
                >
                  {f.estado === 'dentro' ? <CheckIcon className="size-4" /> : (f.nombre.trim()[0] ?? '·').toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] text-ink">{f.nombre}</span>
                  <span className="truncate text-[12px] text-ink-mute">
                    {[f.invitacion !== null && f.invitacion !== f.nombre ? f.invitacion : null, f.mesa, f.estado === 'no_viene' ? 'dijo que no viene' : null].filter(Boolean).join(' · ') || ' '}
                  </span>
                </span>
                {f.estado === 'dentro' ? (
                  <span className="shrink-0 text-right text-[12.5px] text-sage">{f.hora === null ? 'Entró' : `Entró ${f.hora}`}</span>
                ) : (
                  <button
                    aria-busy={enCurso === f.clave || undefined}
                    aria-label={`Registrar el ingreso de ${f.nombre}`}
                    className="shrink-0 cursor-pointer rounded-full border border-ink px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-ink uppercase transition-colors hover:bg-ink hover:text-white disabled:cursor-wait disabled:opacity-50"
                    disabled={enCurso !== null}
                    onClick={() => registrar(f, Date.now())}
                    type="button"
                  >
                    {enCurso === f.clave ? 'Registrando…' : 'Registrar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
