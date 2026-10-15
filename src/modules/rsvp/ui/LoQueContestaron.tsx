'use client'

import type { ResultadosDePreguntas } from '../domain/preguntas'
import { useT } from '@/shared/i18n/idioma-navegador'

function Cuenta({ titulo, filas }: { titulo: string; filas: ResultadosDePreguntas['menus'] }) {
  if (filas.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[12px] font-medium text-ink-mute">{titulo}</h3>
      <ul className="flex flex-wrap gap-2">
        {filas.map((f) => (
          <li className="rounded-full border border-line-panel px-3 py-1 text-[13px] text-ink tabular-nums" key={f.opcion}>
            {f.opcion} · {f.veces}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Lo contestado a las preguntas extra: menús y actos contados, y las canciones con quién las pidió. */
export function LoQueContestaron({ resultados }: { resultados: ResultadosDePreguntas }) {
  const t = useT()
  const { canciones, menus, actos } = resultados
  if (canciones.length + menus.length + actos.length === 0) {
    return <p className="text-[13px] text-ink-soft">{t('Todavía nadie contestó las preguntas.', 'Nobody has answered the questions yet.')}</p>
  }
  return (
    <div className="flex flex-col gap-4">
      <Cuenta filas={actos} titulo={t('Invitaciones por acto', 'Invitations per ceremony')} />
      <Cuenta filas={menus} titulo={t('Menú elegido por invitación', 'Menu chosen per invitation')} />
      {canciones.length === 0 ? null : (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[12px] font-medium text-ink-mute">{t('Canciones pedidas', 'Requested songs')}</h3>
          <ul className="flex flex-col divide-y divide-line-panel">
            {canciones.map((c) => (
              <li className="flex flex-wrap justify-between gap-2 py-2 text-[13px]" key={`${c.invitacion}-${c.cancion}`}>
                <span className="text-ink">{c.cancion}</span>
                <span className="text-ink-mute">{c.invitacion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
