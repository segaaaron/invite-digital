'use client'

import { useId } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import type { PreguntasDelRsvp } from '../domain/preguntas'

const CAMPO = 'w-full rounded-[10px] border border-[var(--color-line)] bg-transparent px-3.5 py-2.5 text-[14px] text-ink'
const ROTULO = 'font-mono text-[10px] tracking-[0.2em] uppercase opacity-80'

/**
 * Lo que el anfitrión pregunta al confirmar, además de si viene: canción, menú y a qué actos va.
 * Solo con el «sí»: quien no viene no elige menú. Los colores salen del diseño (`--color-line`).
 */
export function PreguntasExtra({ preguntas, dictionary }: { preguntas: PreguntasDelRsvp; dictionary: InvitationDictionary }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-3 text-left">
      {preguntas.actos.length === 0 ? null : (
        <fieldset className="flex flex-col gap-2">
          <legend className={`${ROTULO} mb-1.5`}>{dictionary.actsLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {preguntas.actos.map((acto) => (
              <label className="flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-[13px]" key={acto}>
                <input className="accent-[var(--color-cta)]" defaultChecked name="acts" type="checkbox" value={acto} />
                {acto}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {preguntas.menus.length === 0 ? null : (
        <label className="flex flex-col gap-1.5" htmlFor={`${id}-menu`}>
          <span className={ROTULO}>{dictionary.menuLabel}</span>
          <select className={CAMPO} defaultValue="" id={`${id}-menu`} name="menu">
            <option value="">{dictionary.menuChoose}</option>
            {preguntas.menus.map((menu) => (
              <option key={menu} value={menu}>
                {menu}
              </option>
            ))}
          </select>
        </label>
      )}
      {preguntas.cancion ? (
        <label className="flex flex-col gap-1.5" htmlFor={`${id}-cancion`}>
          <span className={ROTULO}>{dictionary.songLabel}</span>
          <input className={CAMPO} id={`${id}-cancion`} maxLength={200} name="song" placeholder={dictionary.songPlaceholder} type="text" />
        </label>
      ) : null}
    </div>
  )
}
