'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FilterChip, Pill, SearchField } from '@/shared/design/ui/panel/PanelKit'
import type { EstadoDeLlegada } from '../domain/lista-de-llegadas'

export type FilaDeLlegadaVista = {
  readonly clave: string
  readonly nombre: string
  readonly invitacion: string | null
  readonly estado: EstadoDeLlegada
  /** «19:40», en hora de Bolivia, ya formateada. */
  readonly hora: string | null
}

type Filtro = 'todos' | EstadoDeLlegada

const FILTROS: ReadonlyArray<{ clave: Filtro; texto: string }> = [
  { clave: 'todos', texto: 'Todos' },
  { clave: 'dentro', texto: 'Dentro' },
  { clave: 'por_llegar', texto: 'Por llegar' },
  { clave: 'no_viene', texto: 'No vienen' },
]

const ORDEN: Record<EstadoDeLlegada, number> = { dentro: 0, por_llegar: 1, no_viene: 2 }

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Quién está dentro y a quién se espera, persona por persona. Se refresca sola cada veinte
 * segundos: la recepción escanea en otro teléfono y aquí se va viendo.
 */
export function ListaDeLlegadas({ filas }: { filas: readonly FilaDeLlegadaVista[] }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000)
    return () => clearInterval(t)
  }, [router])

  const cuantos = (f: Filtro) => (f === 'todos' ? filas.length : filas.filter((x) => x.estado === f).length)
  const buscado = normal(busqueda.trim())
  const visibles = filas
    .filter((f) => filtro === 'todos' || f.estado === filtro)
    .filter((f) => buscado === '' || normal(`${f.nombre} ${f.invitacion ?? ''}`).includes(buscado))
    // Primero quien entró —lo último arriba—, después quien falta, por nombre.
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || (a.estado === 'dentro' ? (b.hora ?? '').localeCompare(a.hora ?? '') : a.nombre.localeCompare(b.nombre)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <FilterChip active={filtro === f.clave} key={f.clave} onClick={() => setFiltro(f.clave)}>
            {`${f.texto} ${cuantos(f.clave)}`}
          </FilterChip>
        ))}
        <div className="min-w-[220px] flex-1">
          <SearchField label="Buscar invitado" onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre…" value={busqueda} />
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-panel-strong px-4 py-6 text-center text-[13px] text-ink-mute">
          {filas.length === 0 ? 'Todavía no hay invitados.' : 'Nadie en este filtro.'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-panel">
          {visibles.map((f) => (
            <li aria-label={f.nombre} className="flex flex-wrap items-center gap-3 py-2.5" key={f.clave}>
              <span className={`grid size-2.5 shrink-0 rounded-full ${f.estado === 'dentro' ? 'bg-sage' : f.estado === 'por_llegar' ? 'bg-gold-light' : 'bg-line-panel-strong'}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] text-ink">{f.nombre}</span>
                {f.invitacion !== null && f.invitacion !== f.nombre ? <span className="truncate text-[11.5px] text-ink-mute">{f.invitacion}</span> : null}
              </span>
              {f.estado === 'dentro' ? (
                <Pill tone="ok">{f.hora === null ? 'Entró' : `Entró ${f.hora}`}</Pill>
              ) : f.estado === 'por_llegar' ? (
                <Pill tone="pending">Por llegar</Pill>
              ) : (
                <Pill tone="no">No viene</Pill>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
