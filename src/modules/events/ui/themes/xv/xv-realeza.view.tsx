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
import { PALETA as P } from './xv-realeza.palette'

const MONO = 'var(--font-jetbrains-mono)'
const CALIGRAFIA = 'var(--font-great-vibes)'

const TELON = { eyebrow: 'ESTÁS INVITADO', headline: 'Algo\ninolvidable' } as const
const ROTULOS = {
  mis: 'Mis',
  xvAnos: 'XV Años',
  lema: '· REALEZA CRISTAL ·',
  personal: 'INVITACIÓN PERSONAL',
  pases: (n: number) => `${n} ${n === 1 ? 'pase asignado' : 'pases asignados'}`,
  faltan: 'FALTAN',
  dalePlay: 'DALE PLAY',
  cronograma: 'CRONOGRAMA',
  vestimenta: 'CÓDIGO DE VESTIMENTA',
} as const

/**
 * «Realeza Cristal» — Camila, de `xv-realeza.jsx` (`QuinceRealezaCristal`).
 *
 * El cuento de la zapatilla: el telón de entrada, el patrón de Cenicienta fundido arriba,
 * «Mis XV Años» en caligrafía, la zapatilla de cristal que flota con sus chispas, el retrato
 * bajo un arco, la invitación personal, la frase, la cuenta atrás, la canción, el
 * cronograma, el carruaje a sangre, el mapa, el código de vestimenta, el mosaico de fotos, la
 * mesa de regalos y la confirmación.
 */
export function XvRealezaView({ content, themes, slots, guestInfo, audioSrc }: ThemeProps) {
  const { hero, quote, schedule, reception, map, itinerary, music, dressCode, gallery, closing } = content
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)
  const nombre = hero?.nameA ?? ''

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.cristal, sobreAcento: '#000000', tinta: P.tinta, display: 'var(--font-cormorant)', radio: 4 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.fondo,
        color: P.tinta,
        fontFamily: 'var(--font-cormorant)',
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover
        accent={P.cristal}
        bg={P.fondo}
        eyebrow={TELON.eyebrow}
        headline={TELON.headline}
        hint={themes.coverHint}
        label={themes.coverOpen}
        openLabel={themes.coverAria}
        textColor={P.tinta}
        variant="curtain"
      />

      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground opacity={0.7} theme="xv" variant="b" />
      </div>

      {/* El patrón de Cenicienta, fundido con el fondo. */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <Image alt="" aria-hidden fill priority sizes="480px" src={themeAsset('xv-realeza', 'patron.avif')} style={{ objectFit: 'cover', objectPosition: 'top' }} />
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, ${P.fondo} 95%)` }} />
      </div>

      <div style={{ position: 'relative', padding: '0 28px 60px', marginTop: -26 }}>
        <Reveal>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.cristal }}>{ROTULOS.mis}</p>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 50, color: P.cristal, marginTop: -4 }}>{ROTULOS.xvAnos}</p>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em', color: P.oro, marginTop: 6 }}>{ROTULOS.lema}</p>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ margin: '14px -10px 0' }}>
            <Zapatilla />
          </div>
        </Reveal>

        <Reveal>
          <p style={{ textAlign: 'center', marginTop: 4, fontFamily: CALIGRAFIA, fontSize: 62 }}>{nombre}</p>
        </Reveal>

        <Reveal delay={100}>
          <div style={{ position: 'relative', margin: '26px auto 0', width: 230, height: 270 }}>
            <span
              aria-hidden
              style={{ position: 'absolute', inset: -6, background: `linear-gradient(135deg,#ffffff,${P.cristal})`, borderRadius: '115px 115px 8px 8px / 90px 90px 8px 8px' }}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '115px 115px 6px 6px / 90px 90px 6px 6px', overflow: 'hidden' }}>
              <PhotoSlot
                bg="rgba(90,159,212,0.08)"
                border="1px dashed rgba(255,255,255,0.18)"
                color="rgba(28,51,80,0.5)"
                height="100%"
                label={`${nombre.toUpperCase()} · REALEZA`}
                radius={0}
                src={hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`}
                width="100%"
              />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 26, textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 12, border: `1px solid ${P.cristal}44` }}>
            <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.cristal }}>{ROTULOS.personal}</p>
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

        {quote === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 28, textAlign: 'center', fontStyle: 'italic', fontSize: 15, lineHeight: 1.7 }}>{quote.text}</p>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: '18px 0', borderTop: `1px solid ${P.cristal}55`, borderBottom: `1px solid ${P.cristal}55`, textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.cristal, marginBottom: 12 }}>{ROTULOS.faltan}</p>
              <Countdown
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4, color: P.cristal }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontSize: 34, fontWeight: 300 }}
              />
            </div>
          </Reveal>
        )}

        {cancion === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <p style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.cristal, marginBottom: 10 }}>{ROTULOS.dalePlay}</p>
              <MusicPlayer
                accent={P.cristal}
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

        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 30 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.cristal, textAlign: 'center' }}>{ROTULOS.cronograma}</p>
              <div style={{ marginTop: 12 }}>
                <CronogramaXv acento={P.cristal} filas={itinerary} filete={`${P.cristal}33`} />
              </div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ position: 'relative', margin: '30px -28px 0', height: 200, overflow: 'hidden' }}>
            <Image alt="" aria-hidden fill sizes="480px" src={themeAsset('xv-realeza', 'carruaje.avif')} style={{ objectFit: 'cover' }} />
          </div>
        </Reveal>

        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 30 }}>
              <MapPreview
                accent={P.cristal}
                border={`${P.cristal}55`}
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

        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 30, textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.cristal }}>{ROTULOS.vestimenta}</p>
              {dressCode.title === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, marginTop: 8 }}>{dressCode.title}</p>}
              {dressCode.note === undefined ? null : <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.7 }}>{dressCode.note}</p>}
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 30 }}>
            <PhotoCollage
              border="rgba(255,255,255,0.15)"
              photos={(gallery ?? []).map((casilla) => ({
                label: casilla.label,
                src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}`,
              }))}
              polaroidBg="#ffffff"
              polaroidSlotBg="rgba(0,0,0,0.06)"
              polaroidSlotColor="#999999"
              slotBg="rgba(255,255,255,0.04)"
              slotColor="rgba(255,255,255,0.5)"
              stripBg={P.cristal}
              variant="mosaic"
            />
          </div>
        </Reveal>

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

        {closing?.text === undefined ? null : (
          <p style={{ marginTop: 34, textAlign: 'center', fontFamily: CALIGRAFIA, fontSize: 30, color: P.cristal }}>{closing.text}</p>
        )}
        <div style={{ marginTop: 28 }}>{slots.pass}</div>
      </div>
    </article>
  )
}

