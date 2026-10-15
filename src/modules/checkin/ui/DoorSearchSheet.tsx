'use client'

import { useMemo, useState } from 'react'
import { comparable } from '@/shared/texto'
import type { DoorManifestGroup } from '../application/get-door-manifest'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

type Props = {
  groups: readonly DoorManifestGroup[]
  arrivedIds: ReadonlySet<string>
  /** Quién de cada invitación ya entró, y a qué hora (del manifiesto y lo registrado en esta puerta). */
  dentro: (groupId: string) => Readonly<Record<string, Date>>
  open: boolean
  onPick: (groupId: string) => void
  onClose: () => void
}

type Pestana = 'llegar' | 'dentro' | 'no'
const pestanas = (t: T): readonly { clave: Pestana; nombre: string }[] => [
  { clave: 'llegar', nombre: t('Por llegar', 'Expected') },
  { clave: 'dentro', nombre: t('Dentro', 'Inside') },
  { clave: 'no', nombre: t('No vienen', 'Not coming') },
]

const horaEnBolivia = (d: Date) => d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })

/**
 * **La lista de la puerta** (9 oct; antes solo «Buscar por nombre»): quién falta, quién entró y quién dijo que
 * no, con su mesa, y el buscador encima. Es lo único que el portero ve de los invitados —como el rol «Check-in»
 * de las apps de recepción—: ni teléfonos, ni enlaces, ni nada que editar. Sale del manifiesto del teléfono, así
 * que funciona sin red. Buscar mira a todos, también los revocados: quien aparece en la puerta aparece, y el
 * personal decide.
 */
export function DoorSearchSheet({ groups, arrivedIds, dentro, open, onPick, onClose }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [pestana, setPestana] = useState<Pestana>('llegar')

  const filas = useMemo(() => {
    const todas = [...groups]
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
      .map((g) => {
        const llegaron = dentro(g.id)
        const total = g.people.length > 0 ? g.people.length : g.seats
        // Una llegada sin personas anotadas (puertas antiguas, búsqueda a mano) es «entraron todos», como en el servidor.
        const porPersona = g.people.length > 0 && Object.keys(llegaron).length > 0
        const cuantosDentro = !arrivedIds.has(g.id) ? 0 : porPersona ? g.people.filter((p) => llegaron[p.id] !== undefined).length : total
        const primera = Object.values(llegaron).sort((a, b) => a.getTime() - b.getTime())[0]
        const completa = arrivedIds.has(g.id) && cuantosDentro >= total
        return { g, cuantosDentro, total, primera, completa, entro: arrivedIds.has(g.id) }
      })
    return {
      llegar: todas.filter((f) => !f.g.revoked && f.g.attending !== 0 && !f.completa),
      dentro: todas.filter((f) => f.entro),
      no: todas.filter((f) => f.g.attending === 0 && !f.entro),
      todas,
    }
  }, [groups, arrivedIds, dentro])

  if (!open) return null

  const buscado = comparable(query)
  const visibles = buscado
    ? filas.todas.filter((f) => comparable(f.g.label).includes(buscado) || f.g.people.some((p) => comparable(p.fullName).includes(buscado)))
    : filas[pestana]

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-bg text-ink">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <h2 className="font-display text-[22px] italic">{t('Invitados', 'Guests')}</h2>
        <button aria-label={t('Cerrar', 'Close')} className="ml-auto size-10 rounded-full border border-line bg-bg-raised" onClick={onClose} type="button">
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4 pb-2">
        <input
          autoComplete="off"
          className="w-full rounded-full border border-line bg-bg-sunken px-4 py-3 text-[14px]"
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Nombre del invitado...', 'Guest name...')}
          value={query}
        />
        {buscado ? null : (
          <div aria-label={t('Qué lista ver', 'Which list to view')} className="flex gap-1 rounded-full border border-line bg-bg-raised p-1" role="tablist">
            {pestanas(t).map((p) => (
              <button
                aria-selected={pestana === p.clave}
                className={`min-h-11 flex-1 rounded-full px-2 text-[12px] transition-colors ${pestana === p.clave ? 'bg-ink text-white' : 'text-ink-soft'}`}
                key={p.clave}
                onClick={() => setPestana(p.clave)}
                role="tab"
                type="button"
              >
                {p.nombre} · {filas[p.clave].length}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6" role={buscado ? undefined : 'tabpanel'}>
        {visibles.length === 0 ? (
          <p className="p-10 text-center text-[12px] text-ink-mute">
            {buscado ? t('Nadie coincide.', 'No one matches.') : pestana === 'llegar' ? t('Ya llegaron todos.', 'Everyone has arrived.') : pestana === 'dentro' ? t('Todavía no entró nadie.', 'No one is in yet.') : t('Nadie dijo que no.', 'No one said no.')}
          </p>
        ) : (
          visibles.map(({ g, cuantosDentro, total, primera, completa, entro }) => (
            <button
              className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-line bg-bg-raised p-3.5 text-left text-[14px] disabled:opacity-60"
              disabled={completa}
              key={g.id}
              onClick={() => onPick(g.id)}
              type="button"
            >
              <span className="min-w-0 flex-1">
                <span className="block">{g.label}</span>
                <span className="mt-0.5 block text-[11px] text-ink-mute">
                  {[
                    g.tableLabel,
                    entro ? t(`${cuantosDentro} de ${total} dentro${primera ? ` · ${horaEnBolivia(primera)}` : ''}`, `${cuantosDentro} of ${total} inside${primera ? ` · ${horaEnBolivia(primera)}` : ''}`) : t(`${g.seats} cupo${g.seats === 1 ? '' : 's'}`, `${g.seats} seat${g.seats === 1 ? '' : 's'}`),
                    g.attending === null ? t('sin confirmar', 'not confirmed') : g.attending === 0 ? t('dijo que no', 'said no') : null,
                    g.revoked ? t('invitación revocada', 'invitation revoked') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="font-mono text-[10.5px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">{completa ? t('Ya llegó', 'Already arrived') : entro ? t('Registrar al resto', 'Check in the rest') : t('Registrar', 'Check in')}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
