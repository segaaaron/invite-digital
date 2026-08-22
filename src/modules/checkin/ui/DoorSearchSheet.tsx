'use client'

import { useMemo, useState } from 'react'
import type { DoorManifestGroup } from '../application/get-door-manifest'

type Props = {
  groups: readonly DoorManifestGroup[]
  arrivedIds: ReadonlySet<string>
  open: boolean
  onPick: (groupId: string) => void
  onClose: () => void
}

/**
 * La salida cuando el pase no se puede leer: sin celular, sin batería, con la pantalla
 * rota, o con el QR impreso y arrugado. Busca sobre todos los grupos, también los
 * revocados: quien aparece en la puerta aparece, y el personal decide.
 */
export function DoorSearchSheet({ groups, arrivedIds, open, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const ordenados = [...groups].sort((a, b) => a.label.localeCompare(b.label, 'es'))
    if (!needle) return ordenados.filter((g) => !arrivedIds.has(g.id) && !g.revoked).slice(0, 20)
    return ordenados.filter((g) => g.label.toLowerCase().includes(needle)).slice(0, 20)
  }, [groups, arrivedIds, query])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-bg text-ink">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <h2 className="font-display text-[22px] italic">Buscar invitado</h2>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="ml-auto size-10 rounded-full border border-line bg-bg-raised"
        >
          ✕
        </button>
      </div>

      <div className="p-4 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre del grupo..."
          autoComplete="off"
          className="w-full rounded-full border border-line bg-bg-sunken px-4 py-3 text-[14px]"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {hits.length === 0 ? (
          <p className="p-10 text-center text-[12px] text-ink-mute">Ningún grupo coincide.</p>
        ) : (
          hits.map((g) => {
            const llego = arrivedIds.has(g.id)
            return (
              <button
                key={g.id}
                type="button"
                disabled={llego}
                onClick={() => onPick(g.id)}
                className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-line bg-bg-raised p-3.5 text-left text-[14px] disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block">{g.label}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-mute">
                    {g.seats} cupo{g.seats === 1 ? '' : 's'}
                    {g.attending === null ? ' · sin confirmar' : ` · confirmaron ${g.attending}`}
                    {g.revoked ? ' · invitación revocada' : ''}
                  </span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
                  {llego ? 'Ya llegó' : 'Registrar'}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
