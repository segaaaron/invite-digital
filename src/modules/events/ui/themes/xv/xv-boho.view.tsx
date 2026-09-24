import Image from 'next/image'
import { themeAsset } from '../assets'
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
import { PALETA as P } from './xv-boho.palette'

const MONO = 'var(--font-jetbrains-mono)'
const NEWSREADER = 'var(--font-newsreader)'

const ROTULOS = { misQuince: '· MIS QUINCE AÑOS ·', retrato: 'LA QUINCEAÑERA', faltan: 'FALTAN', cronograma: 'CRONOGRAMA' } as const

/**
 * «Bohemia» — Renata, de `xv-premium.jsx` (`QuinceBoho`).
 *
 * Silvestre y de campo: el sobre de entrada, las flores rosas y el ramo naranja en las
 * esquinas, el nombre en caligrafía, el retrato bajo su arco de melocotón, la cuenta
 * atrás entre filetes, la frase, el collage asimétrico, el cronograma, el mapa, la canción,
 * la mesa de regalos y la confirmación.
 */
export function XvBohoView({ content, event, themes, slots, audioSrc }: ThemeProps) {
  const { hero, quote, schedule, reception, map, itinerary, gallery, music } = content
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const etiquetaLocal = event.locale === 'en' ? 'en-GB' : 'es-BO'
  // «24 · OCT · 2026», como la maqueta.
  const fecha = valida
    ? `${cuando.getDate()} · ${cuando.toLocaleDateString(etiquetaLocal, { month: 'short' }).replace('.', '').toUpperCase()} · ${cuando.getFullYear()}`
    : ''

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.terracota, sobreAcento: '#000000', tinta: P.tinta, display: NEWSREADER, radio: 4 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.fondo,
        color: P.tinta,
        fontFamily: NEWSREADER,
        lineHeight: 'normal',
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover accent={P.terracota} bg={P.fondo} hint={themes.coverHint} label={themes.coverOpen} openLabel={themes.coverAria} textColor={P.tinta} />

      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground theme="xv" variant="b" />
      </div>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, width: 130, opacity: 0.9, pointerEvents: 'none', zIndex: 1 }}>
        <Image alt="" height={130} sizes="130px" src={themeAsset('xv-boho', 'esquina-rosa.avif')} style={{ width: '100%', height: 'auto' }} width={130} />
      </span>
      <span aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: 120, opacity: 0.9, pointerEvents: 'none', zIndex: 1 }}>
        <Image alt="" height={120} sizes="120px" src={themeAsset('xv-boho', 'ramo-naranja.avif')} style={{ width: '100%', height: 'auto' }} width={120} />
      </span>

      <div style={{ position: 'relative', padding: '56px 28px 60px' }}>
        <Reveal>
          <p style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', color: P.terracota }}>{ROTULOS.misQuince}</p>
        </Reveal>
        <Reveal>
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <h1 style={{ fontFamily: 'var(--font-great-vibes)', fontSize: 74, lineHeight: 0.95 }}>{hero?.nameA}</h1>
            {fecha === '' ? null : <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', marginTop: 10 }}>{fecha}</p>}
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ position: 'relative', margin: '34px auto 0', width: 230, height: 270 }}>
            <span aria-hidden style={{ position: 'absolute', inset: -6, background: P.arco, borderRadius: '50% 50% 6px 6px / 40% 40% 6px 6px' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50% 50% 4px 4px / 40% 40% 4px 6px', overflow: 'hidden' }}>
              <PhotoSlot
                bg="rgba(74,52,35,0.06)"
                border="1px dashed rgba(255,255,255,0.18)"
                color="rgba(74,52,35,0.4)"
                height="100%"
                label={ROTULOS.retrato}
                radius={0}
                src={hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`}
                width="100%"
              />
            </div>
          </div>
        </Reveal>
        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 34, padding: '18px 0', borderTop: `1px solid ${P.terracota}55`, borderBottom: `1px solid ${P.terracota}55`, textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.terracota, marginBottom: 12 }}>{ROTULOS.faltan}</p>
              <Countdown
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4, color: P.terracota }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: NEWSREADER, fontSize: 34, fontWeight: 300 }}
              />
            </div>
          </Reveal>
        )}
        {quote === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 30, textAlign: 'center', fontStyle: 'italic', fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{quote.text}</p>
          </Reveal>
        )}
        <Reveal>
          <div style={{ marginTop: 30 }}>
            <PhotoCollage
              border="rgba(255,255,255,0.15)"
              photos={(gallery ?? []).map((casilla) => ({ label: casilla.label, src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}` }))}
              polaroidBg="#ffffff"
              polaroidSlotBg="rgba(0,0,0,0.06)"
              polaroidSlotColor="#999999"
              slotBg="rgba(255,255,255,0.04)"
              slotColor="rgba(255,255,255,0.5)"
              stripBg={P.terracota}
              variant="asymmetric"
            />
          </div>
        </Reveal>
        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 34 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.terracota }}>{ROTULOS.cronograma}</p>
              <div style={{ marginTop: 12 }}>
                <CronogramaXv acento={P.terracota} filas={itinerary} filete={`${P.terracota}33`} />
              </div>
            </div>
          </Reveal>
        )}
        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 26 }}>
              <MapPreview
                accent={P.terracota}
                border={`${P.terracota}55`}
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
                accent={P.terracota}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playIconColor="#3c096c"
                textColor={P.tinta}
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
