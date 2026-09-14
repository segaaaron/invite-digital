'use client'

import { useId, useState } from 'react'
import { CheckIcon, UploadIcon } from '../icons'

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
}: {
  name: string
  accept: string
  /** Lo que se elige: «Elegir canción», «Elegir fotografía o canción». */
  label: string
  hint?: string
}) {
  const id = useId()
  const [elegido, setElegido] = useState<{ nombre: string; bytes: number } | null>(null)

  return (
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
        <span className="truncate text-[13px] text-ink">{elegido ? elegido.nombre : label}</span>
        <span className="text-[11px] text-ink-mute">{elegido ? `${tamano(elegido.bytes)} · pulsa para cambiarlo` : hint}</span>
      </span>
      <input
        accept={accept}
        className="sr-only"
        id={id}
        name={name}
        onChange={(evento) => {
          const archivo = evento.currentTarget.files?.[0]
          setElegido(archivo ? { nombre: archivo.name, bytes: archivo.size } : null)
        }}
        type="file"
      />
    </label>
  )
}
