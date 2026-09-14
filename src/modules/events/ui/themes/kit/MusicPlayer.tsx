'use client'

import { useRef, useState } from 'react'
import { prefiereMenosMovimiento } from './motion'

type Props = {
  readonly accent: string
  readonly track: string
  readonly artist: string
  /** El rótulo sobre el título. Del diccionario: la invitación va en el idioma del evento. */
  readonly eyebrow: string
  /**
   * El MP3 que el atelier subió a este evento — `music.audioMediaId` del contenido.
   *
   * Llega el identificador y no la dirección para que **dónde vive el audio se escriba una
   * sola vez**: son siete vistas las que colocan este reproductor, y componer ahí la ruta
   * sería repetir siete veces la misma condición.
   *
   * **Opcional, y sin él el reproductor es el de siempre**: enseña la canción y mueve las
   * barras sin sonar. Así están los dieciséis modelos del escaparate, que llevan su
   * canción escrita desde el primer día y ningún archivo detrás.
   */
  // `| undefined` explícito: con `exactOptionalPropertyTypes`, pasar `undefined` a una
  // opcional no vale si el tipo no lo admite, y eso es justo lo que hacen las siete vistas
  // —`music.audioMediaId` es opcional en el contenido, así que llega `undefined` cuando el
  // atelier no subió nada—.
  readonly audioMediaId?: string | undefined
  readonly textColor?: string
  readonly playBg?: string
  readonly playIconColor: string
  readonly trackColor?: string
  readonly artistColor?: string
}

/**
 * La canción del evento, con su ecualizador.
 *
 * **Suena solo si hay `src`**, y nunca sola: hace falta que alguien pulse. Los navegadores
 * bloquean la reproducción automática con sonido, y con razón — una invitación que arranca
 * a sonar al abrirse en una oficina o en un velatorio es exactamente lo que esa política
 * evita. Si `play()` se rechaza igualmente, el botón vuelve a su sitio en vez de quedarse
 * diciendo que suena.
 *
 * **Es `<audio>` y no la Web Audio API, y esa es la decisión que hace que se oiga.** En
 * iOS el interruptor físico de silencio calla a Web Audio —va por el canal ambiental— y
 * **no** calla a un elemento `<audio>`, que va por el canal de medios. Con media boda
 * mirando la invitación desde un teléfono en silencio, cualquier otra opción no suena.
 *
 * El estado del dibujo lo marcan los eventos del propio elemento, no el clic: si la
 * canción termina, el navegador la pausa o falla la red, las barras tienen que pararse.
 */
export function MusicPlayer({
  accent,
  track,
  artist,
  eyebrow,
  audioMediaId,
  textColor = 'currentColor',
  playBg,
  playIconColor,
  trackColor,
  artistColor,
}: Props) {
  const [sonando, setSonando] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)
  const audio = useRef<HTMLAudioElement | null>(null)

  const alternar = () => {
    const elemento = audio.current
    // Sin archivo, el botón hace lo que hacía en la maqueta: mover las barras.
    if (elemento === null) {
      setSonando((anterior) => !anterior)
      return
    }

    if (elemento.paused) {
      // `play()` devuelve una promesa que se rechaza si la política del navegador lo
      // impide. Sin este `catch` quedaría una promesa sin atender en consola y, peor, el
      // dibujo diría que suena algo que nadie está oyendo.
      void elemento.play().catch(() => setSonando(false))
      return
    }
    elemento.pause()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        border: `1px solid ${accent}40`,
        borderRadius: 999,
        background: `${accent}08`,
        color: textColor,
      }}
    >
      {audioMediaId === undefined || audioMediaId === '' ? null : (
        <audio
          loop
          onEnded={() => setSonando(false)}
          onPause={() => setSonando(false)}
          onPlay={() => setSonando(true)}
          playsInline
          // `none`: una invitación se abre en el teléfono del invitado, muchas veces con
          // datos. La canción se baja cuando la pide, no por si acaso.
          preload="none"
          ref={audio}
          // La misma ruta que las fotografías: lleva la puerta de contraseña del evento y
          // responde a peticiones por rango, que es lo que Safari exige para reproducir.
          src={`/media/${audioMediaId}`}
        />
      )}

      <button
        aria-label={sonando ? `Pausar ${track}` : `Reproducir ${track}`}
        aria-pressed={sonando}
        onClick={alternar}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: playBg ?? accent,
          color: playIconColor,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
        }}
        type="button"
      >
        <span aria-hidden>{sonando ? '❚❚' : '▶'}</span>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 9, letterSpacing: '0.3em', color: accent, opacity: 0.95 }}>
          {eyebrow}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: trackColor ?? 'inherit',
          }}
        >
          {track}
        </div>
        <div style={{ fontSize: 10, opacity: artistColor === undefined ? 0.85 : 1, color: artistColor ?? 'inherit' }}>
          {artist}
        </div>
      </div>

      <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
        {[0, 1, 2, 3].map((barra) => (
          <div
            key={barra}
            style={{
              width: 2,
              background: accent,
              borderRadius: 1,
              height: sonando && !reducido ? '100%' : `${30 - barra * 6}%`,
              animation: sonando && !reducido ? `theme-eq 0.8s ease-in-out ${barra * 0.15}s infinite` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}
