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
import { CronogramaXv } from './CronogramaXv'
import { PALETA as P } from './xv-deco.palette'

const MONO = 'var(--font-jetbrains-mono)'
const ITALIANA = 'var(--font-italiana)'

/** La línea de la portada del telón: la voz del diseño. */
const TELON = { eyebrow: 'ESTÁS INVITADO', headline: 'Algo\ninolvidable' } as const
const ROTULOS = { xvAnos: 'XV AÑOS', cuenta: 'CUENTA REGRESIVA', cronograma: 'CRONOGRAMA', retrato: 'RETRATO GATSBY' } as const

/**
 * «Art Déco» — Alessandra, de `xv-premium.jsx` (`QuinceDeco`).
 *
 * La gala imperial en negro y oro: el telón de entrada, el abanico dorado que flota, el nombre
 * en Italiana, el retrato en marco doble, la cuenta atrás entre filetes, el cronograma, la
 * tira de fotomatón dorada, el mapa, la canción, la mesa de regalos y la confirmación.
 */
export function XvDecoView({ content, event, themes, slots, audioSrc }: ThemeProps) {
  const { hero, schedule, reception, map, itinerary, gallery, music } = content

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const etiquetaLocal = event.locale === 'en' ? 'en-GB' : 'es-BO'
  // «07 NOV 2026», como la línea de la maqueta.
  const fechaCorta = valida
    ? `${String(cuando.getDate()).padStart(2, '0')} ${cuando.toLocaleDateString(etiquetaLocal, { month: 'short' }).replace('.', '')} ${cuando.getFullYear()}`.toUpperCase()
    : ''
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)
  const retrato = hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.oro, sobreAcento: '#000000', tinta: P.marfil, display: 'var(--font-cormorant)', radio: 4 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.fondo,
        color: P.marfil,
        fontFamily: 'var(--font-cormorant)',
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover
        accent={P.oro}
        bg={P.fondo}
        eyebrow={TELON.eyebrow}
        headline={TELON.headline}
        hint={themes.coverHint}
        label={themes.coverOpen}
        openLabel={themes.coverAria}
        textColor={P.marfil}
        variant="curtain"
      />

      {/* El fondo de mar y las rayas diagonales, a lo alto de toda la invitación, como en la maqueta. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground opacity={0.45} theme="xv" variant="b" />
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(212,175,85,0.05) 0 2px, transparent 2px 40px)' }} />
      </div>

      <div style={{ position: 'relative', padding: '50px 28px 60px' }}>
        <Reveal>
          <div style={{ margin: '0 -10px' }}>
            <Abanico />
          </div>
        </Reveal>
        <Reveal>
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <p style={{ fontFamily: ITALIANA, fontSize: 60, letterSpacing: '0.04em' }}>{hero?.nameA}</p>
            <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.oro, marginTop: 10 }}>
              · {ROTULOS.xvAnos}
              {fechaCorta === '' ? '' : ` · ${fechaCorta}`} ·
            </p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ position: 'relative', margin: '32px auto 0', width: 230, height: 280, border: `2px solid ${P.oro}`, padding: 6 }}>
            <PhotoSlot
              bg="rgba(212,175,85,0.05)"
              border="1px solid rgba(212,175,85,0.4)"
              color="rgba(212,175,85,0.6)"
              height="100%"
              label={ROTULOS.retrato}
              radius={0}
              src={retrato}
              width="100%"
            />
          </div>
        </Reveal>

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32, padding: '18px 0', borderTop: `1px solid ${P.oro}55`, borderBottom: `1px solid ${P.oro}55`, textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.oro, marginBottom: 12 }}>{ROTULOS.cuenta}</p>
              <Countdown
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4, color: P.oro }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: ITALIANA, fontSize: 34 }}
              />
            </div>
          </Reveal>
        )}

        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.oro }}>{ROTULOS.cronograma}</p>
              <div style={{ marginTop: 12 }}>
                <CronogramaXv acento={P.oro} filas={itinerary} filete={`${P.oro}33`} />
              </div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 28 }}>
            <PhotoCollage
              border={`${P.oro}33`}
              photos={(gallery ?? []).map((casilla) => ({
                label: casilla.label,
                src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}`,
              }))}
              polaroidBg="#ffffff"
              polaroidSlotBg="rgba(0,0,0,0.06)"
              polaroidSlotColor="#999999"
              slotBg="rgba(255,255,255,0.05)"
              slotColor="rgba(255,255,255,0.5)"
              stripBg={P.oro}
              variant="strip"
            />
          </div>
        </Reveal>

        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MapPreview
                accent={P.oro}
                border={`${P.oro}44`}
                coords={map?.coords ?? ''}
                directionsLabel={themes.viewLocation}
                href={map?.href}
                label={reception.place.toUpperCase()}
                pinDot="#000000"
                respaldo={[reception.place, reception.address].filter(Boolean).join(', ')}
              />
            </div>
          </Reveal>
        )}

        {cancion === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MusicPlayer
                accent={P.oro}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playIconColor="#3c096c"
                textColor={P.marfil}
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

/** El abanico dorado que flota sobre el nombre (`HeroDecoFan` de la maqueta). */
function Abanico() {
  const rayos = Array.from({ length: 9 }, (_, i) => {
    const angulo = ((-90 + i * 15) * Math.PI) / 180
    return { i, x: 140 + 90 * Math.cos(angulo), y: 140 + 90 * Math.sin(angulo) }
  })
  return (
    <svg aria-hidden viewBox="0 0 280 180" width="100%">
      <g className="theme-quieto-si-reduce" style={{ transformOrigin: '140px 140px', animation: 'theme-crownFloat 5s ease-in-out infinite' }}>
        {rayos.map((rayo) => (
          <line key={rayo.i} stroke={P.oro} strokeWidth="1.4" x1="140" x2={rayo.x} y1="140" y2={rayo.y} />
        ))}
        <path d="M50,140 A90,90 0 0,1 230,140" fill="none" stroke={P.oro} strokeWidth="2" />
      </g>
      <text fill={P.oro} fontFamily="var(--font-italiana)" fontSize="30" textAnchor="middle" x="140" y="80">
        XV
      </text>
    </svg>
  )
}
