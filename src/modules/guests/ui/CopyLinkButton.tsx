'use client'

import { useState } from 'react'

/**
 * Sin `alert`: un diálogo modal bloquearía la página. Si el portapapeles no está
 * disponible —contexto no seguro, permiso denegado— el enlace queda visible y
 * seleccionable, que es el respaldo que siempre funciona.
 */
export function CopyLinkButton({ url, label = 'Enlace de la invitación' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        aria-label={label}
        className="w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[13px] text-ink"
        onFocus={(event) => event.currentTarget.select()}
        readOnly
        value={url}
      />
      <div className="flex items-center gap-4">
        <button
          className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep underline-offset-4 hover:underline"
          onClick={copy}
          type="button"
        >
          Copiar enlace
        </button>
        {copied ? (
          <span aria-live="polite" className="text-[11px] text-ink-mute" role="status">
            Copiado
          </span>
        ) : null}
        {failed ? (
          <span className="text-[11px] text-ink-mute">Cópialo a mano desde el campo de arriba</span>
        ) : null}
      </div>
    </div>
  )
}
