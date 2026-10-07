'use client'

import { useCancion } from '../kit/MusicPlayer'
import { useCountdown } from '../kit/Countdown'
import { pad } from '../kit/time'
import { PALETA as P } from './cumple-femme.palette'

const SERIF = 'var(--font-cormorant)'
const SANS = 'var(--font-dm-sans)'

const TARJETA = { background: P.vidrio, border: `1px solid ${P.filete}`, borderRadius: 10, backdropFilter: 'blur(6px)' } as const

/** Las cuatro casillas de la cuenta atrás; llegado el día, «¡Es hoy!» en su lugar. */
export function CuentaFemme({
  targetISO,
  esHoy,
  labels,
}: {
  readonly targetISO: string
  readonly esHoy: string
  readonly labels: readonly [string, string, string, string]
}) {
  const partes = useCountdown(targetISO)
  if (partes.over) {
    return (
      <div style={{ ...TARJETA, marginTop: 14, padding: '18px 0', fontFamily: SERIF, fontWeight: 700, fontSize: 36, color: P.crema }}>{esHoy}</div>
    )
  }
  const valores = [partes.days, partes.hours, partes.mins, partes.secs]
  return (
    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
      {labels.map((rotulo, i) => (
        <div key={rotulo} style={{ ...TARJETA, borderRadius: 6, padding: '12px 2px' }}>
          <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: P.crema, lineHeight: 1 }} suppressHydrationWarning>
            {pad(valores[i] ?? 0)}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, marginTop: 6, color: P.oro, letterSpacing: '0.08em' }}>{rotulo}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * El reproductor en píldora de la maqueta: el botón granate con filete de oro, el título en
 * Cormorant y los artistas debajo. Con archivo suena (`useCancion`, desde el primer toque: la
 * portada tapa la invitación); sin él, el botón alterna como en la maqueta.
 */
export function ReproductorFemme({ track, artist, audioSrc }: { readonly track: string; readonly artist: string; readonly audioSrc: string | undefined }) {
  const { sonando, alternar, boton, audioProps } = useCancion(audioSrc, true)
  return (
    <div style={{ ...TARJETA, borderRadius: 999, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
      {audioSrc === undefined ? null : <audio {...audioProps} src={audioSrc} />}
      <button
        aria-label={sonando ? `Pausar ${track}` : `Reproducir ${track}`}
        aria-pressed={sonando}
        onClick={alternar}
        ref={boton}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: P.vino,
          color: P.crema,
          border: `1px solid ${P.oroViejo}`,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        type="button"
      >
        {/* SVG y no `▶`/`❚❚`: cada letra dibuja esos glifos con otra caja y salían descolgados. */}
        <svg aria-hidden fill="currentColor" height="16" style={{ display: 'block' }} viewBox="0 0 14 14" width="16">
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
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 20, color: P.oro, letterSpacing: '0.04em' }}>{track}</div>
        <div style={{ fontSize: 14, lineHeight: 1.35, marginTop: 2 }}>{artist}</div>
      </div>
    </div>
  )
}
