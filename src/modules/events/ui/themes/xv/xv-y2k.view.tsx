import type { ThemeProps } from '../contract'
import { variablesDeRanuras, pielDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { MapPreview } from '../kit/MapPreview'
import { MarBackground } from '../kit/backgrounds/MarBackground'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoCollage } from '../kit/PhotoCollage'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { Starfield } from '../kit/backgrounds/Starfield'
import { PALETA as P } from './xv-y2k.palette'

const MONO = 'var(--font-jetbrains-mono)'
const ITALIANA = 'var(--font-italiana)'

const BILLETE = { eyebrow: 'YOUR ACCESS', headline: 'VIP', label: 'ENTER THE GALAXY' } as const
const ROTULOS = {
  galaxia: '· Y2K · GALAXY ·',
  sistema: 'SYS · 15.0',
  xv: 'XV',
  misXv: 'MIS XV',
  retrato: 'PRINCESS',
  fecha: 'DATE',
  hora: 'TIME',
  lugar: 'VENUE',
  vestimenta: 'DRESS',
  vibras: 'VIBE_STACK',
} as const

/** Las tres capas del «XV» cromado: rosa desplazada, cian desplazada y el degradado encima. */
const XV_GRANDE: React.CSSProperties = { fontFamily: ITALIANA, fontSize: 180, fontWeight: 400, lineHeight: 0.85, letterSpacing: '-0.05em' }

/**
 * «Y2K Galaxy» — Mariana, de `xv-variants.jsx` (`QuinceY2K`).
 *
 * Los dos mil en galaxia: el billete «Enter the galaxy», la malla holográfica difuminada y
 * las estrellas, tres mariposas que aletean, el XV cromado con su aberración rosa y cian,
 * el retrato con aro holográfico y la estrella que gira, la cuenta atrás en casillas de
 * vidrio, la ficha técnica, la tira de fotos, el mapa, el «vibe stack», la canción, la
 * lista de deseos y la confirmación.
 */
