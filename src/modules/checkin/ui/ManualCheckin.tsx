'use client'

import { useMemo, useState } from 'react'
import { checkInByGroupAction } from '../actions'

export type ManualGroup = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly attending: number | null
  readonly revoked: boolean
}

type Props = {
  eventId: string
  eventSlug: string
  groups: readonly ManualGroup[]
  arrivedIds: readonly string[]
}

/**
 * El mostrador de la recepción, dentro del panel: para quien llega sin el pase, con el
 * celular sin batería o con la pantalla rota.
 *
 * Aquí **no hay cámara**. La cámara vive solo en el modo puerta, a pantalla completa, que
 * es como se usa: un celular o una tablet en la mano de quien recibe. Un vídeo encendido
 * dentro del panel de escritorio no sirve a nadie y encima falla donde no hay cámara.
 */
export function ManualCheckin({ eventId, eventSlug, groups, arrivedIds }: Props) {
  const [query, setQuery] = useState('')
  const [dentro, setDentro] = useState<ReadonlySet<string>>(() => new Set(arrivedIds))
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const ordenados = [...groups].sort((a, b) => a.label.localeCompare(b.label, 'es'))
    if (!needle) return ordenados.slice(0, 20)
    return ordenados.filter((g) => g.label.toLowerCase().includes(needle)).slice(0, 20)
  }, [groups, query])

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          Buscar por nombre o grupo
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Familia Rojas Peña..."
          autoComplete="off"
          className="w-full rounded-full border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none focus-visible:border-gold"
        />
      </label>

      {error === null ? null : (
        <p className="text-[13px] text-gold-deep" role="alert">
          {error}
        </p>
      )}

      {hits.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Ningún grupo coincide.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {hits.map((g) => {
            const llego = dentro.has(g.id)
            return (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg-top/60 p-3.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] text-ink">{g.label}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-mute">
                    {g.seats} cupo{g.seats === 1 ? '' : 's'}
                    {g.attending === null ? ' · sin confirmar' : ` · confirmaron ${g.attending}`}
                    {g.revoked ? ' · invitación revocada' : ''}
                  </span>
                </span>

                {llego ? (
                  <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-sage uppercase">
                    Ya está dentro
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={enCurso === g.id}
                    onClick={() => {
                      setEnCurso(g.id)
                      setError(null)
                      void checkInByGroupAction({
                        eventId,
                        eventSlug,
                        groupId: g.id,
                        scanId: crypto.randomUUID(),
                        arrivedCount: null,
                        scannedAtMs: Date.now(),
                      })
                        .then(() => setDentro((previo) => new Set(previo).add(g.id)))
                        // El detalle va al registro del servidor; aquí se canta que no
                        // entró. Dar la llegada por buena sin que la base la tenga deja a
                        // una familia fuera de la lista el resto de la noche.
                        .catch(() => setError('No se pudo registrar la llegada. Vuelve a intentarlo.'))
                        .finally(() => setEnCurso(null))
                    }}
                    className="rounded-full border border-line px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase transition-colors hover:border-gold/60 disabled:opacity-50"
                  >
                    {enCurso === g.id ? 'Registrando…' : 'Registrar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
