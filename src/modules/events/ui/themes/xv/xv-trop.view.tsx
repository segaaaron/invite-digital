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
import { PALETA as P } from './xv-trop.palette'

const MONO = 'var(--font-jetbrains-mono)'
const ITALIANA = 'var(--font-italiana)'

const BILLETE = { eyebrow: 'YOUR ACCESS', headline: 'VIP' } as const
const ROTULOS = { misXv: 'MIS XV', retrato: 'FRENTE AL MAR', faltan: 'FALTAN', cronograma: 'CRONOGRAMA' } as const

/**
 * «Sunset» — Ximena, de `xv-premium.jsx` (`QuinceTropical`).
 *
 * Tropical frente al mar: el billete de entrada en coral, el degradado del atardecer de
 * melocotón a verde mar, el sol que sube y la palmera que se mece, el nombre en Italiana,
 * el retrato, la cuenta atrás, el cronograma, el mosaico, el mapa, la canción y la
 * confirmación.
 */
export function XvTropView({ content, themes, slots, audioSrc }: ThemeProps) {
  const { hero, schedule, reception, map, itinerary, gallery, music } = content
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)
  const nombre = hero?.nameA ?? ''

  const RANURAS = variablesDeRanuras(pielDeRanuras({ acento: P.espuma, sobreAcento: '#000000', tinta: P.blanco, display: 'var(--font-dm-sans)', radio: 4 }))

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: `linear-gradient(180deg,${P.melocoton} 0%,${P.coral} 45%,${P.marNoche} 100%)`,
        color: P.blanco,
        fontFamily: 'var(--font-dm-sans)',
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover
        accent={P.marNoche}
        bg={P.coral}
        eyebrow={BILLETE.eyebrow}
        headline={BILLETE.headline}
        headlineFont="var(--font-space-grotesk)"
        hint={themes.coverHint}
        label={themes.coverOpen}
        openLabel={themes.coverAria}
        textColor={P.blanco}
        variant="ticket"
      />

      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground opacity={0.6} theme="xv" variant="a" />
      </div>

      <div style={{ position: 'relative', padding: '48px 28px 60px' }}>
        <Reveal>
          <div style={{ margin: '0 -10px' }}>
            <Palmera />
          </div>
        </Reveal>
        <Reveal>
          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <h1 style={{ fontFamily: ITALIANA, fontSize: 64 }}>{nombre}</h1>
            <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', marginTop: 8, textTransform: 'uppercase' }}>
              {ROTULOS.misXv}
              {hero?.eyebrow === undefined ? '' : ` · ${hero.eyebrow}`}
            </p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ position: 'relative', margin: '30px auto 0', width: '100%', height: 300 }}>
            <PhotoSlot
              bg="rgba(255,255,255,0.12)"
              border="1px solid rgba(255,255,255,0.35)"
              color="rgba(255,255,255,0.7)"
              height="100%"
              label={`${nombre.toUpperCase()} · ${ROTULOS.retrato}`}
              radius={20}
              src={hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`}
              width="100%"
            />
          </div>
        </Reveal>
        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 30, padding: '18px 0', borderTop: '1px solid rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.35)', textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', marginBottom: 12 }}>{ROTULOS.faltan}</p>
              <Countdown
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4 }}
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
            <div style={{ marginTop: 30 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em' }}>{ROTULOS.cronograma}</p>
              <div style={{ marginTop: 12 }}>
                <CronogramaXv acento={P.espuma} filas={itinerary} filete="rgba(255,255,255,0.3)" />
              </div>
            </div>
          </Reveal>
        )}
        <Reveal>
          <div style={{ marginTop: 26 }}>
            <PhotoCollage
              border="rgba(255,255,255,0.15)"
              photos={(gallery ?? []).map((casilla) => ({ label: casilla.label, src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}` }))}
              polaroidBg="#ffffff"
              polaroidSlotBg="rgba(0,0,0,0.06)"
              polaroidSlotColor="#999999"
              slotBg="rgba(255,255,255,0.04)"
              slotColor="rgba(255,255,255,0.5)"
              stripBg={P.espuma}
              variant="mosaic"
            />
          </div>
        </Reveal>
        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 26 }}>
              <MapPreview
                accent={P.espuma}
                border="rgba(255,255,255,0.35)"
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
        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 26 }}>
              <MusicPlayer
                accent={P.espuma}
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
          <div style={{ marginTop: 26 }}>{slots.registry}</div>
        </Reveal>
        <Reveal>
          <div style={{ marginTop: 26 }}>{slots.rsvp}</div>
        </Reveal>
        {slots.photos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 26, textAlign: 'center' }}>{slots.photos}</div>
          </Reveal>
        )}
        <Reveal>
          <div style={{ marginTop: 26 }}>{slots.guestbook}</div>
        </Reveal>
        <div style={{ marginTop: 26 }}>{slots.pass}</div>
      </div>
    </article>
  )
}

/** El sol que sube y la palmera que se mece (`HeroTropicalPalm` de la maqueta). */
function Palmera() {
  return (
    <svg aria-hidden viewBox="0 0 280 180" width="100%">
      <circle className="theme-quieto-si-reduce" cx="140" cy="90" fill={P.sol} opacity="0.9" r="46" style={{ animation: 'theme-sunRise 4s ease-in-out infinite' }} />
      <g className="theme-quieto-si-reduce" style={{ animation: 'theme-treeSway 4s ease-in-out infinite', transformOrigin: '60px 160px' }}>
        <path d="M60,160 Q55,110 60,70" fill="none" stroke={P.tronco} strokeWidth="4" />
        <path d="M60,70 Q20,55 10,75 Q35,80 60,80" fill={P.palma} />
        <path d="M60,70 Q100,50 112,72 Q82,78 60,80" fill={P.palma} />
        <path d="M60,70 Q30,90 22,105 Q48,92 60,80" fill={P.palmaHonda} />
      </g>
      <text fill="#ffffff" fontFamily="var(--font-italiana)" fontSize="30" textAnchor="middle" x="180" y="150">
        XV
      </text>
    </svg>
  )
}
