'use client'

import { EnlaceDeVuelta } from '@/shared/design/ui/EnlaceDeVuelta'
import { useRef, useState, type ReactNode } from 'react'
import { ArrowLeftIcon, MusicIcon } from '@/shared/design/ui/icons'
import { CintaDeDemo } from './CintaDeDemo'
import { SelloDeDemo } from './SelloDeDemo'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * «Ver invitación» desde el panel (E56): arriba volver y para quién es; en medio la invitación en su marco, el mismo
 * del escaparate (sin bisel negro ni conmutador de aparato: el 16 oct el usuario lo quiso como antes, uno solo);
 * abajo, escucharla con su canción.
 */
export function VistaPreviaDelPanel({
  children,
  volver,
  fuentes,
  demo = null,
}: {
  children: ReactNode
  volver: string
  fuentes: string
  /** Si es una demo de un día (0099), su cinta: lo mismo que verá el cliente al abrir el enlace. */
  demo?: { textos: { titulo: string; aviso: string; accion: string; sello: string }; href: string } | null
}) {
  const t = useT()
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
        {/* Vuelve de donde se vino (13 oct): se abre desde el ojo de cualquier pantalla, no solo de Mi invitación. */}
        <EnlaceDeVuelta className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-shell-ink/25 px-4 text-[14.5px] font-medium text-shell-ink no-underline hover:border-gold" href={volver}>
          <ArrowLeftIcon className="size-4" /> <span className="max-[559px]:sr-only">{t('Volver al panel', 'Back to the panel')}</span>
        </EnlaceDeVuelta>
        <p className="min-w-0 flex-1 truncate text-center text-[14.5px] text-shell-ink/75">{t('Así la verá tu invitado', 'How your guest will see it')}</p>
        {/* Contrapeso del botón de volver: el texto queda centrado en la pantalla. */}
        <span aria-hidden className="w-[150px] max-[559px]:w-11" />
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-2 max-[559px]:px-2">
        <div className={`con-mono ${fuentes} theme-phone-frame`} ref={marco}>
          {children}
          {demo === null ? null : <SelloDeDemo texto={demo.textos.sello} />}
          {demo === null ? null : <CintaDeDemo href={demo.href} textos={demo.textos} />}
        </div>
      </div>

      <footer className="flex items-center justify-center gap-3 px-4 pt-1 pb-4 text-[14px] text-shell-ink/75">
        {sinCancion ? (
          <span>{t('Esta invitación todavía no tiene canción.', 'This invitation doesn’t have a song yet.')}</span>
        ) : (
          <>
            <span>{t('Con sonido:', 'With sound:')}</span>
            <button
              aria-pressed={sonando}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-shell-ink/25 px-4 font-medium text-shell-ink hover:border-gold"
              onClick={escuchar}
              type="button"
            >
              <MusicIcon className="size-4" /> {sonando ? t('Pausar la canción', 'Pause the song') : t('Escuchar la canción', 'Play the song')}
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