/** La zapatilla de cristal que flota con sus chispas (`HeroCristalSlipper` de la maqueta). */
function Zapatilla() {
  return (
    <svg aria-hidden viewBox="0 0 280 180" width="100%">
      <defs>
        <linearGradient id="xv-realeza-zapatilla" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#eaf6ff" />
          <stop offset="1" stopColor="#8fc4f0" />
        </linearGradient>
      </defs>
      <ellipse cx="140" cy="150" fill="#1a3a5c" opacity="0.15" rx="60" ry="6" />
      <g className="theme-quieto-si-reduce" style={{ transformOrigin: '140px 100px', animation: 'theme-crownFloat 4.5s ease-in-out infinite' }}>
        <path
          d="M95,120 Q95,95 130,90 Q150,88 165,100 Q182,95 190,108 Q196,118 186,124 L100,128 Q90,126 95,120 Z"
          fill="url(#xv-realeza-zapatilla)"
          stroke={P.cristal}
          strokeWidth="1.2"
        />
        <circle cx="128" cy="103" fill="#cfe8ff" r="4" stroke={P.cristal} strokeWidth="0.6" />
      </g>
      {[60, 220, 90, 200].map((x, i) => (
        <text
          className="theme-quieto-si-reduce"
          fill={P.hielo}
          fontSize="13"
          key={x}
          style={{ animation: `theme-sparkleFade 2.2s ease-in-out ${i * 0.3}s infinite` }}
          x={x}
          y={40 + (i % 2) * 20}
        >
          ✦
        </text>
      ))}
      <text fill="#3a6fa0" fontFamily="var(--font-jetbrains-mono)" fontSize="9" letterSpacing="5" textAnchor="middle" x="140" y="165">
        REALEZA · CRISTAL
      </text>
    </svg>
  )
}
