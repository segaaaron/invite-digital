'use client'

import { useId, useRef, useState } from 'react'
import { CheckIcon, CloseIcon, UploadIcon } from '../icons'
import { reducirEnElCampo } from '../reducir-foto'

/** Lo más que admite cualquier subida del sitio (el tope del servidor es 32 MB con el sobre del envío). */
const MAXIMO_POR_ARCHIVO = 30 * 1024 * 1024

const tamano = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/**
 * El selector de archivo del panel.
 *
 * El `<input type="file">` nativo pinta «Choose file · No file chosen» en el idioma del
 * navegador, no en el del panel, y no dice qué se eligió de forma legible. Este lo esconde
 * —sigue siendo el que se envía con el formulario— y enseña una zona para pulsar con el
 * nombre y el peso de lo elegido.
 *
 * El nombre se guarda en estado local y **se pierde al remontar** tras la acción, que es lo
 * que se quiere: después de subir, el selector vuelve a estar vacío.
 */
export function FilePicker({
  name,
  accept,
  label,
  hint,
  onElegir,
}: {
  name: string
  accept: string
  /** Lo que se elige: «Elegir canción», «Elegir fotografía o canción». */
  label: string
  hint?: string
  /** Para quien quiera leer el archivo al elegirlo —el nombre de una canción, por ejemplo—. */
  onElegir?: (archivo: File | null) => void
}) {
  const [demasiado, setDemasiado] = useState(false)
  const id = useId()
  const [elegido, setElegido] = useState<{ nombre: string; bytes: number } | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  return (
    <div className="relative">
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-[14px] border border-dashed px-4 py-3 transition-colors focus-within:border-ink hover:border-ink ${
        elegido ? 'border-sage bg-sage/8' : 'border-line-panel-strong bg-white'
      }`}
      htmlFor={id}
    >
      <span
        aria-hidden
        className={`grid size-9 shrink-0 place-items-center rounded-full ${elegido ? 'bg-sage text-white' : 'bg-bg-sunken text-ink-soft'}`}
      >
        {elegido ? <CheckIcon className="size-4" /> : <UploadIcon className="size-4" />}
      </span>
      <span className="flex min-w-0 flex-col">
        {/* `aria-live`: quien usa lector de pantalla oye qué archivo quedó elegido. */}
        <span aria-live="polite" className="truncate pr-8 text-[13px] text-ink">
          {elegido ? elegido.nombre : label}
        </span>
        <span className="text-[11px] text-ink-mute">{elegido ? `${tamano(elegido.bytes)} · pulsa para cambiarlo` : hint}</span>
      </span>
      <input
        accept={accept}
        className="sr-only"
        id={id}
        ref={campo}
        name={name}
        onChange={(evento) => {
          const input = evento.currentTarget
          const archivo = input.files?.[0]
          // Más de 30 MB no sale del teléfono: el servidor no lo aceptaría y cortaría el envío a medias. Una foto
          // se reduce antes (abajo), así que esto solo detiene lo que de verdad no cabe (un vídeo, un PDF enorme).
          if (archivo !== undefined && archivo.size > MAXIMO_POR_ARCHIVO && !archivo.type.startsWith('image/')) {
            input.value = ''
            setElegido(null)
            setDemasiado(true)
            onElegir?.(null)
            return
          }
          setDemasiado(false)
          setElegido(archivo ? { nombre: archivo.name, bytes: archivo.size } : null)
          onElegir?.(archivo ?? null)
          // Una foto se cambia por su versión reducida en el propio campo: la de un celular (5–25 MB) sube en
          // cientos de KB y no choca con ningún tope. Todos los formularios del panel que suben imágenes pasan por aquí.
          if (archivo?.type.startsWith('image/')) {
            void reducirEnElCampo(input).then((final) => {
              if (final !== null && final !== archivo) setElegido({ nombre: final.name, bytes: final.size })
            })
          }
        }}
        type="file"
      />
    </label>
      {/* Quitar lo elegido: sin esto, equivocarse de archivo obligaba a elegir otro encima. */}
      {elegido ? (
        <button
          aria-label={`Quitar ${elegido.nombre}`}
          className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line-panel bg-white text-ink-soft hover:border-ink hover:text-ink"
          onClick={() => {
            if (campo.current) campo.current.value = ''
            setElegido(null)
            onElegir?.(null)
          }}
          type="button"
        >
          <CloseIcon className="size-3" />
        </button>
      ) : null}
      {demasiado ? (
        <p className="mt-2 text-[12px] text-danger" role="alert">
          Ese archivo pesa más de 30 MB. Elige uno más liviano.
        </p>
      ) : null}
    </div>
  )
}
