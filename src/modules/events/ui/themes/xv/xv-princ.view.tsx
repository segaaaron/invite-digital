import type { ThemeProps } from '../contract'
import { themeAsset } from '../assets'
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
import { PALETA as P } from './xv-princ.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SERIF = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/**
 * «Princesa Real» — Valentina, de `xv-variants.jsx` (`QuincePrincess`).
 *
 * La princesa por un día: el telón «Mis quince años», las nubes rosas y los corazones que
 * suben, la corona de joyas que flota, el nombre en caligrafía con «cumple XV años», el
 * retrato bajo su arco dorado con la corona encima, la cuenta atrás, la frase, las
 * polaroids, ceremonia y recepción, el mapa, los padrinos del vals, la canción, la
 * vestimenta, la mesa de regalos y la confirmación.
 */
export function XvPrincView({ content, event, themes, slots, audioSrc }: ThemeProps) {
  const ROTULOS = themes.designs['xv-princ']
  const { hero, quote, schedule, ceremony, reception, map, gallery, notes, music, dressCode } = content
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const etiquetaLocal = event.locale === 'en' ? 'en-GB' : 'es-BO'
  // «12 · SEP · 2026», como la maqueta.
  const fecha = valida
    ? `${cuando.getDate()} · ${cuando.toLocaleDateString(etiquetaLocal, { month: 'short' }).replace('.', '').toUpperCase()} · ${cuando.getFullYear()}`
    : ''

  const RANURAS = variablesDeRanuras(pielDeRanuras({ acento: P.frambuesa, sobreAcento: '#000000', tinta: P.ciruela, display: SERIF, radio: 4 }))

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: `linear-gradient(180deg, ${P.fondoArriba} 0%, ${P.fondoAbajo} 100%)`,
        color: P.ciruela,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover
        accent={P.frambuesa}
        bg={P.fondoArriba}
        eyebrow={ROTULOS.coverEyebrow}
        headline={ROTULOS.coverHeadline}
        hint={themes.coverHint}
        label={ROTULOS.coverLabel}
        openLabel={themes.coverAria}
        textColor={P.ciruela}
        variant="curtain"
      />

      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground theme="xv" variant="a" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 50% at 20% 10%, rgba(255,217,232,0.7), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(252,193,210,0.6), transparent 60%)',
          }}
        />
        <FloatingParticles char="♥" color={P.chicle} count={14} seed={15} size={14} />
      </div>

      <div style={{ position: 'relative', padding: '44px 30px 60px' }}>
        <Reveal>
          <p style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', color: P.frambuesa }}>{ROTULOS.lema}</p>
        </Reveal>
        <Reveal>
          <div style={{ margin: '24px -10px 0' }}>
            <Corona />
          </div>
        </Reveal>
        <Reveal>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <h1 style={{ fontFamily: CALIGRAFIA, fontSize: 80, lineHeight: 0.9, fontWeight: 400 }}>{hero?.nameA}</h1>
            <p style={{ fontStyle: 'italic', fontSize: 22, color: P.frambuesa, margin: '8px 0', letterSpacing: '0.2em' }}>
              {ROTULOS.cumple} <span style={{ fontSize: 36, color: P.ciruela, fontStyle: 'normal' }}>{ROTULOS.xv}</span> {ROTULOS.anios}
            </p>
            {fecha === '' ? null : <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.frambuesa, marginTop: 6 }}>{fecha}</p>}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div style={{ position: 'relative', margin: '36px auto 0', width: 240, height: 280 }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: -8,
                background: `linear-gradient(135deg, #fff8d6 0%, #ffd9a8 50%, ${P.chicle} 100%)`,
                borderRadius: '120px 120px 8px 8px / 90px 90px 8px 8px',
                boxShadow: '0 14px 40px rgba(212,86,108,0.25)',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '120px 120px 4px 4px / 90px 90px 4px 4px', overflow: 'hidden', background: '#ffffff' }}>
              <PhotoSlot
                bg="rgba(255,255,255,0.04)"
                border="1px dashed rgba(255,255,255,0.18)"
                color="rgba(255,255,255,0.45)"
                height="100%"
                label={ROTULOS.retrato}
                radius={0}
                src={hero?.portraitImageId === undefined ? themeAsset('xv-princ', 'quinceanera.avif') : `/media/${hero.portraitImageId}`}
                width="100%"
              />
            </div>
            <span aria-hidden style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 28 }}>
              👑
            </span>
          </div>
        </Reveal>

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: '20px 0', borderTop: `1px solid ${P.frambuesa}44`, borderBottom: `1px solid ${P.frambuesa}44`, textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.frambuesa, marginBottom: 14 }}>{ROTULOS.faltan}</p>
              <Countdown
                cellStyle={{ textAlign: 'center' }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.35em', marginTop: 4, color: P.frambuesa }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: SERIF, fontSize: 38, fontWeight: 300, color: P.ciruela, lineHeight: 1 }}
              />
            </div>
          </Reveal>
        )}

        {quote === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 32, textAlign: 'center', fontStyle: 'italic', fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{quote.text}</p>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 32 }}>
            <PhotoCollage
              border="rgba(255,255,255,0.15)"
              photos={(gallery ?? []).map((casilla) => ({ label: casilla.label, src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}` }))}
              polaroidBg="#ffffff"
              polaroidSlotBg="#eee9e0"
              polaroidSlotColor="#aa9999"
              slotBg="rgba(255,255,255,0.04)"
              slotColor="rgba(255,255,255,0.5)"
              stripBg={P.frambuesa}
              variant="polaroid"
            />
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 36 }}>
            {[ceremony, reception].map((lugar, indice) =>
              lugar === undefined ? null : (
                <div key={indice} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: `1px dotted ${P.frambuesa}44` }}>
                  {lugar.label === undefined ? null : <p style={{ fontStyle: 'italic', fontSize: 24 }}>{lugar.label}</p>}
                  <p style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 14 }}>
                    <span>{lugar.place}</span>
                    <span style={{ color: P.frambuesa, fontWeight: 500 }}>{lugar.time}</span>
                  </p>
                  {lugar.address === undefined ? null : <p style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>{lugar.address}</p>}
                </div>
              ),
            )}
          </div>
        </Reveal>

        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MapPreview
                accent={P.frambuesa}
                border="rgba(212,86,108,0.3)"
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

        {notes === undefined || notes.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: 20, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: 14 }}>
              <p style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 24 }}>{ROTULOS.padrinos}</p>
              <dl style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12 }}>
                {notes.map((aviso) => (
                  <div key={`${aviso.title}-${aviso.text}`}>
                    <dt style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', color: P.frambuesa, textTransform: 'uppercase' }}>{aviso.title}</dt>
                    <dd style={{ margin: 0, fontStyle: 'italic', fontSize: 14, marginTop: 2 }}>{aviso.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MusicPlayer
                accent={P.frambuesa}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playIconColor="#3c096c"
                textColor={P.ciruela}
                track={music?.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        {dressCode?.title === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.frambuesa }}>{ROTULOS.vestimenta}</p>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, marginTop: 6 }}>{dressCode.title}</p>
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

/** La corona de joyas rosas que flota (`PrincessCrown` de la maqueta). */
function Corona() {
  return (
    <svg aria-hidden viewBox="0 0 280 180" width="100%">
      <defs>
        <linearGradient id="xv-princ-oro" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#ffd9e8" />
          <stop offset="1" stopColor={P.chicle} />
        </linearGradient>
        <radialGradient cx="0.4" cy="0.3" id="xv-princ-rosa">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#ffbacc" />
          <stop offset="1" stopColor="#a0507a" />
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="160" fill="#000000" opacity="0.2" rx="70" ry="4" />
      <g className="theme-quieto-si-reduce" style={{ transformOrigin: '140px 100px', animation: 'theme-crownFloat 4s ease-in-out infinite' }}>
        <rect fill="url(#xv-princ-oro)" height="14" stroke="#a85a78" strokeWidth="0.6" width="120" x="80" y="118" />
        <path d="M80,118 L100,60 L120,98 L140,50 L160,98 L180,60 L200,118 Z" fill="url(#xv-princ-oro)" stroke="#a85a78" strokeWidth="0.6" />
        <path d="M100,60 L102,90" opacity="0.8" stroke="#ffffff" strokeWidth="1" />
        <path d="M141,50 L142,86" opacity="0.8" stroke="#ffffff" strokeWidth="1" />
        <path d="M180,60 L182,90" opacity="0.8" stroke="#ffffff" strokeWidth="1" />
        <circle cx="100" cy="60" fill="url(#xv-princ-rosa)" r="6" />
        <circle cx="140" cy="52" fill="url(#xv-princ-rosa)" r="9" />
        <circle cx="180" cy="60" fill="url(#xv-princ-rosa)" r="6" />
        <ellipse cx="98" cy="58" fill="#ffffff" opacity="0.85" rx="2" ry="1" />
        <ellipse cx="138" cy="49" fill="#ffffff" opacity="0.9" rx="3" ry="1.5" />
        <ellipse cx="178" cy="58" fill="#ffffff" opacity="0.85" rx="2" ry="1" />
        {[105, 125, 140, 155, 175].map((x) => (
          <circle cx={x} cy="125" fill="url(#xv-princ-rosa)" key={x} r="2.5" />
        ))}
      </g>
      {[
        [55, 50],
        [225, 60],
        [50, 130],
        [230, 135],
      ].map(([x, y], i) => (
        <text className="theme-quieto-si-reduce" fill="#ffffff" fontSize="14" key={x} style={{ animation: `theme-sparkleFade 2s ease-in-out ${i * 0.4}s infinite` }} x={x} y={y}>
          ✦
        </text>
      ))}
    </svg>
  )
}
