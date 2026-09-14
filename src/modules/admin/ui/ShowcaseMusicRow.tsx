'use client'

import Image from 'next/image'
import { useActionState, useId } from 'react'
import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import {
  removeShowcaseMusicAction,
  setTemplatePublishedAction,
  uploadShowcaseMusicAction,
  type AdminActionState,
} from '../actions'

const INICIAL: AdminActionState = { status: 'idle' }

/**
 * Un modelo del escaparate y su canción, como tarjeta con la portada del diseño.
 *
 * La portada va delante porque por el nombre no se reconoce un modelo: «Mascarada» o
 * «Encanto Musical» no dicen a qué invitación se le está poniendo la canción, la imagen sí.
 *
 * Cada tarjeta lleva **su propio estado**: con uno compartido para los dieciséis, subir la
 * música de «Botánica» pintaría el acierto —o el fallo— en las quince restantes.
 *
 * Y lleva su reproductor cuando ya hay música, porque por el nombre del archivo no se
 * distingue una toma de otra: la única forma de saber que la subida es la buena es oírla
 * aquí, antes de que la oiga quien entre en la web.
 */
export function ShowcaseMusicRow({
  themeKey,
  label,
  coverSrc,
  tieneMusica,
  cancion,
  publicado,
}: {
  themeKey: string
  label: string
  coverSrc: string
  tieneMusica: boolean
  /** El nombre que dice el reproductor del modelo; `null` en canciones subidas antes de guardarlo. */
  cancion: { track: string; artist: string } | null
  /** Si sale en el catálogo de la web. Retirado no borra: sus enlaces siguen abriendo. */
  publicado: boolean
}) {
  const [alta, subir, subiendo] = useActionState<AdminActionState, FormData>(uploadShowcaseMusicAction, INICIAL)
  const [baja, quitar, quitando] = useActionState<AdminActionState, FormData>(removeShowcaseMusicAction, INICIAL)
  const [publicacion, cambiarPublicacion, cambiando] = useActionState<AdminActionState, FormData>(
    setTemplatePublishedAction,
    INICIAL,
  )
  const id = useId()

  const estado = alta.status !== 'idle' ? alta : baja.status !== 'idle' ? baja : publicacion

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-white shadow-[var(--shadow-card)] ${
        publicado ? 'border-line-panel' : 'border-dashed border-line-panel-strong'
      }`}
    >
      <a
        aria-label={`Abrir el modelo ${label} en una pestaña nueva`}
        className="group relative block aspect-[4/3] overflow-hidden bg-bg-sunken"
        href={`/modelos/es/${themeKey}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Image
          alt=""
          className={`object-cover object-top transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
            publicado ? '' : 'opacity-50 grayscale'
          }`}
          fill
          sizes="(max-width: 560px) 90vw, 300px"
          src={coverSrc}
        />
        <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Pill tone={publicado ? 'ok' : 'no'}>{publicado ? 'En la web' : 'Retirado'}</Pill>
          <Pill tone={tieneMusica ? 'ok' : 'pending'}>{tieneMusica ? 'Con música' : 'Sin música'}</Pill>
        </span>
      </a>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[20px] leading-tight text-ink">{label}</span>
          <span className="font-mono text-[9px] tracking-[0.2em] text-ink-mute uppercase">{themeKey}</span>
        </div>

        {tieneMusica ? (
          // La sirve la misma ruta pública que el escaparate, así que si aquí suena, ahí
          // también; y si aquí no, ahí tampoco. Sin subtítulos a propósito: es música
          // instrumental de fondo, no habla.
          <>
            <audio className="h-9 w-full" controls preload="none" src={`/modelos/musica/${themeKey}`} />
            {cancion === null ? (
              <p className="text-[12px] text-danger">
                Subida antes de guardar su nombre: el reproductor sale sin título. Vuelve a subirla.
              </p>
            ) : (
              <p className="text-[12px] text-ink-soft">
                El reproductor dice: <strong className="font-medium text-ink">{cancion.track}</strong>
                {cancion.artist === '' ? '' : ` · ${cancion.artist}`}
              </p>
            )}
          </>
        ) : (
          <p className="text-[12px] text-ink-mute">El reproductor se ve pero no suena.</p>
        )}

        <form action={subir} className="mt-auto flex flex-col gap-2.5">
          <input name="themeKey" type="hidden" value={themeKey} />
          <FilePicker
            accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
            hint="MP3, M4A o WAV · la ajustamos sola"
            label={tieneMusica ? 'Elegir otra canción' : 'Elegir canción'}
            name="musica"
          />
          <div className="flex flex-wrap gap-2">
            <PanelButton disabled={subiendo} type="submit" variant={tieneMusica ? 'default' : 'primary'}>
              {subiendo ? 'Subiendo y ajustando…' : tieneMusica ? 'Reemplazar' : 'Subir'}
            </PanelButton>
            {tieneMusica ? (
              // Va a su propio formulario por `form`: con `formAction` se reenviaría el MP3
              // elegido solo para borrar la canción.
              <PanelButton disabled={quitando} form={`${id}-quitar`} type="submit" variant="danger">
                {quitando ? 'Quitando…' : 'Quitar'}
              </PanelButton>
            ) : null}
          </div>
        </form>
        <form action={quitar} hidden id={`${id}-quitar`}>
          <input name="themeKey" type="hidden" value={themeKey} />
        </form>

        <form action={cambiarPublicacion} className="border-t border-line-panel pt-3">
          <input name="themeKey" type="hidden" value={themeKey} />
          <input name="publicar" type="hidden" value={publicado ? 'no' : 'si'} />
          <PanelButton className="w-full" disabled={cambiando} type="submit" variant={publicado ? 'default' : 'primary'}>
            {cambiando ? 'Cambiando…' : publicado ? 'Retirar de la web' : 'Publicar en la web'}
          </PanelButton>
        </form>

        {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
        {estado.status === 'success' && estado.message !== undefined ? (
          <PanelAlert tone="ok">{estado.message}</PanelAlert>
        ) : null}
      </div>
    </li>
  )
}
