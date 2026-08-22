'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * El único acceso al escáner desde el panel: un botón con la cámara.
 *
 * Antes de llevar a nadie a una pantalla negra, pregunta si esta máquina tiene cámara.
 * El modo puerta se usa en el celular o la tablet de la recepción; en una computadora de
 * escritorio sin cámara lo honesto es decirlo aquí, no abrir el escáner para que falle
 * allí dentro.
 */
export function ScanButton({ href }: { href: string }) {
  const router = useRouter()
  const [aviso, setAviso] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => {
          setAviso(null)
          void (async () => {
            try {
              const dispositivos = (await navigator.mediaDevices?.enumerateDevices()) ?? []
              if (dispositivos.some((d) => d.kind === 'videoinput')) {
                router.push(href)
                return
              }
            } catch {
              // Un navegador que no deja ni enumerar cae aquí y se trata igual: sin
              // cámara comprobable, no se abre el escáner.
            }
            setAviso('Este equipo no tiene cámara. Usa el buscador para registrar a mano, o abre esta página en el celular de la puerta.')
          })()
        }}
        className="flex items-center gap-2.5 rounded-full bg-gold px-5 py-2.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-white uppercase transition-colors hover:bg-gold-deep"
      >
        <span aria-hidden className="text-[15px]">
          📷
        </span>
        Escanear
      </button>

      {aviso === null ? null : (
        <p className="max-w-[42ch] text-right text-[12px] leading-[1.6] text-gold-deep" role="alert">
          {aviso}
        </p>
      )}
    </div>
  )
}
