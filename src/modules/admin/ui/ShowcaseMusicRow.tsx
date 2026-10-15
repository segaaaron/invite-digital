'use client'

import Image from '@/shared/design/ui/ImagenConCarga'
import { useActionState, useId, useState } from 'react'
import { nombreDeCancion } from '@/shared/audio/audio'
import { leerEtiquetasId3 } from '@/shared/audio/id3'
import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, Pill } from '@/shared/design/ui/panel/PanelKit'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { removeShowcaseMusicAction, renameShowcaseSongAction, setTemplatePublishedAction, uploadShowcaseMusicAction } from '@/app/_acciones/admin/modelos-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { MenuDeAcciones, opcionDeMenu } from '@/shared/design/ui/panel/lista'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  ventas,
  fiesta,
}: {
  themeKey: string
  label: string
  coverSrc: string
  tieneMusica: boolean
  /** El nombre que dice el reproductor del modelo; `null` en canciones subidas antes de guardarlo. */
  cancion: { track: string; artist: string } | null
  /** Si sale en el catálogo de la web. Retirado no borra: sus enlaces siguen abriendo. */
  publicado: boolean
  /** Cuántas veces se vendió y cuándo la última (ya en palabras): qué destacar y qué retirar. */
  ventas: { readonly veces: number; readonly ultima: string | null }
  /** «Boda», «XV años»: lo que dice bajo el nombre (maqueta E05). */
  fiesta: string
}) {
  const t = useT()
  const [alta, subir, subiendo] = useActionState<AdminActionState, FormData>(sinCaerse(uploadShowcaseMusicAction), INICIAL)
  const [baja, quitar, quitando] = useActionState<AdminActionState, FormData>(sinCaerse(removeShowcaseMusicAction), INICIAL)
  const [renombre, renombrar, renombrando] = useActionState<AdminActionState, FormData>(sinCaerse(renameShowcaseSongAction), INICIAL)
  const [publicacion, cambiarPublicacion, cambiando] = useActionState<AdminActionState, FormData>(
    sinCaerse(setTemplatePublishedAction),
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
    // La tarjeta de la maqueta (E05): la portada a 9:16, el nombre con su fiesta y sus ventas, y si está publicado.
    <li className="@container flex flex-col gap-2.5">
      <a
        aria-label={t(`Abrir el modelo ${label} en una pestaña nueva`, `Open the ${label} design in a new tab`)}
        className="group relative block aspect-[9/16] overflow-hidden rounded-[12px] border border-line-panel bg-bg-sunken"
        href={t(`/es/modelos/${themeKey}`, `/en/designs/${themeKey}`)}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Image
          alt={t(`Portada de ${label}`, `${label} cover`)}
          className={`object-cover object-top transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${publicado ? '' : 'opacity-55 grayscale'}`}
          fill
          sizes="(max-width: 560px) 45vw, 220px"
          src={coverSrc}
        />
      </a>

      <div className="flex flex-1 flex-col gap-2.5">
        {/* Ancha, todo en una línea; estrecha (dos por fila en el celular), la píldora y el «⋯» bajan. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="min-w-0 flex-[1_1_120px]">
            <span className="block truncate font-medium">{label}</span>
            {/* Lo que dice si merece estar en la vitrina: cuánto se vende. */}
            <span className="block truncate text-[13px] text-ink-mute" title={ventas.ultima === null ? undefined : t(`La última, ${ventas.ultima}`, `The last one, ${ventas.ultima}`)}>
              {fiesta}, {ventas.veces === 1 ? t('1 venta', '1 sale') : t(`${ventas.veces} ventas`, `${ventas.veces} sales`)}
            </span>
          </span>
          <Pill tone={publicado ? 'ok' : 'neutro'}>{publicado ? t('Publicado', 'Published') : t('Sin publicar', 'Unpublished')}</Pill>
          <MenuDeAcciones etiqueta={t(`Más acciones de ${label}`, `More actions for ${label}`)}>
            <a className={opcionDeMenu()} href={t(`/es/modelos/${themeKey}`, `/en/designs/${themeKey}`)} rel="noopener noreferrer" target="_blank">
              {t('Ver el modelo', 'See the design')}
            </a>
            {publicado ? (
              <ConfirmAction
                action={cambiarPublicacion}
                confirmLabel={t('Retirar de la web', 'Withdraw from the website')}
                description={t('Deja de salir en el catálogo y en los precios. No se borra: sus enlaces siguen abriendo y los eventos que lo tienen no cambian.', 'It stops appearing in the catalog and pricing. It is not deleted: its links still open and events using it do not change.')}
                title={t(`Retirar ${label}`, `Withdraw ${label}`)}
                trigger={t('Retirar de la web', 'Withdraw from the website')}
                triggerClassName={opcionDeMenu(true)}
              >
                <input name="themeKey" type="hidden" value={themeKey} />
                <input name="publicar" type="hidden" value="no" />
              </ConfirmAction>
            ) : null}
          </MenuDeAcciones>
        </div>

        {/* La canción, plegada: se toca una vez y ocupaba media tarjeta en cada modelo. */}
        <details className="group rounded-[10px] border border-line-panel bg-bg-raised" open={alta.status === 'error' || nombreNuevo !== null}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate text-ink">{tieneMusica ? (cancion === null ? t('Canción sin nombre', 'Untitled song') : [cancion.track, cancion.artist].filter(Boolean).join(' · ')) : t('Sin canción', 'No song')}</span>
            <span className="shrink-0 text-[12px] text-ink-mute group-open:hidden">{tieneMusica ? t('Cambiar', 'Change') : t('Subir', 'Upload')}</span>
          </summary>
          <div className="flex flex-col gap-3 border-t border-line-panel px-3.5 pt-3 pb-3.5">
            {tieneMusica ? (
              <>
                <audio className="h-9 w-full" controls preload="none" src={`/modelos/musica/${themeKey}`} />
                <form action={renombrar} className="flex flex-col gap-2" key={JSON.stringify(cancion)}>
                  <input name="themeKey" type="hidden" value={themeKey} />
                  {cancion === null ? (
                    <p className="text-[12px] leading-[1.5] text-ink-mute">
                      {t('Esta canción se subió antes de que guardáramos su nombre. Escríbelo, o vuelve a subirla y lo tomamos del archivo.', 'This song was uploaded before we saved its name. Type it, or upload it again and we take it from the file.')}
                    </p>
                  ) : null}
                  <NombreDeCancion cancion={cancion} id={`${id}-nombre`} />
                  <SubmitButton variant="default" pending={renombrando} pendingLabel={t('Guardando…', 'Saving…')}>
                    {t('Guardar nombre', 'Save name')}
                  </SubmitButton>
                </form>
              </>
            ) : (
              <p className="text-[12px] text-ink-mute">{t('Sin archivo, el modelo no suena.', 'Without a file, the design plays no music.')}</p>
            )}

            <form action={subir} className="flex flex-col gap-2.5">
              <input name="themeKey" type="hidden" value={themeKey} />
              <FilePicker
                accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                hint={t('MP3, M4A o WAV · la ajustamos sola', 'MP3, M4A or WAV · we adjust it automatically')}
                label={tieneMusica ? t('Elegir otra canción', 'Choose another song') : t('Elegir canción', 'Choose a song')}
                name="musica"
                onElegir={(archivo) => void alElegir(archivo)}
              />
              {nombreNuevo === null ? null : (
                <div className="grid gap-2 @[380px]:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-alta-track`}>
                    <span className={LABEL_CLASS}>{t('Canción', 'Song')}</span>
                    <input className={FIELD_CLASS} id={`${id}-alta-track`} maxLength={120} name="track" onChange={(e) => setNombreNuevo({ ...nombreNuevo, track: e.target.value })} value={nombreNuevo.track} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-alta-artist`}>
                    <span className={LABEL_CLASS}>{t('Artista', 'Artist')}</span>
                    <input className={FIELD_CLASS} id={`${id}-alta-artist`} maxLength={120} name="artist" onChange={(e) => setNombreNuevo({ ...nombreNuevo, artist: e.target.value })} value={nombreNuevo.artist} />
                  </label>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <SubmitButton variant="default" pending={subiendo} pendingLabel={t('Subiendo y ajustando…', 'Uploading and adjusting…')}>
                  {tieneMusica ? t('Reemplazar', 'Replace') : t('Subir', 'Upload')}
                </SubmitButton>
                {tieneMusica ? (
                  // Va a su propio formulario por `form`: con `formAction` se reenviaría el MP3 elegido solo para borrar la canción.
                  <SubmitButton form={`${id}-quitar`} variant="danger" pending={quitando} pendingLabel={t('Quitando…', 'Removing…')}>
                    {t('Quitar', 'Remove')}
                  </SubmitButton>
                ) : null}
              </div>
            </form>
            <form action={quitar} hidden id={`${id}-quitar`}>
              <input name="themeKey" type="hidden" value={themeKey} />
            </form>
          </div>
        </details>

        {publicado ? null : (
          <form action={cambiarPublicacion} className="mt-auto">
            <input name="themeKey" type="hidden" value={themeKey} />
            <input name="publicar" type="hidden" value="si" />
            <SubmitButton className="w-full" pending={cambiando} pendingLabel={t('Publicando…', 'Publishing…')} variant="primary">
              {t('Publicar en la web', 'Publish on the website')}
            </SubmitButton>
          </form>
        )}

        <ActionFeedback errorsOnly state={estado} />
        {estado.status === 'success' && estado.message !== undefined ? (
          <PanelAlert tone="ok">{estado.message}</PanelAlert>
        ) : null}
      </div>
    </li>
  )
}

function NombreDeCancion({ cancion, id }: { cancion: { track: string; artist: string } | null; id: string }) {
  const t = useT()
  return (
    <div className="grid gap-2 @[380px]:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-track`}>
        <span className={LABEL_CLASS}>{t('Canción', 'Song')}</span>
        <input
          className={FIELD_CLASS}
          defaultValue={cancion?.track ?? ''}
          id={`${id}-track`}
          maxLength={120}
          name="track"
          required
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5" htmlFor={`${id}-artist`}>
        <span className={LABEL_CLASS}>{t('Artista', 'Artist')}</span>
        <input className={FIELD_CLASS} defaultValue={cancion?.artist ?? ''} id={`${id}-artist`} maxLength={120} name="artist" />
      </label>
    </div>
  )
}
