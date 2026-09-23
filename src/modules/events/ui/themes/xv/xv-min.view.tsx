import type { ThemeProps } from '../contract'
import { variablesDeRanuras, pielDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { MapPreview } from '../kit/MapPreview'
import { MarBackground } from '../kit/backgrounds/MarBackground'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { CARTA_DE_COLOR, PALETA as P } from './xv-min.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SPECTRAL = 'var(--font-spectral)'

const ROTULOS = {
  quince: '· QUINCE ·',
  numero: '· N° 015 ·',
  titular: 'Quince.',
  retrato: 'EDITORIAL',
  eventos: 'P.01 — EVENTOS',
  lugar: 'P.02 — LUGAR',
  vestimenta: 'P.03 — VESTIMENTA',
  rsvp: 'P.04 — RSVP',
  confirma: 'Confirma',
  antes: 'antes',
  del: 'del',
  mesa: '// MESA DIGITAL',
} as const

/** Un rótulo de sección de la revista: «P.01 — EVENTOS». */
function Rotulo({ children }: { readonly children: string }) {
  return <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', color: P.iris }}>{children}</p>
}

/**
 * «Editorial» — Sofía, de `xv-variants.jsx` (`QuinceMinimal`).
 *
 * La revista mínima: el billete de entrada, la cabecera «Quince · N° 015», la corona de
 * alambre que flota, «Quince. Sofía.» a lo grande, el retrato a sangre, la cita entre
 * filetes gruesos, la cuenta atrás en rejilla, y las páginas numeradas: eventos, lugar con su
 * mapa, vestimenta con su paleta y confirmación, la mesa digital en negro y el colofón.
 */
export function XvMinView({ content, event, themes, slots, respondida }: ThemeProps) {
  const { hero, quote, schedule, reception, map, itinerary, dressCode, notes } = content
  const nombre = hero?.nameA ?? ''
  const mesa = notes?.[0]

  const etiquetaLocal = event.locale === 'en' ? 'en-GB' : 'es-BO'
  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const anio = valida ? cuando.getFullYear() : ''
  // «SÁBADO · 21 NOV · 2026 · 18:00».
  const fechaLarga = valida
    ? [
        cuando.toLocaleDateString(etiquetaLocal, { weekday: 'long' }),
        `${cuando.getDate()} ${cuando.toLocaleDateString(etiquetaLocal, { month: 'short' }).replace('.', '')}`,
        String(cuando.getFullYear()),
        cuando.toLocaleTimeString(etiquetaLocal, { hour: '2-digit', minute: '2-digit', hour12: false }),
      ]
        .join(' · ')
        .toUpperCase()
    : ''
  const plazo =
    respondida || event.rsvpDeadline === null
      ? null
      : (() => {
          const dia = new Date(`${event.rsvpDeadline}T00:00:00Z`)
          const mes = new Intl.DateTimeFormat(etiquetaLocal, { month: 'long', timeZone: 'UTC' }).format(dia)
          return `${dia.getUTCDate()} ${mes}`
        })()

  // «Formal · paleta neutra.»: la última palabra del título va en cursiva.
  const tituloVestimenta = dressCode?.title ?? ''
  const corte = tituloVestimenta.lastIndexOf(' ')
  const vestimentaRecta = corte === -1 ? '' : tituloVestimenta.slice(0, corte + 1)
  const vestimentaCursiva = corte === -1 ? tituloVestimenta : tituloVestimenta.slice(corte + 1)

  const RANURAS = variablesDeRanuras(pielDeRanuras({ acento: P.iris, sobreAcento: '#000000', tinta: P.tinta, display: SPECTRAL, radio: 4 }))

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.papel,
        color: P.tinta,
        fontFamily: SPECTRAL,
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover
        accent={P.tinta}
        bg={P.papel}
        eyebrow="YOUR ACCESS"
        headline="VIP"
        headlineFont="var(--font-space-grotesk)"
        hint={themes.coverHint}
        label={`QUINCE · ${anio}`}
        openLabel={themes.coverAria}
        textColor={P.tinta}
        variant="ticket"
      />

      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground opacity={0.5} theme="xv" variant="a" />
      </div>

      <div style={{ position: 'relative', padding: '44px 28px 60px' }}>
        <Reveal>
          <p style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em' }}>
            <span>{ROTULOS.quince}</span>
            <span>{ROTULOS.numero}</span>
          </p>
        </Reveal>

        <Reveal>
          <div style={{ margin: '30px -10px 0' }}>
            <Corona />
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28, textAlign: 'left' }}>
            <p style={{ fontFamily: SPECTRAL, fontSize: 96, fontWeight: 200, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
              {ROTULOS.titular}
              <br />
              <span style={{ fontStyle: 'italic', color: P.iris }}>{nombre}.</span>
            </p>
            {fechaLarga === '' ? null : <p style={{ marginTop: 14, fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em' }}>{fechaLarga}</p>}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div style={{ position: 'relative', margin: '36px auto 0', width: '100%', height: 360 }}>
            <PhotoSlot
              bg="rgba(10,10,10,0.05)"
              border="none"
              color="rgba(10,10,10,0.4)"
              height="100%"
              label={`${ROTULOS.retrato} · ${nombre.toUpperCase()}`}
              radius={0}
              src={hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`}
              width="100%"
            />
          </div>
        </Reveal>

        {quote === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: '26px 0', borderTop: `2px solid ${P.tinta}`, borderBottom: `2px solid ${P.tinta}`, textAlign: 'center' }}>
              <p style={{ fontFamily: SPECTRAL, fontStyle: 'italic', fontSize: 28, fontWeight: 200, lineHeight: 1.3 }}>{quote.text}</p>
              {nombre === '' ? null : (
                <p style={{ marginTop: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.iris }}>— {nombre.slice(0, 1).toUpperCase()}.</p>
              )}
            </div>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <Countdown
                cellStyle={{ background: P.papel, padding: '16px 4px', textAlign: 'center' }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4, opacity: 0.6 }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: P.tinta, padding: 1 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: SPECTRAL, fontSize: 36, fontWeight: 200, lineHeight: 1 }}
              />
            </div>
          </Reveal>
        )}

        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <Rotulo>{ROTULOS.eventos}</Rotulo>
              <ol style={{ marginTop: 18, listStyle: 'none', padding: 0 }}>
                {itinerary.map((fila, indice) => (
                  <li
                    key={`${fila.time}-${fila.label}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr',
                      gap: 14,
                      padding: '12px 0',
                      borderBottom: indice < itinerary.length - 1 ? '1px solid rgba(10,10,10,0.15)' : 'none',
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: P.iris }}>{fila.time}</span>
                    <span>
                      <span style={{ display: 'block', fontFamily: SPECTRAL, fontStyle: 'italic', fontSize: 18 }}>{fila.label}</span>
                      {fila.note === undefined ? null : <span style={{ display: 'block', fontSize: 11, opacity: 0.6, marginTop: 2 }}>{fila.note}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        )}

        {reception?.place === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <Rotulo>{ROTULOS.lugar}</Rotulo>
              <p style={{ marginTop: 10, fontFamily: SPECTRAL, fontStyle: 'italic', fontSize: 32, fontWeight: 200 }}>{reception.place}</p>
              {reception.address === undefined ? null : <p style={{ fontSize: 13, marginTop: 4, opacity: 0.75 }}>{reception.address}</p>}
              <div style={{ marginTop: 16 }}>
                <MapPreview
                  accent={P.iris}
                  border="rgba(124,92,255,0.3)"
                  coords={map?.coords ?? ''}
                  directionsLabel={themes.viewLocation}
                  href={map?.href}
                  label={reception.place.toUpperCase()}
                  pinDot="#000000"
                  respaldo={[reception.place, reception.address].filter(Boolean).join(', ')}
                />
              </div>
            </div>
          </Reveal>
        )}

        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <Rotulo>{ROTULOS.vestimenta}</Rotulo>
              <p style={{ marginTop: 10, fontFamily: SPECTRAL, fontSize: 32, fontWeight: 200 }}>
                {vestimentaRecta}
                <span style={{ fontStyle: 'italic' }}>{vestimentaCursiva}</span>
              </p>
              {dressCode.colors === undefined || dressCode.colors.length === 0 ? null : (
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                  {dressCode.colors.map((color) => (
                    <span key={color} style={{ textAlign: 'center' }}>
                      <span style={{ display: 'block', width: '100%', aspectRatio: '1/1', background: color, border: '1px solid rgba(10,10,10,0.12)' }} />
                      <span style={{ display: 'block', fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', marginTop: 4 }}>
                        {(CARTA_DE_COLOR.find((c) => c.color === color.toLowerCase())?.nombre ?? '').toUpperCase()}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 36 }}>
            <Rotulo>{ROTULOS.rsvp}</Rotulo>
            <p style={{ marginTop: 10, fontFamily: SPECTRAL, fontSize: 32, fontWeight: 200 }}>
              {plazo === null ? (
                `${ROTULOS.confirma}.`
              ) : (
                <>
                  {ROTULOS.confirma} <span style={{ fontStyle: 'italic' }}>{ROTULOS.antes}</span> {ROTULOS.del} {plazo}.
                </>
              )}
            </p>
            <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
          </div>
        </Reveal>

        {mesa === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: 24, background: P.tinta, color: '#ffffff', borderRadius: 4 }}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.iris }}>{ROTULOS.mesa}</p>
              {mesa.title === undefined ? null : <p style={{ marginTop: 8, fontFamily: SPECTRAL, fontStyle: 'italic', fontSize: 22 }}>{mesa.title}</p>}
              {mesa.text === undefined ? null : <p style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>{mesa.text}</p>}
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 28 }}>{slots.registry}</div>
        </Reveal>
        {slots.photos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, textAlign: 'center' }}>{slots.photos}</div>
          </Reveal>
        )}
        <Reveal>
          <div style={{ marginTop: 28 }}>{slots.guestbook}</div>
        </Reveal>

        <p style={{ marginTop: 40, textAlign: 'center', fontFamily: SPECTRAL, fontStyle: 'italic', fontSize: 22, fontWeight: 200 }}>XV · {anio}</p>
        <div style={{ marginTop: 28 }}>{slots.pass}</div>
      </div>
    </article>
  )
}

