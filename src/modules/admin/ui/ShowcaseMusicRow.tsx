'use client'

import { useActionState, useId } from 'react'
import { PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { removeShowcaseMusicAction, uploadShowcaseMusicAction, type AdminActionState } from '../actions'

const INICIAL: AdminActionState = { status: 'idle' }

/**
 * Un modelo del escaparate y su canción.
 *
 * Cada fila lleva **su propio estado**: con uno compartido para los dieciséis, subir la
 * música de «Botánica» pintaría el acierto —o el fallo— en las quince filas restantes.
 *
 * Y lleva su reproductor cuando ya hay música, porque por el nombre del archivo no se
 * distingue una toma de otra: la única forma de saber que la subida es la buena es oírla
 * aquí, antes de que la oiga quien entre en la web.
 */
export function ShowcaseMusicRow({
  themeKey,
  label,
  tieneMusica,
}: {
  themeKey: string
  label: string
  tieneMusica: boolean
}) {
  const [alta, subir, subiendo] = useActionState<AdminActionState, FormData>(uploadShowcaseMusicAction, INICIAL)
  const [baja, quitar, quitando] = useActionState<AdminActionState, FormData>(removeShowcaseMusicAction, INICIAL)
  const id = useId()

  const estado = alta.status !== 'idle' ? alta : baja

  return (
    <li className="flex flex-col gap-3 border-b border-line-panel py-4 last:border-none">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[14px] text-ink">{label}</span>
        <span className="font-mono text-[10px] tracking-[0.2em] text-ink-mute uppercase">{themeKey}</span>
      </div>

      {tieneMusica ? (
        // La sirve la misma ruta pública que el escaparate, así que si aquí suena, ahí
        // también; y si aquí no, ahí tampoco. Sin subtítulos a propósito: es música
        // instrumental de fondo, no habla.
        <audio className="w-full max-w-[420px]" controls preload="none" src={`/modelos/musica/${themeKey}`} />
      ) : (
        <p className="text-[12px] text-ink-mute">Sin música: el reproductor se ve pero no suena.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form action={subir} className="flex flex-wrap items-center gap-3">
          <input name="themeKey" type="hidden" value={themeKey} />
          <label className="sr-only" htmlFor={id}>
            MP3 para {label}
          </label>
          <input
            accept="audio/mpeg,.mp3"
            className="max-w-[320px] text-[13px] text-ink-soft file:mr-3 file:rounded-[var(--radius-pill)] file:border file:border-line-panel-strong file:bg-white file:px-4 file:py-2 file:font-mono file:text-[10px] file:tracking-[0.25em] file:text-ink file:uppercase"
            id={id}
            name="musica"
            type="file"
          />
          <PanelButton disabled={subiendo} type="submit">
            {subiendo ? 'Subiendo…' : tieneMusica ? 'Reemplazar' : 'Subir'}
          </PanelButton>
        </form>

        {tieneMusica ? (
          <form action={quitar}>
            <input name="themeKey" type="hidden" value={themeKey} />
            <PanelButton disabled={quitando} type="submit" variant="danger">
              {quitando ? 'Quitando…' : 'Quitar'}
            </PanelButton>
          </form>
        ) : null}
      </div>

      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
      {estado.status === 'success' && estado.message !== undefined ? (
        <PanelAlert tone="ok">{estado.message}</PanelAlert>
      ) : null}
    </li>
  )
}
