'use client'

import { useRouter } from 'next/navigation'
import { ScanIcon } from '@/shared/design/ui/icons'
import { useState } from 'react'

/**
 * La tarjeta oscura de recepción de `Dashboard.html`: es la puerta al modo puerta y el
 * único acceso al escáner desde el panel.
 *
 * Antes de llevar a nadie a una pantalla negra, pregunta si esta máquina tiene cámara.
 * El modo puerta se usa en el celular o la tablet de la recepción; en una computadora de
 * escritorio sin cámara lo honesto es decirlo aquí, no abrir el escáner para que falle
 * allí dentro.
 */
export function DoorModeCard({ href }: { href: string }) {
  const router = useRouter()
  const [aviso, setAviso] = useState<string | null>(null)

  return (
    <section className="mb-5.5 overflow-hidden rounded-[18px] bg-linear-to-r from-shell to-shell-deep p-5.5 text-shell-ink shadow-card">
      <div className="flex flex-wrap items-center gap-4.5">
        {/* La mira de escaneo, no un icono de puerta: lo que se hace aquí es leer
            pases con la cámara. */}
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white/8"
        >
          <ScanIcon className="size-6" />
        </span>

        <div className="min-w-[240px] flex-1">
          <p className="font-mono text-[9px] tracking-[0.35em] uppercase opacity-60">Recepción</p>
          <h2 className="mt-1 font-display text-[24px] italic">Modo puerta</h2>
          <p className="mt-1.5 max-w-[62ch] text-[12px] leading-[1.7] opacity-75">
            Pantalla completa, cámara siempre encendida. Cada pase se registra solo al escanearlo — sin confirmar nada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <details className="group">
            <summary className="cursor-pointer list-none rounded-[var(--radius-pill)] border border-white/25 px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] uppercase transition-colors hover:border-white/60">
              Cómo funciona
            </summary>
            <ul className="mt-3 flex max-w-[52ch] list-disc flex-col gap-1.5 pl-4 text-[12px] leading-[1.7] opacity-80">
              <li>Abre esta pantalla en el celular o la tablet de la puerta y déjala encendida.</li>
              <li>Apunta al QR del pase: se registra al leerlo, sin pulsar nada.</li>
              <li>Sin red sigue funcionando: los escaneos se guardan y suben solos al volver la señal.</li>
              <li>La tarjeta verde canta el número de mesa del grupo.</li>
            </ul>
          </details>

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
                setAviso(
                  'Este equipo no tiene cámara. Usa el buscador para registrar a mano, o abre esta página en el celular de la puerta.',
                )
              })()
            }}
            className="cursor-pointer rounded-[var(--radius-pill)] bg-linear-to-b from-[var(--color-gold-light)] to-gold px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-shell-deep uppercase transition-colors hover:to-gold-deep"
          >
            Abrir modo puerta
          </button>
        </div>
      </div>

      {aviso === null ? null : (
        <p className="mt-4 max-w-[62ch] text-[12px] leading-[1.6] text-[var(--color-gold-light)]" role="alert">
          {aviso}
        </p>
      )}
    </section>
  )
}
