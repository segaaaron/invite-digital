'use client'

import { useEffect, useRef, useState } from 'react'
import { prefiereMenosMovimiento } from './motion'

type Props = {
  readonly accent: string
  readonly track: string
  readonly artist: string
  /** El rótulo sobre el título. Del diccionario: la invitación va en el idioma del evento. */
  readonly eyebrow: string
  /**
   * La dirección del MP3 que suena, o nada.
   *
   * **Llega la dirección hecha y no un identificador, y eso cambió por una razón.** Al
   * principio había un solo origen —el archivo que el atelier sube a su boda, servido en
   * `/media/<id>`— y este componente componía la ruta. Ahora hay dos: esa, y la del
   * escaparate (`/modelos/musica/<modelo>`), que es de la web pública y no pertenece a
   * ningún evento. Con dos formas distintas, componerla aquí dentro obligaría a pasar
   * además de cuál se trata, que es un dato que este reproductor no tiene por qué conocer.
   *
   * **Opcional, y sin ella el reproductor es el de siempre**: enseña la canción y mueve las
   * barras sin sonar, que es como nacieron los dieciséis diseños.
   *
   * `| undefined` explícito: con `exactOptionalPropertyTypes`, pasar `undefined` a una
   * opcional no vale si el tipo no lo admite, y es justo lo que hacen las siete vistas
   * cuando esa boda no tiene música.
   */
  readonly audioSrc?: string | undefined
  /**
   * No intentar sonar al montar: esperar al primer toque.
   *
   * Lo pide el cumpleaños, cuya portada tapa la invitación entera hasta que el invitado la
   * abre. Sin esto, en un escritorio donde el navegador permite el audio —Chrome se lo
   * concede a los sitios con historial de reproducción— la canción empezaba **con la
   * portada todavía puesta**, y se oía antes de que nadie entrara. Con esto no suena hasta
   * que hay un gesto, y el gesto es abrirla.
   */
  readonly soloAlAbrir?: boolean
  readonly textColor?: string
  readonly playBg?: string
  readonly playIconColor: string
  readonly trackColor?: string
  readonly artistColor?: string
}

/**
 * La canción del evento, con su ecualizador.
 *
 * **Suena sola al abrir la invitación y solo la para quien la escucha** (pedido por el
 * usuario el 14 de septiembre). Pero ningún navegador deja sonar audio sin un gesto: Safari
 * en iOS lo exige siempre y Chrome solo lo concede en escritorio a sitios con historial de
 * reproducción (Media Engagement Index). Así que se hace en dos tiempos:
 *
 * 1. Al montar se intenta `play()`. Donde el navegador lo permite, suena ya.
 * 2. Si lo rechaza (`NotAllowedError`), arranca con **el primer toque, clic o tecla en
 *    cualquier parte de la página** —abrir el sobre de la portada ya lo es—. `play()` se
 *    llama dentro del propio manejador: tras un `await` el navegador deja de contarlo
 *    como gesto.
 *
 * Ese primer gesto **no** cuenta si cae sobre el propio botón: el botón ya lo arranca con su
 * clic, y dejar pasar los dos lo encendería y lo apagaría en el mismo toque.
 *
 * **Pausar es definitivo**: tras una pausa del usuario no hay nada que vuelva a arrancarla.
 * Si la pausa la hace el navegador —una llamada, otra pestaña con audio— tampoco se reanuda
 * sola: no se distingue de fuera y sonar por sorpresa es peor que quedarse callada.
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
  audioSrc,
  soloAlAbrir = false,
  textColor = 'currentColor',
  playBg,
  playIconColor,
  trackColor,
  artistColor,
}: Props) {
  const [sonando, setSonando] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)
  const audio = useRef<HTMLAudioElement | null>(null)
  const boton = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const elemento = audio.current
    if (elemento === null) return

    // Los eventos que el navegador cuenta como gesto para reproducir con sonido.
    // Son los de la especificación HTML: en táctil el gesto cuenta al levantar el dedo
    // (`pointerup`, `touchend`), no al apoyarlo.
    const GESTOS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
    const quitar = () => GESTOS.forEach((tipo) => document.removeEventListener(tipo, alGesto, true))
    function alGesto(evento: Event) {
      if (boton.current?.contains(evento.target as Node)) return quitar()
      quitar()
      if (elemento!.paused) void elemento!.play().catch(() => setSonando(false))
    }

    const alPrimerGesto = () => GESTOS.forEach((tipo) => document.addEventListener(tipo, alGesto, { capture: true }))

    let vigente = true
    // Con `soloAlAbrir` ni se intenta: la invitación está tapada por su portada y sonar
    // ahora sería sonar antes de que nadie la abra.
    if (soloAlAbrir) alPrimerGesto()
    else
      elemento.play().catch(() => {
        if (vigente) alPrimerGesto()
      })
    return () => {
      vigente = false
      quitar()
    }
  }, [audioSrc, soloAlAbrir])

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
      {audioSrc === undefined || audioSrc === '' ? null : (
        <audio
          loop
          onEnded={() => setSonando(false)}
          onPause={() => setSonando(false)}
          onPlay={() => setSonando(true)}
          playsInline
          // `auto`: va a sonar en cuanto se abra o se toque la invitación, así que se baja
          // ya y arranca sin esperar a la red en ese primer toque.
          preload="auto"
          ref={audio}
          // Quien la compone sabe de dónde sale: `/media/<id>` en una boda —con la puerta
          // de contraseña del evento— y `/modelos/musica/<modelo>` en el escaparate. Las
          // dos responden a peticiones por rango, que es lo que Safari exige para
          // reproducir.
          src={audioSrc}
        />
      )}

      <button
        aria-label={sonando ? `Pausar ${track}` : `Reproducir ${track}`}
        aria-pressed={sonando}
        onClick={alternar}
        ref={boton}
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
          padding: 0,
          lineHeight: 0,
          flexShrink: 0,
        }}
        type="button"
      >
        {/* SVG y no los caracteres `▶` y `❚❚`: cada diseño hereda su tipografía y cada una
            dibuja esos glifos con otra caja y otra línea base, así que el icono salía
            centrado en unos y descolgado en otros. El triángulo va con su centro óptico —su
            masa—, no el de la caja, en el centro del círculo. */}
        <svg aria-hidden fill="currentColor" height="14" style={{ display: 'block' }} viewBox="0 0 14 14" width="14">
          {sonando ? (
            <>
              <rect height="10" rx="0.8" width="3.2" x="2.6" y="2" />
              <rect height="10" rx="0.8" width="3.2" x="8.2" y="2" />
            </>
          ) : (
            <path d="M4.2 1.9v10.2a.6.6 0 0 0 .9.5l8-5.1a.6.6 0 0 0 0-1l-8-5.1a.6.6 0 0 0-.9.5z" />
          )}
        </svg>
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
