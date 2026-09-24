import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesXv } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { variablesDeRanuras, pielDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { MarBackground } from '../kit/backgrounds/MarBackground'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { PALETA as P } from './xv-eleg.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SERIF = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Los iconos de línea de la maqueta (`ICONS` de `xv-elegante.jsx`). */
const ICONOS = {
  church: 'M12 2 L12 6 M9 6 L15 6 M6 22 V11 L12 6 L18 11 V22 M10 22 V16 H14 V22 M4 22 H20',
  toast: 'M6 3 L8 14 A4 4 0 0 0 12 18 A4 4 0 0 0 16 14 L18 3 M6 3 H18 M12 18 V22 M9 22 H15',
  camera: 'M4 8 H8 L10 5 H14 L16 8 H20 V19 H4 Z M12 15 A3.5 3.5 0 1 0 12 8 A3.5 3.5 0 1 0 12 15',
  disco: 'M12 3 A9 9 0 1 0 12.01 3 M6 8 H18 M6 16 H18 M12 3 V21',
  clock: 'M12 21 A9 9 0 1 0 12 3 A9 9 0 1 0 12 21 M12 7 V12 L16 14',
  gift: 'M4 9 H20 V21 H4 Z M4 9 V21 M12 9 V21 M12 9 C9 9 8 6 9.5 4.5 C11 3 12 5 12 9 C12 5 13 3 14.5 4.5 C16 6 15 9 12 9',
  bank: 'M3 10 L12 4 L21 10 M4 10 V20 M8 10 V20 M12 10 V20 M16 10 V20 M20 10 V20 M2 20 H22',
  heart: 'M12 20 C4 14 2 9 5.5 6.5 C8 4.7 11 6 12 8.5 C13 6 16 4.7 18.5 6.5 C22 9 20 14 12 20',
  location: 'M12 21 C7 16 4 12.4 4 8.6 A8 8 0 1 1 20 8.6 C20 12.4 17 16 12 21 Z M12 11.5 A2.9 2.9 0 1 0 12 5.7 A2.9 2.9 0 1 0 12 11.5',
} as const

/** El icono de cada paso del itinerario, en su orden. */
const PASOS = ['location', 'toast', 'camera', 'disco', 'clock'] as const

/** Las fotos del diseño, en el orden de la galería: atardecer, columnas y la tira de cuatro. */
const FOTOS = ['atardecer.avif', 'columnas.avif', 'ramo.avif', 'lago.avif', 'familia.avif', 'columnas.avif'] as const

function Icono({ nombre, tamano, color }: { readonly nombre: keyof typeof ICONOS; readonly tamano: number; readonly color: string }) {
  return (
    <svg aria-hidden fill="none" height={tamano} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 24 24" width={tamano}>
      <path d={ICONOS[nombre]} />
    </svg>
  )
}

/**
 * «Floral Elegante» — Ximena, de `xv-elegante.jsx` (`QuinceEleganteFloral`).
 *
 * El arco de flores en tres paneles: el sobre de entrada, las esquinas de flores rosas,
 * «Mis XV Años» con la corona de línea, el nombre, el retrato bajo el arco, la frase, la
 * canción, los padres y padrinos, la fecha y la cuenta atrás, el calendario del mes con el
 * día en un corazón; la misa y la recepción, la sesión al atardecer, el itinerario con sus
 * iconos, la vestimenta; y el retrato de columnas, la sugerencia de regalos con la cuenta,
 * la confirmación y la tira de fotos.
 */
export function XvElegView({ content, event, themes, slots, audioSrc, respondida }: ThemeProps) {
  const ROTULOS = themes.designs['xv-eleg']
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, music, dressCode, gallery, notes, closing } = content
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)
  const nombre = hero?.nameA ?? ''
  const familia = hosts === undefined ? { padres: [], padrinos: [] } : anfitrionesXv(hosts)
  const [regalos, cuenta, nota] = [notes?.[0], notes?.[1], notes?.[2]]

  const etiquetaLocal = event.locale === 'en' ? 'en-GB' : 'es-BO'
  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const capital = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)
  const mes = valida ? capital(cuando.toLocaleDateString(etiquetaLocal, { month: 'long' })) : ''
  const diaSemana = valida ? cuando.toLocaleDateString(etiquetaLocal, { weekday: 'long' }).toUpperCase() : ''
  const plazo =
    respondida || event.rsvpDeadline === null
      ? null
      : `${themes.rsvpBefore} ${new Intl.DateTimeFormat(etiquetaLocal, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${event.rsvpDeadline}T00:00:00Z`))}`

  const foto = (indice: number): string => {
    const casilla = gallery?.[indice]
    return casilla?.imageId === undefined ? themeAsset('xv-eleg', FOTOS[indice] ?? 'columnas.avif') : `/media/${casilla.imageId}`
  }
  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  const RANURAS = variablesDeRanuras(pielDeRanuras({ acento: P.salvia, sobreAcento: '#000000', tinta: P.musgo, display: SERIF, radio: 4 }))

  return (
    <article
      style={{ ...RANURAS, position: 'relative', background: P.fondo, color: P.musgo, fontFamily: SERIF, lineHeight: 'normal', minHeight: 'var(--alto, 100dvh)', overflowX: 'clip' }}
    >
      <EnvelopeCover accent={P.oro} bg={P.fondo} hint={themes.coverHint} label={themes.coverOpen} openLabel={themes.coverAria} textColor={P.musgo} />

      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <MarBackground theme="xv" variant="a" />
      </div>

      {/* ── Panel 1 ── */}
      <div style={{ position: 'relative' }}>
        <span aria-hidden style={{ position: 'absolute', top: -10, left: -20, width: 190, zIndex: 2, pointerEvents: 'none' }}>
          <Image alt="" height={190} priority sizes="190px" src={themeAsset('xv-eleg', 'esquina-izq.avif')} style={{ width: '100%', height: 'auto' }} width={190} />
        </span>
        <span aria-hidden style={{ position: 'absolute', top: -10, right: -20, width: 150, zIndex: 2, pointerEvents: 'none' }}>
          <Image alt="" height={150} priority sizes="150px" src={themeAsset('xv-eleg', 'esquina-der.avif')} style={{ width: '100%', height: 'auto' }} width={150} />
        </span>

        <div style={{ padding: '150px 26px 60px' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.salvia, lineHeight: 1 }}>{ROTULOS.mis}</p>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 50, color: P.salvia, lineHeight: 1, marginTop: 2 }}>{ROTULOS.xvAnos}</p>
            </div>
          </Reveal>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
              <svg aria-hidden viewBox="0 0 100 60" width={60}>
                <path d="M8,50 L18,15 L32,38 L50,10 L68,38 L82,15 L92,50 Z" fill="none" stroke={P.oro} strokeLinejoin="round" strokeWidth="2.4" />
                <circle cx="18" cy="15" fill={P.oro} r="3" />
                <circle cx="50" cy="10" fill={P.oro} r="3.6" />
                <circle cx="82" cy="15" fill={P.oro} r="3" />
                <line stroke={P.oro} strokeWidth="2.4" x1="8" x2="92" y1="50" y2="50" />
              </svg>
            </div>
          </Reveal>
          <Reveal>
            <h1 style={{ textAlign: 'center', marginTop: 6, fontFamily: CALIGRAFIA, fontSize: 60, color: P.oro }}>{nombre}</h1>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ position: 'relative', margin: '26px auto 0', width: 230, height: 260 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '115px 115px 8px 8px / 90px 90px 8px 8px', overflow: 'hidden', border: `1px solid ${P.oro}88` }}>
                <PhotoSlot
                  bg="rgba(255,255,255,0.04)"
                  border="1px dashed rgba(255,255,255,0.18)"
                  color="rgba(255,255,255,0.45)"
                  height="100%"
                  label={`${nombre.toUpperCase()} · ${ROTULOS.retrato}`}
                  radius={0}
                  src={hero?.portraitImageId === undefined ? themeAsset('xv-eleg', 'arco.avif') : `/media/${hero.portraitImageId}`}
                  width="100%"
                />
              </div>
            </div>
          </Reveal>
          {quote === undefined ? null : (
            <Reveal>
              <p style={{ marginTop: 30, textAlign: 'center', fontStyle: 'italic', fontSize: 14, lineHeight: 1.8, padding: '0 6px' }}>{quote.text}</p>
            </Reveal>
          )}
          {music === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 30 }}>
                <p style={{ textAlign: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro, marginBottom: 10 }}>{ROTULOS.dalePlay}</p>
                <MusicPlayer
                  accent={P.oro}
                  artist={music?.artist ?? ''}
                  audioSrc={cancion}
                  eyebrow={themes.songOfTheNight}
                  playIconColor="#3c096c"
                  textColor={P.musgo}
                  track={music?.track ?? ''}
                />
              </div>
            </Reveal>
          )}
          {hosts === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 34, textAlign: 'center' }}>
                {hosts.label === undefined ? null : <p style={{ fontSize: 13, lineHeight: 1.8 }}>{hosts.label}</p>}
                {familia.padres.length === 0 ? null : (
                  <p style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro, marginTop: 10 }}>{familia.padres.join(' & ')}</p>
                )}
                {familia.padrinos.length === 0 ? null : (
                  <>
                    <p style={{ fontSize: 13, marginTop: 18 }}>{ROTULOS.padrinos}</p>
                    <p style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro, marginTop: 10 }}>{familia.padrinos.join(' & ')}</p>
                  </>
                )}
                <p style={{ fontSize: 13, marginTop: 22 }}>{ROTULOS.festejar}</p>
                <p style={{ fontSize: 30, fontWeight: 600, letterSpacing: '0.1em', color: P.salvia }}>{ROTULOS.xvMayus}</p>
              </div>
            </Reveal>
          )}
          {valida ? (
            <Reveal>
              <div style={{ marginTop: 30, textAlign: 'center' }}>
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro }}>{mes}</p>
                <p style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 20, marginTop: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em' }}>{diaSemana}</span>
                  <span style={{ fontSize: 60, fontWeight: 300 }}>{cuando.getDate()}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em' }}>{cuando.getFullYear()}</span>
                </p>
              </div>
            </Reveal>
          ) : null}
          {schedule === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: P.oro, marginBottom: 12 }}>{ROTULOS.faltan}</p>
                <Countdown
                  labelStyle={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', marginTop: 4 }}
                  labels={{ days: themes.countdownDays, hours: themes.countdownHoursLong, mins: themes.countdownMinsLong, secs: themes.countdownSecsLong }}
                  rowStyle={{ display: 'flex', justifyContent: 'space-around' }}
                  targetISO={schedule.startsAt}
                  valueStyle={{ fontSize: 34, fontWeight: 300, color: P.salvia }}
                />
              </div>
            </Reveal>
          )}
          {valida ? (
            <Reveal>
              <div style={{ marginTop: 34, textAlign: 'center' }}>
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.oro }}>{ROTULOS.granDia}</p>
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 18, marginTop: -2 }}>{mes}</p>
                <div style={{ marginTop: 14 }}>
                  <Calendario dias={ROTULOS.dias.split(',')} fecha={cuando} />
                </div>
              </div>
            </Reveal>
          ) : null}
        </div>
      </div>

      {/* ── Panel 2 ── */}
      <div style={{ padding: '40px 26px 60px', position: 'relative' }}>
        {[
          { lugar: ceremony, icono: 'church' as const },
          { lugar: reception, icono: 'toast' as const },
        ].map(({ lugar, icono }, indice) =>
          lugar === undefined ? null : (
            <div key={icono}>
              {indice === 1 && ceremony !== undefined ? <div aria-hidden style={{ height: 1, background: `${P.oro}33`, margin: '6px 0' }} /> : null}
              <div style={{ textAlign: 'center', padding: '22px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <Icono color={P.salvia} nombre={icono} tamano={26} />
                </div>
                {lugar.label === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.salvia }}>{lugar.label}</p>}
                {lugar.time === undefined ? null : <p style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, marginTop: 8 }}>{lugar.time}</p>}
                {lugar.place === undefined ? null : <p style={{ fontSize: 12, letterSpacing: '0.05em', marginTop: 4, textTransform: 'uppercase' }}>{lugar.place}</p>}
                {lugar.address === undefined ? null : <p style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{lugar.address}</p>}
                {llegarA(lugar) === null ? null : (
                  <a
                    href={llegarA(lugar) ?? ''}
                    rel="noreferrer"
                    style={{
                      marginTop: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 18px',
                      borderRadius: 999,
                      border: `1px solid ${P.salvia}`,
                      color: P.salvia,
                      fontFamily: MONO,
                      fontSize: 9,
                      letterSpacing: '0.2em',
                      textDecoration: 'none',
                    }}
                    target="_blank"
                  >
                    <Icono color={P.salvia} nombre="location" tamano={12} /> {ROTULOS.verUbicacion}
                  </a>
                )}
              </div>
            </div>
          ),
        )}

        <Reveal>
          <div style={{ position: 'relative', margin: '34px auto 0', width: '100%', height: 300, borderRadius: 4, overflow: 'hidden' }}>
            <PhotoSlot
              bg="rgba(255,255,255,0.04)"
              border="1px dashed rgba(255,255,255,0.18)"
              color="rgba(255,255,255,0.45)"
              height="100%"
              label={gallery?.[0]?.label ?? ''}
              radius={4}
              src={foto(0)}
              width="100%"
            />
          </div>
        </Reveal>

        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro }}>{ROTULOS.itinerario}</p>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 22, marginTop: -6 }}>{ROTULOS.deActividades}</p>
              <ol style={{ textAlign: 'left', maxWidth: 220, margin: '26px auto 0', listStyle: 'none', padding: 0 }}>
                {itinerary.map((fila, indice) => (
                  <li key={`${fila.time}-${fila.label}`} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
                      <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: P.salvia }} />
                      {indice === itinerary.length - 1 ? null : <span style={{ display: 'block', width: 1, flex: 1, minHeight: 34, background: `${P.salvia}55` }} />}
                    </span>
                    <span style={{ paddingBottom: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>
                        <span style={{ display: 'block', fontFamily: MONO, fontSize: 12, fontWeight: 600 }}>{fila.time}</span>
                        <span style={{ display: 'block', fontSize: 11, letterSpacing: '0.08em', opacity: 0.65, marginTop: 2, textTransform: 'uppercase' }}>{fila.label}</span>
                      </span>
                      <Icono color={P.salvia} nombre={PASOS[indice % PASOS.length] ?? 'clock'} tamano={22} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        )}

        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.oro }}>{ROTULOS.vestimenta}</p>
              {dressCode.title === undefined ? null : (
                <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 6, textTransform: 'uppercase' }}>{dressCode.title}</p>
              )}
              <div aria-hidden style={{ display: 'flex', justifyContent: 'center', gap: 22, marginTop: 14 }}>
                <span style={{ display: 'block', width: 34, height: 44, background: '#1a1a1a', clipPath: 'polygon(30% 0,70% 0,100% 20%,80% 100%,20% 100%,0 20%)' }} />
                <span
                  style={{ display: 'block', width: 34, height: 44, background: '#1a1a1a', clipPath: 'polygon(20% 0,80% 0,100% 10%,65% 30%,80% 100%,20% 100%,35% 30%,0 10%)' }}
                />
              </div>
              {dressCode.note === undefined ? null : <p style={{ marginTop: 14, fontSize: 12, lineHeight: 1.7, opacity: 0.75, padding: '0 10px' }}>{dressCode.note}</p>}
            </div>
          </Reveal>
        )}
      </div>

      {/* ── Panel 3 ── */}
      <div style={{ padding: '10px 26px 60px', position: 'relative' }}>
        <Reveal>
          <div style={{ position: 'relative', width: '100%', height: 300, borderRadius: 4, overflow: 'hidden' }}>
            <PhotoSlot
              bg="rgba(255,255,255,0.04)"
              border="1px dashed rgba(255,255,255,0.18)"
              color="rgba(255,255,255,0.45)"
              height="100%"
              label={gallery?.[1]?.label ?? ''}
              radius={4}
              src={foto(1)}
              width="100%"
            />
          </div>
        </Reveal>

        {regalos === undefined && cuenta === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <Icono color={P.salvia} nombre="gift" tamano={30} />
              </div>
              {regalos?.title === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.oro }}>{regalos.title}</p>}
              {regalos?.text === undefined ? null : <p style={{ marginTop: 12, fontSize: 12, lineHeight: 1.8, opacity: 0.75, padding: '0 6px' }}>{regalos.text}</p>}
              {cuenta === undefined ? null : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                    <Icono color={P.salvia} nombre="bank" tamano={26} />
                  </div>
                  {cuenta.title === undefined ? null : <p style={{ marginTop: 10, fontFamily: CALIGRAFIA, fontSize: 22, color: P.oro }}>{cuenta.title}</p>}
                  {cuenta.text === undefined ? null : (
                    <p style={{ marginTop: 10, fontFamily: MONO, fontSize: 11, lineHeight: 2, letterSpacing: '0.05em', whiteSpace: 'pre-line' }}>{cuenta.text}</p>
                  )}
                </>
              )}
              <div style={{ marginTop: 18 }}>{slots.registry}</div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Icono color={P.salvia} nombre="heart" tamano={28} />
            </div>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.oro }}>{ROTULOS.confirmar}</p>
            {plazo === null ? null : (
              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                {ROTULOS.porFavor}
                <br />
                {plazo}
              </p>
            )}
            <div style={{ marginTop: 20 }}>{slots.rsvp}</div>
            {nota === undefined ? null : (
              <div style={{ marginTop: 22, fontSize: 12, lineHeight: 1.8, opacity: 0.7, padding: '0 6px' }}>
                {nota.title === undefined ? null : <p style={{ fontWeight: 600 }}>{nota.title}</p>}
                {nota.text === undefined ? null : <p>{nota.text}</p>}
              </div>
            )}
          </div>
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
          <Reveal>
            <p style={{ marginTop: 34, textAlign: 'center', fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro }}>{closing.text}</p>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: 6, background: P.noche, borderRadius: 2 }}>
            {[2, 3, 4, 5].map((indice) => (
              <div key={indice} style={{ aspectRatio: '3/4' }}>
                <PhotoSlot
                  bg="rgba(255,255,255,0.04)"
                  border="1px dashed rgba(255,255,255,0.18)"
                  color="rgba(255,255,255,0.45)"
                  height="100%"
                  label={gallery?.[indice]?.label ?? ''}
                  radius={0}
                  src={foto(indice)}
                  width="100%"
                />
              </div>
            ))}
          </div>
        </Reveal>
        <div style={{ marginTop: 28 }}>{slots.pass}</div>
      </div>
    </article>
  )
}

/** El calendario del mes de la fiesta, de lunes a domingo, con el día dentro de un corazón. */
function Calendario({ fecha, dias: semana }: { readonly fecha: Date; readonly dias: readonly string[] }) {
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth()
  const dias = new Date(anio, mes + 1, 0).getDate()
  // Lunes = 0 … domingo = 6.
  const primero = (new Date(anio, mes, 1).getDay() + 6) % 7
  const celdas: (number | null)[] = [...Array.from({ length: primero }, () => null), ...Array.from({ length: dias }, (_, i) => i + 1)]
  while (celdas.length % 7 !== 0) celdas.push(null)
  const filas = Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: P.oro, textAlign: 'center', marginBottom: 6 }}>
        {semana.map((dia) => (
          <span key={dia}>{dia}</span>
        ))}
      </div>
      {filas.map((fila, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {fila.map((dia, j) => (
            <span key={j} style={{ textAlign: 'center', fontSize: 12, padding: '6px 0', position: 'relative' }}>
              {dia === fecha.getDate() ? (
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <Icono color={P.rosa} nombre="heart" tamano={26} />
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#ffffff' }}>
                    {dia}
                  </span>
                </span>
              ) : (
                dia
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