export function XvY2kView({ content, themes, slots, audioSrc }: ThemeProps) {
  const { hero, quote, schedule, reception, map, dressCode, notes, gallery, music } = content
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)
  const nombre = hero?.nameA ?? ''

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const dosCifras = (n: number) => String(n).padStart(2, '0')
  const fechaCorta = valida ? `${dosCifras(cuando.getDate())}.${dosCifras(cuando.getMonth() + 1)}.${String(cuando.getFullYear()).slice(2)}` : ''
  const fechaLarga = valida ? `${dosCifras(cuando.getDate())}.${dosCifras(cuando.getMonth() + 1)}.${cuando.getFullYear()}` : ''
  const etiquetas = (quote?.text ?? '').split('\n').map((linea) => linea.trim()).filter(Boolean)

  const ficha: readonly (readonly [string, string | undefined])[] = [
    [ROTULOS.fecha, fechaLarga || undefined],
    [ROTULOS.hora, reception?.time],
    [ROTULOS.lugar, reception?.place],
    [ROTULOS.vestimenta, dressCode?.title],
    ...(notes ?? []).map((aviso) => [aviso.title ?? '', aviso.text] as const),
  ]

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.rosa, sobreAcento: '#000000', tinta: P.blanco, display: 'var(--font-space-grotesk)', radio: 4 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.fondo,
        color: P.blanco,
        fontFamily: 'var(--font-space-grotesk)',
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover
        accent={P.rosa}
        bg={P.fondo}
        eyebrow={BILLETE.eyebrow}
        headline={BILLETE.headline}
        headlineFont="var(--font-space-grotesk)"
        hint={themes.coverHint}
        label={BILLETE.label}
        openLabel={themes.coverAria}
        textColor={P.blanco}
        variant="ticket"
      />

      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground opacity={0.55} theme="xv" variant="b" />
        {/* La malla holográfica. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `conic-gradient(from 0deg at 50% 30%, ${P.rosa}, ${P.cian}, ${P.lila}, ${P.melocoton}, ${P.rosa})`,
            filter: 'blur(80px)',
            opacity: 0.4,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 50% at 50% 70%, ${P.fondo} 30%, transparent 70%)` }} />
        <Starfield color={P.blanco} count={50} seed={88} />
      </div>

      <div style={{ position: 'relative', padding: '44px 28px 60px' }}>
        <Reveal>
          <p style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em' }}>
            <span style={{ color: P.rosa }}>{ROTULOS.galaxia}</span>
            <span style={{ color: P.cian }}>{ROTULOS.sistema}</span>
          </p>
        </Reveal>

        <Reveal>
          <div style={{ margin: '24px -10px 0' }}>
            <Mariposas />
          </div>
        </Reveal>

        <Reveal>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span aria-hidden style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ ...XV_GRANDE, position: 'absolute', inset: 0, color: P.rosa, transform: 'translate(-3px,0)', opacity: 0.7 }}>{ROTULOS.xv}</span>
              <span style={{ ...XV_GRANDE, position: 'absolute', inset: 0, color: P.cian, transform: 'translate(3px,0)', opacity: 0.7 }}>{ROTULOS.xv}</span>
              <span
                style={{
                  ...XV_GRANDE,
                  position: 'relative',
                  display: 'block',
                  background: `linear-gradient(135deg, ${P.blanco}, ${P.rosa} 35%, ${P.lila} 70%, ${P.cian})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {ROTULOS.xv}
              </span>
            </span>
            <h1 style={{ fontFamily: ITALIANA, fontStyle: 'italic', fontSize: 36, marginTop: 6 }}>{nombre}</h1>
            <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.rosa, marginTop: 8 }}>
              ★ {ROTULOS.misXv}
              {fechaCorta === '' ? '' : ` · ${fechaCorta}`} ★
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div style={{ position: 'relative', margin: '36px auto 0', width: 240, height: 280 }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: -8,
                background: `conic-gradient(from 0deg, ${P.rosa}, ${P.cian}, ${P.lila}, ${P.melocoton}, ${P.rosa})`,
                borderRadius: 24,
                filter: 'blur(4px)',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', background: P.fondo }}>
              <PhotoSlot
                bg="rgba(255,255,255,0.04)"
                border="none"
                color="rgba(255,110,212,0.6)"
                height="100%"
                label={`${ROTULOS.retrato} · ${nombre.toUpperCase()}`}
                radius={0}
                src={hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`}
                width="100%"
              />
            </div>
            <span aria-hidden className="theme-quieto-si-reduce" style={{ position: 'absolute', top: -16, right: -16, fontSize: 32, animation: 'theme-spin 8s linear infinite' }}>
              ✦
            </span>
          </div>
        </Reveal>

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <Countdown
                cellStyle={{
                  textAlign: 'center',
                  padding: '12px 4px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,110,212,0.5)',
                  borderRadius: 8,
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, marginTop: 4, color: P.rosa, letterSpacing: '0.3em' }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: ITALIANA, fontSize: 30, color: P.blanco }}
              />
            </div>
          </Reveal>
        )}

        {/* La ficha técnica. */}
        <Reveal>
          <dl style={{ marginTop: 32, fontFamily: MONO, fontSize: 11 }}>
            {ficha
              .filter((fila): fila is readonly [string, string] => fila[1] !== undefined && fila[1] !== '')
              .map(([clave, valor]) => (
                <div key={`${clave}-${valor}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px dashed rgba(255,110,212,0.3)', padding: '9px 0' }}>
                  <dt style={{ color: P.rosa, textTransform: 'uppercase' }}>{clave}</dt>
                  <dd style={{ margin: 0, textAlign: 'right' }}>{valor}</dd>
                </div>
              ))}
          </dl>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 32 }}>
            <PhotoCollage
              border="rgba(255,255,255,0.15)"
              photos={(gallery ?? []).map((casilla) => ({ label: casilla.label, src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}` }))}
              polaroidBg="#ffffff"
              polaroidSlotBg="rgba(0,0,0,0.06)"
              polaroidSlotColor="#999999"
              slotBg="rgba(255,255,255,0.05)"
              slotColor="rgba(255,255,255,0.5)"
              stripBg={P.rosa}
              variant="strip"
            />
          </div>
        </Reveal>

        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MapPreview
                accent={P.rosa}
                border="rgba(255,110,212,0.4)"
                coords={map?.coords ?? ''}
                directionsLabel={themes.viewLocation}
                href={map?.href}
                label={(map?.label ?? reception.place).toUpperCase()}
                pinDot="#000000"
                respaldo={[reception.place, reception.address].filter(Boolean).join(', ')}
              />
            </div>
          </Reveal>
        )}

        {etiquetas.length === 0 ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 28,
                padding: 18,
                background: 'linear-gradient(135deg, rgba(255,110,212,0.15), rgba(142,224,255,0.10))',
                borderRadius: 14,
                border: '1px solid rgba(255,110,212,0.4)',
              }}
            >
              <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa }}>{ROTULOS.vibras}</p>
              <p style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {etiquetas.map((etiqueta) => (
                  <span key={etiqueta} style={{ fontFamily: MONO, fontSize: 10, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999 }}>
                    {etiqueta}
                  </span>
                ))}
              </p>
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MusicPlayer
                accent={P.rosa}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playIconColor="#3c096c"
                textColor={P.blanco}
                track={music?.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 28 }}>{slots.registry}</div>
        </Reveal>
        <Reveal>
          <div style={{ marginTop: 28 }}>{slots.rsvp}</div>
        </Reveal>
        {slots.photos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, textAlign: 'center' }}>{slots.photos}</div>
          </Reveal>
        )}
        <Reveal>
          <div style={{ marginTop: 28 }}>{slots.guestbook}</div>
        </Reveal>
        <div style={{ marginTop: 28 }}>{slots.pass}</div>
      </div>
    </article>
  )
}

