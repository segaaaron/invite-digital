import type { ThemeProps } from '../contract'
import { variablesDeRanuras, pielDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { FloatingParticles } from '../kit/backgrounds/FloatingParticles'
import { MapPreview } from '../kit/MapPreview'
import { MarBackground } from '../kit/backgrounds/MarBackground'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoCollage } from '../kit/PhotoCollage'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { CronogramaXv } from './CronogramaXv'
import { PALETA as P } from './xv-vogue.palette'

const MONO = 'var(--font-jetbrains-mono)'
const ITALIANA = 'var(--font-italiana)'

/** El billete de la portada y los rótulos: la voz del diseño. */
const BILLETE = { eyebrow: 'YOUR ACCESS', headline: 'VIP', label: 'VER INVITACIÓN' } as const
const ROTULOS = {
  edicion: 'ROSA PASTEL',
  numero: 'N°15',
  xv: 'XV',
  personal: 'INVITACIÓN PERSONAL',
  pases: (n: number) => `${n} ${n === 1 ? 'pase asignado' : 'pases asignados'}`,
  cronograma: 'CRONOGRAMA',
} as const

/**
 * «Rosa Pastel» — Isabela, de `xv-premium.jsx` (`QuinceVogue`).
 *
 * La portada de revista nocturna: el billete VIP de entrada, el foco rosa desde arriba y las
 * estrellas flotando, la cabecera «Rosa Pastel · N°15», el XV enorme en degradado, el
 * nombre en caligrafía, el retrato, la invitación personal, la cuenta atrás en cuatro
 * casillas, el cronograma, el mosaico, el mapa, la canción y la confirmación.
 */
export function XvVogueView({ content, themes, slots, guestInfo, audioSrc }: ThemeProps) {
  const { hero, schedule, reception, map, itinerary, gallery, music } = content
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)
  const nombre = hero?.nameA ?? ''

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.rosa, sobreAcento: '#000000', tinta: P.blanco, display: 'var(--font-spectral)', radio: 4 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.fondo,
        color: P.blanco,
        fontFamily: 'var(--font-spectral)',
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
        <MarBackground opacity={0.5} theme="xv" variant="a" />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,86,108,0.35), transparent 70%)' }} />
        <FloatingParticles char="✦" color={P.rosaPalido} count={10} seed={31} size={11} />
      </div>

      <div style={{ position: 'relative', padding: '48px 28px 60px' }}>
        <Reveal>
          <p style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa }}>
            <span>{ROTULOS.edicion}</span>
            <span>{ROTULOS.numero}</span>
          </p>
        </Reveal>
        <Reveal>
          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <p
              style={{
                fontFamily: ITALIANA,
                fontSize: 100,
                lineHeight: 0.85,
                background: `linear-gradient(135deg,${P.blanco},${P.rosaPalido} 60%,${P.rosa})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {ROTULOS.xv}
            </p>
            <h1 style={{ fontFamily: 'var(--font-great-vibes)', fontSize: 46, marginTop: 6 }}>{nombre}</h1>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ position: 'relative', margin: '30px auto 0', width: '100%', height: 320 }}>
            <PhotoSlot
              bg="rgba(255,255,255,0.04)"
              border="1px solid rgba(212,86,108,0.4)"
              color="rgba(212,86,108,0.7)"
              height="100%"
              label={`${nombre.toUpperCase()} · RETRATO`}
              radius={18}
              src={hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`}
              width="100%"
            />
          </div>
        </Reveal>
        <Reveal>
          <div style={{ marginTop: 28, textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: `1px solid ${P.rosa}44` }}>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa }}>{ROTULOS.personal}</p>
            {guestInfo === undefined ? (
              <div style={{ marginTop: 8 }}>{slots.guest}</div>
            ) : (
              <>
                <p style={{ fontStyle: 'italic', fontSize: 22, marginTop: 8 }}>{guestInfo.label}</p>
                <p style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{ROTULOS.pases(guestInfo.seats)}</p>
              </>
            )}
          </div>
        </Reveal>
        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <Countdown
                cellStyle={{ textAlign: 'center', padding: '12px 4px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${P.rosa}44`, borderRadius: 8 }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, marginTop: 4, color: P.rosa, letterSpacing: '0.3em' }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: ITALIANA, fontSize: 28 }}
              />
            </div>
          </Reveal>
        )}
        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 30 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.rosa }}>{ROTULOS.cronograma}</p>
              <div style={{ marginTop: 12 }}>
                <CronogramaXv acento={P.rosa} filas={itinerary} filete="rgba(255,255,255,0.15)" />
              </div>
            </div>
          </Reveal>
        )}
        <Reveal>
          <div style={{ marginTop: 28 }}>
            <PhotoCollage
              border="rgba(255,255,255,0.15)"
              photos={(gallery ?? []).map((casilla) => ({ label: casilla.label, src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}` }))}
              polaroidBg="#ffffff"
              polaroidSlotBg="rgba(0,0,0,0.06)"
              polaroidSlotColor="#999999"
              slotBg="rgba(255,255,255,0.04)"
              slotColor="rgba(255,255,255,0.5)"
              stripBg={P.rosa}
              variant="mosaic"
            />
          </div>
        </Reveal>
        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MapPreview
                accent={P.rosa}
                border="rgba(212,86,108,0.4)"
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
