'use client'

import Link from 'next/link'
import { useRef, useState, type ReactNode } from 'react'
import { ArrowLeftIcon, MusicIcon } from '@/shared/design/ui/icons'

/**
 * «Ver invitación» desde el panel (E56): arriba volver, a quién se la estamos enseñando y si en el celular o en la
 * computadora; abajo, escucharla con su canción. En la computadora el invitado la ve igual que en el celular, dentro
 * de un teléfono, con la pantalla alrededor: eso es lo que se enseña.
 */
export function VistaPreviaDelPanel({ children, volver, invitado, fuentes }: { children: ReactNode; volver: string; invitado: string; fuentes: string }) {
  const [aparato, setAparato] = useState<'celular' | 'computadora'>('celular')
  const [sonando, setSonando] = useState(false)
  const [sinCancion, setSinCancion] = useState(false)
  const marco = useRef<HTMLDivElement>(null)

  const escuchar = () => {
    const audio = marco.current?.querySelector('audio')
    if (audio === null || audio === undefined) {
      setSinCancion(true)
      return
    }
    if (audio.paused) void audio.play().then(() => setSonando(true), () => setSonando(false))
    else {
      audio.pause()
      setSonando(false)
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink text-shell-ink">
      <header className="flex items-center gap-3 px-5 py-3.5 max-[767px]:px-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-shell-ink/25 px-4 text-[14.5px] font-medium text-shell-ink no-underline hover:border-gold" href={volver}>
          <ArrowLeftIcon className="size-4" /> <span className="max-[559px]:sr-only">Volver al panel</span>
        </Link>
        <p className="min-w-0 flex-1 truncate text-center text-[14.5px] text-shell-ink/75">
          Así la ve {invitado} en su {aparato}
        </p>
        <div aria-label="Ver en" className="flex rounded-[12px] bg-shell-ink/10 p-1" role="group">
          {(['celular', 'computadora'] as const).map((a) => (
            <button
              aria-pressed={aparato === a}
              className={`min-h-9 cursor-pointer rounded-[9px] px-3.5 text-[14px] font-medium capitalize transition-colors ${aparato === a ? 'bg-bg text-ink' : 'text-shell-ink/80 hover:text-shell-ink'}`}
              key={a}
              onClick={() => setAparato(a)}
              type="button"
            >
              {a}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-2">
        <div
          className={
            aparato === 'computadora'
              ? 'flex h-full max-h-[640px] w-[min(1040px,100%)] flex-col overflow-hidden rounded-[14px] border border-shell-ink/15 bg-shell-deep shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)]'
              : 'contents'
          }
        >
          {aparato === 'computadora' ? (
            <span aria-hidden className="flex gap-1.5 border-b border-shell-ink/10 px-3.5 py-2.5">
              <span className="size-2.5 rounded-full bg-shell-ink/25" />
              <span className="size-2.5 rounded-full bg-shell-ink/25" />
              <span className="size-2.5 rounded-full bg-shell-ink/25" />
            </span>
          ) : null}
          <div className={aparato === 'computadora' ? 'flex min-h-0 flex-1 items-center justify-center py-5' : 'contents'}>
            <div
              className={`con-mono ${fuentes} relative overflow-hidden rounded-[34px] border-[9px] border-black bg-black shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] ${
                aparato === 'computadora' ? 'h-full w-auto aspect-[9/19]' : 'h-[min(860px,calc(100dvh-150px))] aspect-[9/19.5] max-[559px]:w-full max-[559px]:h-full max-[559px]:aspect-auto max-[559px]:rounded-[18px] max-[559px]:border-0'
              }`}
              ref={marco}
            >
              <div className="theme-phone-frame !h-full !w-full !max-w-none !rounded-[24px]">{children}</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-center gap-3 px-4 pt-1 pb-4 text-[14px] text-shell-ink/75">
        {sinCancion ? (
          <span>Esta invitación todavía no tiene canción.</span>
        ) : (
          <>
            <span>Con sonido:</span>
            <button
              aria-pressed={sonando}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-shell-ink/25 px-4 font-medium text-shell-ink hover:border-gold"
              onClick={escuchar}
              type="button"
            >
              <MusicIcon className="size-4" /> {sonando ? 'Pausar la canción' : 'Escuchar la canción'}
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