/** Las tres mariposas que aletean, con sus chispas (`Y2KButterflies` de la maqueta). */
function Mariposas() {
  const mariposa = (x: number, y: number, color: string, retraso: number) => (
    <g
      className="theme-quieto-si-reduce"
      key={x}
      style={{ transformOrigin: `${x}px ${y}px`, animation: `theme-bflyFloat 4s ease-in-out ${retraso}s infinite` }}
    >
      <defs>
        <linearGradient id={`xv-y2k-ala-${x}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor="#a020a0" />
        </linearGradient>
      </defs>
      <g className="theme-quieto-si-reduce" style={{ transformOrigin: `${x}px ${y}px`, animation: 'theme-wingFlapY2K 0.4s ease-in-out infinite' }}>
        <ellipse cx={x - 10} cy={y - 4} fill={`url(#xv-y2k-ala-${x})`} rx="14" ry="11" stroke="#ffffff" strokeWidth="0.6" />
        <ellipse cx={x - 8} cy={y + 8} fill={`url(#xv-y2k-ala-${x})`} rx="9" ry="7" stroke="#ffffff" strokeWidth="0.6" />
        <ellipse cx={x + 10} cy={y - 4} fill={`url(#xv-y2k-ala-${x})`} rx="14" ry="11" stroke="#ffffff" strokeWidth="0.6" />
        <ellipse cx={x + 8} cy={y + 8} fill={`url(#xv-y2k-ala-${x})`} rx="9" ry="7" stroke="#ffffff" strokeWidth="0.6" />
        <circle cx={x - 10} cy={y - 4} fill="#ffffff" opacity="0.9" r="3" />
        <circle cx={x + 10} cy={y - 4} fill="#ffffff" opacity="0.9" r="3" />
      </g>
      <line stroke="#a020a0" strokeWidth="1.5" x1={x} x2={x} y1={y - 8} y2={y + 8} />
      <circle cx={x - 1} cy={y - 9} fill="#a020a0" r="1.5" />
      <circle cx={x + 1} cy={y - 9} fill="#a020a0" r="1.5" />
    </g>
  )
  return (
    <svg aria-hidden style={{ overflow: 'visible' }} viewBox="0 0 280 180" width="100%">
      {mariposa(70, 60, P.rosa, 0)}
      {mariposa(210, 80, P.cian, 0.7)}
      {mariposa(140, 130, P.lila, 1.3)}
      {[40, 240, 80, 220, 100].map((x, i) => (
        <text
          className="theme-quieto-si-reduce"
          fill="#ffffff"
          fontSize={10 + (i % 2) * 4}
          key={x}
          style={{ animation: `theme-sparkleFade 1.5s ease-in-out ${i * 0.3}s infinite` }}
          x={x}
          y={30 + i * 20}
        >
          ✦
        </text>
      ))}
    </svg>
  )
}