/** La corona de alambre que flota (`MinimalCrown` de la maqueta). */
function Corona() {
  const t = P.tinta
  return (
    <svg aria-hidden viewBox="0 0 280 180" width="100%">
      <g className="theme-quieto-si-reduce" style={{ transformOrigin: '140px 100px', animation: 'theme-crownFloat 5s ease-in-out infinite' }}>
        <line stroke={t} strokeWidth="2" x1="80" x2="200" y1="130" y2="130" />
        <line stroke={t} strokeWidth="2" x1="80" x2="80" y1="126" y2="134" />
        <line stroke={t} strokeWidth="2" x1="200" x2="200" y1="126" y2="134" />
        <line stroke={t} strokeWidth="1.5" x1="80" x2="100" y1="130" y2="60" />
        <line stroke={t} strokeWidth="1.5" x1="200" x2="180" y1="130" y2="60" />
        <line stroke={t} strokeWidth="1.5" x1="100" x2="120" y1="60" y2="95" />
        <line stroke={t} strokeWidth="1.5" x1="180" x2="160" y1="60" y2="95" />
        <line stroke={t} strokeWidth="1.5" x1="120" x2="140" y1="95" y2="50" />
        <line stroke={t} strokeWidth="1.5" x1="160" x2="140" y1="95" y2="50" />
        <circle cx="100" cy="60" fill={t} r="3" />
        <circle cx="140" cy="50" fill={t} r="4" />
        <circle cx="180" cy="60" fill={t} r="3" />
        <circle cx="120" cy="95" fill={t} r="2" />
        <circle cx="160" cy="95" fill={t} r="2" />
      </g>
      <text fill={t} fontFamily="var(--font-jetbrains-mono)" fontSize="9" letterSpacing="5" opacity="0.7" textAnchor="middle" x="140" y="170">
        XV
      </text>
    </svg>
  )
}
