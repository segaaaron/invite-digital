'use client'

import { createContext, useContext, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { FilePicker } from '@/shared/design/ui/panel/FilePicker'
import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { type ContentActionState, uploadMediaAction } from '@/app/_acciones/events/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { reducirFoto } from '@/shared/design/ui/reducir-foto'

/**
 * Lo pone la tarjeta de cada sección (`BloqueDeContenido`): pide guardarla. Una foto recién subida se guarda
 * sola en su sección, y la invitación la enseña al momento: antes había que pulsar además «Guardar» y quien no
 * lo sabía veía la foto elegida en el campo y la de ejemplo en la invitación.
 */
export const GuardarLaSeccion = createContext<(() => void) | null>(null)

/** Lo más que se sube (el mismo tope que el servidor). Una canción más grande no sale ni del teléfono. */
const MAXIMO_DE_SUBIDA = 30 * 1024 * 1024

const ERRORES: Record<string, string> = {
  no_file: 'Elige un archivo antes de subirlo.',
  too_large: 'Pesa demasiado: fotografías hasta 8 MB, canciones hasta 30 MB.',
  unsupported_type: 'Ese archivo no vale. Fotografías en PNG, JPG, WEBP o AVIF; canciones en MP3, M4A o WAV.',
  storage_failure: 'No se pudo guardar el archivo. Vuelve a intentarlo.',
  network: 'No se pudo subir: se cortó la conexión o el servidor no respondió. Vuelve a intentarlo; si sigue, queda anotado para revisarlo.',
  photo_limit: 'Ya subiste todas las fotos que incluye tu plan. Quita una para subir otra.',
}

/**
 * Subir una fotografía o una canción **desde el campo que la pide**, y quedar elegida.
 *
 * Antes había que subirla en otra tarjeta y volver a buscarla en el desplegable, que hasta
 * entonces decía «Sin fotografía» sin explicar que no había ninguna subida todavía.
 *
 * Va en un `<dialog>` **fuera del formulario del bloque** (por un portal): un formulario
 * dentro de otro no es HTML válido y el navegador lo desmonta, así que el archivo nunca
 * llegaría a enviarse.
 */
export function SubidaEnElCampo({
  eventId,
  eventSlug,
  tipo,
  onSubido,
}: {
  eventId: string
  eventSlug: string
  tipo: 'imagen' | 'audio'
  onSubido: (mediaId: string) => void
}) {
  const [estado, setEstado] = useState<ContentActionState>({ status: 'idle' })
  const [subiendo, setSubiendo] = useState(false)
  const dialogo = useRef<HTMLDialogElement>(null)
  const guardarLaSeccion = useContext(GuardarLaSeccion)
  // El portal necesita `document`, que en el servidor no existe. `useSyncExternalStore` da la
  // respuesta distinta en servidor y cliente **sin** un `setState` en un efecto, que es lo que
  // provoca un segundo pintado de todo el árbol.
  const enElNavegador = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  /**
   * Subir **sin que nada pueda tumbar la página**: la acción se llama a mano, dentro de un `try` (con
   * `useActionState`, un 500 del servidor subía como excepción y el panel entero decía «This page couldn't
   * load»). La foto se reduce antes en el navegador; lo que no se pueda subir se dice en el diálogo.
   */
  async function enviar(formulario: HTMLFormElement) {
    const datos = new FormData(formulario)
    const archivo = datos.get('file')
    if (!(archivo instanceof File) || archivo.size === 0) return setEstado({ status: 'error', message: 'no_file' })
    setSubiendo(true)
    setEstado({ status: 'idle' })
    try {
      const final = tipo === 'imagen' ? await reducirFoto(archivo) : archivo
      if (final.size > MAXIMO_DE_SUBIDA) return setEstado({ status: 'error', message: 'too_large' })
      datos.set('file', final)
      const resultado = await uploadMediaAction({ status: 'idle' }, datos)
      setEstado(resultado)
      if (resultado.status === 'success' && resultado.mediaId !== undefined) {
        onSubido(resultado.mediaId)
        dialogo.current?.close()
        // La canción la elige el servidor al subirla; la foto se guarda en su sección ahora mismo.
        if (tipo === 'imagen') guardarLaSeccion?.()
      }
    } catch {
      setEstado({ status: 'error', message: 'network' })
    } finally {
      setSubiendo(false)
    }
  }

  const esImagen = tipo === 'imagen'
  const error = estado.status === 'error' ? (ERRORES[estado.message] ?? ERRORES.storage_failure) : null

  return (
    <>
      <button className={`${botonClases('default')} shrink-0`} onClick={() => dialogo.current?.showModal()} type="button">
        {esImagen ? 'Subir una fotografía' : 'Subir la canción'}
      </button>

      {!enElNavegador
        ? null
        : createPortal(
            <dialog
              className="m-auto w-[min(440px,92vw)] rounded-[18px] border border-line-panel bg-bg-raised p-6 text-left text-ink shadow-float backdrop:bg-ink/45"
              ref={dialogo}
            >
              <h2 className="font-display text-[21px] leading-tight">{esImagen ? 'Subir una fotografía' : 'Subir la canción'}</h2>
              <p className="mt-2 text-[13px] leading-[1.6] text-ink-soft">
                {esImagen
                  ? 'Se reduce y se le quitan los metadatos al subirla, para que la invitación cargue rápido. Queda elegida en este campo.'
                  : 'Sube la canción entera: la convertimos en un MP3 ligero que suena en cualquier teléfono y se repite en bucle. Queda elegida aquí.'}
              </p>

              <form
                className="mt-5 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void enviar(e.currentTarget)
                }}
              >
                <input name="eventId" readOnly type="hidden" value={eventId} />
                <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
                <FilePicker
                  accept={esImagen ? 'image/png,image/jpeg,image/webp,image/avif' : 'audio/*,.mp3,.m4a,.wav,.aac,.ogg'}
                  hint={esImagen ? 'PNG, JPG, WEBP o AVIF · la reducimos sola' : 'MP3, M4A o WAV · hasta 30 MB · la ajustamos sola'}
                  label={esImagen ? 'Elegir fotografía' : 'Elegir canción'}
                  name="file"
                />
                {error === null ? null : (
                  <p className="text-[12.5px] text-danger" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-5 py-2.5 text-[13px] text-ink transition-colors hover:border-ink"
                    onClick={() => dialogo.current?.close()}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <SubmitButton pending={subiendo} pendingLabel="Subiendo…" variant="primary">
                    Subir
                  </SubmitButton>
                </div>
              </form>
            </dialog>,
            document.body,
          )}
    </>
  )
}
