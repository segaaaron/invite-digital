'use client'

import Image from 'next/image'
import { useActionState, useId, useState } from 'react'
import { nombreDeCancion } from '@/shared/audio/audio'
import { leerEtiquetasId3 } from '@/shared/audio/id3'
import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, Pill } from '@/shared/design/ui/panel/PanelKit'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { removeShowcaseMusicAction, renameShowcaseSongAction, setTemplatePublishedAction, uploadShowcaseMusicAction } from '@/app/_acciones/admin/modelos-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

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
  const [renombre, renombrar, renombrando] = useActionState<AdminActionState, FormData>(renameShowcaseSongAction, INICIAL)
  const [publicacion, cambiarPublicacion, cambiando] = useActionState<AdminActionState, FormData>(
    setTemplatePublishedAction,
    INICIAL,
  )
  const id = useId()
  // El nombre de la canción elegida, leído del propio archivo al elegirlo: sus etiquetas
  // ID3 o, si no trae, su nombre de fichero. Queda editable antes de subir.
  const [nombreNuevo, setNombreNuevo] = useState<{ track: string; artist: string } | null>(null)
  // Subida correcta: los campos del nombre se van con el archivo que ya se subió.
  const [altaVista, setAltaVista] = useState(alta)
  if (altaVista !== alta) {
    setAltaVista(alta)
    if (alta.status === 'success') setNombreNuevo(null)
  }
  const alElegir = async (archivo: File | null) => {
    if (archivo === null) return setNombreNuevo(null)
    // Con los primeros 512 KB basta: la etiqueta va al principio del MP3.
    const cabeza = new Uint8Array(await archivo.slice(0, 512 * 1024).arrayBuffer())
    setNombreNuevo(nombreDeCancion(leerEtiquetasId3(cabeza), archivo.name))
  }

  const estado = alta.status !== 'idle' ? alta : baja.status !== 'idle' ? baja : renombre.status !== 'idle' ? renombre : publicacion

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
          // también; y si aquí no, ahí tampoco.
          <>
            <audio className="h-9 w-full" controls preload="none" src={`/modelos/musica/${themeKey}`} />
            {/* El nombre que dice el reproductor del modelo, editable sin volver a subir la
                canción. La clave lo remonta cuando cambia en el servidor: React no refresca
                un `defaultValue` ya pintado. */}
            <form action={renombrar} className="flex flex-col gap-2" key={JSON.stringify(cancion)}>
              <input name="themeKey" type="hidden" value={themeKey} />
              {cancion === null ? (
                <p className="text-[12px] text-danger">Sin nombre: el reproductor sale sin título. Escríbelo aquí.</p>
              ) : null}
              <NombreDeCancion cancion={cancion} id={`${id}-nombre`} />
              <SubmitButton variant="default" pending={renombrando} pendingLabel={'Guardando…'}>{'Guardar nombre'}</SubmitButton>
            </form>
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
            onElegir={(archivo) => void alElegir(archivo)}
          />
          {nombreNuevo === null ? null : (
            <div className="grid gap-2 min-[420px]:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-alta-track`}>
                <span className={LABEL_CLASS}>Canción</span>
                <input
                  className={FIELD_CLASS}
                  id={`${id}-alta-track`}
                  maxLength={120}
                  name="track"
                  onChange={(e) => setNombreNuevo({ ...nombreNuevo, track: e.target.value })}
                  value={nombreNuevo.track}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-alta-artist`}>
                <span className={LABEL_CLASS}>Artista (opcional)</span>
                <input
                  className={FIELD_CLASS}
                  id={`${id}-alta-artist`}
                  maxLength={120}
                  name="artist"
                  onChange={(e) => setNombreNuevo({ ...nombreNuevo, artist: e.target.value })}
                  value={nombreNuevo.artist}
                />
              </label>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant={tieneMusica ? 'default' : 'primary'} pending={subiendo} pendingLabel={'Subiendo y ajustando…'}>{tieneMusica ? 'Reemplazar' : 'Subir'}</SubmitButton>
            {tieneMusica ? (
              // Va a su propio formulario por `form`: con `formAction` se reenviaría el MP3
              // elegido solo para borrar la canción.
              <SubmitButton form={`${id}-quitar`} variant="danger" pending={quitando} pendingLabel={'Quitando…'}>{'Quitar'}</SubmitButton>
            ) : null}
          </div>
        </form>
        <form action={quitar} hidden id={`${id}-quitar`}>
          <input name="themeKey" type="hidden" value={themeKey} />
        </form>

        <form action={cambiarPublicacion} className="border-t border-line-panel pt-3">
          <input name="themeKey" type="hidden" value={themeKey} />
          <input name="publicar" type="hidden" value={publicado ? 'no' : 'si'} />
          <SubmitButton className="w-full" variant={publicado ? 'default' : 'primary'} aria-busy={(cambiando) || undefined} pending={cambiando} pendingLabel={'Cambiando…'}>{publicado ? 'Retirar de la web' : 'Publicar en la web'}</SubmitButton>
        </form>

        <ActionFeedback errorsOnly state={estado} />
        {estado.status === 'success' && estado.message !== undefined ? (
          <PanelAlert tone="ok">{estado.message}</PanelAlert>
        ) : null}
      </div>
    </li>
  )
}

function NombreDeCancion({ cancion, id }: { cancion: { track: string; artist: string } | null; id: string }) {
  return (
    <div className="grid gap-2 min-[420px]:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-track`}>
        <span className={LABEL_CLASS}>Canción</span>
        <input
          className={FIELD_CLASS}
          defaultValue={cancion?.track ?? ''}
          id={`${id}-track`}
          maxLength={120}
          name="track"
          placeholder="Tiempo de Vals"
          required
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-artist`}>
        <span className={LABEL_CLASS}>Artista (opcional)</span>
        <input className={FIELD_CLASS} defaultValue={cancion?.artist ?? ''} id={`${id}-artist`} maxLength={120} name="artist" placeholder="Chayanne" />
      </label>
    </div>
  )
}
