import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesXv } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { variablesDeRanuras, pielDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { PapillonCover } from './PapillonCover'
import { CARTA_DE_COLOR, PALETA as P } from './xv-papillon.palette'

const SANS = 'var(--font-outfit)'
const SERIF = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Las piezas rosas del itinerario, por su clave (`imageId`). */
const PIEZAS = {
  copa: 'copa-pinki-sf.avif',
  cena: 'cena-pinki-sf.avif',
  baile: 'baile-pinki-sf.avif',
  torta: 'torta-pinki-sf.avif',
  mascara: 'mascara-pinki-sf.avif',
  carruaje: 'auto-pinki-sf.avif',
} as const
const ORDEN = ['copa', 'cena', 'baile', 'torta', 'mascara', 'carruaje'] as const

/** El cristal esmerilado de las tarjetas (`ppBlurBg` de la maqueta). */
const CRISTAL: CSSProperties = {
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  background: P.cristal,
  borderRadius: 20,
  padding: '25px 35px',
}

function Tarjeta({ children, style }: { readonly children: ReactNode; readonly style?: CSSProperties }) {
  return <div style={{ position: 'relative', ...CRISTAL, ...style }}>{children}</div>
}

/** Cada bloque va en su franja, con el mismo aire arriba y abajo. */
function Franja({ children, centrada = false }: { readonly children: ReactNode; readonly centrada?: boolean }) {
  return <div style={{ position: 'relative', padding: '30px 22px 40px', textAlign: centrada ? 'center' : undefined }}>{children}</div>
}

/**
 * «Papillon» — Emilia, de `xv-papillon.jsx` (maqueta V3).
 *
 * Mariposas acuarela sobre un jardín rosa: la portada con la corona que late, el retrato en
 * un óvalo dentro del círculo de flores y mariposas, y cada bloque en un cristal esmerilado
 * con el texto sobre un halo blanco —mensaje, padres y padrinos, fecha con el reloj y la
 * cuenta atrás, recepción con la rosa de cristal y el plano, itinerario con sus piezas
 * rosas, canción, vestimenta, lluvia de sobres, confirmación y cierre—.
 */
export function XvPapillonView({ content, event, themes, slots, audioSrc, respondida }: ThemeProps) {
  const ROTULOS = themes.designs['xv-papillon']
  const { hero, quote, hosts, schedule, reception, map, itinerary, music, dressCode, notes, closing } = content
  const nombre = hero?.nameA ?? ''
  const serial = [hero?.eyebrow, hero?.serial].filter(Boolean).join(' ')
  const familia = hosts === undefined ? { padres: [], padrinos: [] } : anfitrionesXv(hosts, { madreDelante: true })
  const sobres = notes?.[0]
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const etiquetaLocal = event.locale === 'en' ? 'en-GB' : 'es-BO'
  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const dia = valida ? String(cuando.getDate()) : ''
  const mes = valida ? cuando.toLocaleDateString(etiquetaLocal, { month: 'long' }).replace(/^./, (letra) => letra.toUpperCase()) : ''
  const hora = valida ? `${String(cuando.getHours()).padStart(2, '0')}:${String(cuando.getMinutes()).padStart(2, '0')}` : ''
  const plazo =
    respondida || event.rsvpDeadline === null
      ? null
      : `${themes.rsvpBefore} ${new Intl.DateTimeFormat(etiquetaLocal, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${event.rsvpDeadline}T00:00:00Z`))}`
  const llegar = comoLlegar({ href: map?.href, coords: map?.coords }, [reception?.place, reception?.address].filter(Boolean).join(', '))

  const RANURAS = variablesDeRanuras(pielDeRanuras({ acento: P.oro, sobreAcento: P.blanco, tinta: P.tinta, display: SERIF, radio: 10 }))

  return (
    <article
      className="theme-pp-glow"
      style={{
        ...RANURAS,
        // Los dos botones iguales de su confirmación, transparentes con filete de oro.
        ['--rsvp-fondo' as string]: 'transparent',
        ['--rsvp-borde' as string]: P.oro,
        position: 'relative',
        backgroundColor: P.fondo,
        backgroundImage: `url(${themeAsset('xv-papillon', 'mariposas-rosas-2.avif')})`,
        backgroundSize: '100% auto',
        backgroundPosition: 'center top',
        backgroundRepeat: 'repeat-y',
        color: P.tinta,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      <PapillonCover
        bgAsset={themeAsset('xv-papillon', 'mariposas-rosas.avif')}
        crownAsset={themeAsset('xv-papillon', 'corona-pinki-sf.avif')}
        cristal={P.cristal}
        hint={themes.coverEnter}
        name={nombre}
        openLabel={themes.coverAria}
        oro={P.oro}
        serial={serial}
        title={ROTULOS.xvAnos}
      />

      {/* ── El retrato en su círculo de flores ── */}
      <div style={{ position: 'relative', padding: '54px 26px 30px', textAlign: 'center' }}>
        <Reveal>
          <div style={{ position: 'relative', width: 'calc(var(--ancho, 100vw) * 0.7)', height: 'calc(var(--ancho, 100vw) * 0.7)', maxWidth: 380, maxHeight: 380, margin: '0 auto' }}>
            <div style={{ position: 'absolute', left: '18%', right: '18%', top: '20%', bottom: '24%', borderRadius: '50%', overflow: 'hidden' }}>
              <PhotoSlot
                bg="transparent"
                border="none"
                color={P.tinta}
                height="100%"
                label={nombre}
                objectPosition="50% 25%"
                radius={0}
                src={hero?.portraitImageId === undefined ? themeAsset('xv-papillon', 'quinceanera-pinki.avif') : `/media/${hero.portraitImageId}`}
                width="100%"
              />
            </div>
            <Image
              alt=""
              aria-hidden
              fill
              sizes="380px"
              src={themeAsset('xv-papillon', 'circulo-pinki-sf.avif')}
              style={{ objectFit: 'contain', pointerEvents: 'none' }}
            />
          </div>
          <Tarjeta style={{ marginTop: 22, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontFamily: SANS, fontSize: 11, letterSpacing: '0.25em', color: P.tinta }}>
              <span>{hero?.eyebrow ?? ''}</span>
              <span style={{ color: P.oro, fontWeight: 500 }}>{hero?.serial ?? ''}</span>
            </div>
            <div style={{ marginTop: 8, fontFamily: SANS, fontWeight: 500, fontSize: 15, letterSpacing: '0.3em', color: P.oro }}>{ROTULOS.xvAnos}</div>
            <h1 style={{ fontFamily: CALIGRAFIA, fontWeight: 400, fontSize: 52, color: P.oro, marginTop: 4 }}>{nombre}</h1>
          </Tarjeta>
        </Reveal>
      </div>

      {/* ── El mensaje, los padres y los padrinos ── */}
      {quote === undefined && hosts === undefined ? null : (
        <Franja>
          {quote === undefined ? null : (
            <Reveal>
              <Tarjeta>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18.5, lineHeight: 1.8, textAlign: 'center', color: P.tinta }}>{quote.text}</p>
              </Tarjeta>
            </Reveal>
          )}
          {hosts === undefined ? null : (
            <Reveal delay={100}>
              <Tarjeta style={{ marginTop: 18, textAlign: 'center' }}>
                <div style={{ fontFamily: SANS, fontSize: 10.5, letterSpacing: '0.24em', color: P.oro }}>{hosts.label ?? ''}</div>
                {familia.padres.length === 0 ? null : (
                  <div style={{ marginTop: 12, fontFamily: SERIF, fontWeight: 600, fontSize: 17, color: P.tinta }}>{familia.padres.join(' & ')}</div>
                )}
                {familia.padrinos.length === 0 ? null : (
                  <>
                    <div aria-hidden style={{ width: 60, height: 1, background: P.oro, margin: '20px auto' }} />
                    <div style={{ fontFamily: SANS, fontSize: 10.5, letterSpacing: '0.24em', color: P.oro }}>{ROTULOS.padrinos}</div>
                    <div style={{ marginTop: 12, fontFamily: SERIF, fontWeight: 600, fontSize: 17, color: P.tinta }}>{familia.padrinos.join(' & ')}</div>
                  </>
                )}
              </Tarjeta>
            </Reveal>
          )}
        </Franja>
      )}

      {/* ── La fecha, el reloj y la cuenta atrás ── */}
      {schedule === undefined ? null : (
        <Franja>
          <Reveal>
            <Tarjeta style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 54, color: P.oro, lineHeight: 1 }}>{dia}</div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro, marginTop: 2 }}>{mes}</div>
              <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 12, letterSpacing: '0.25em', color: P.tintaSuave }}>{hora} {themes.hoursShort}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '18px 0' }}>
                <div aria-hidden style={{ width: 44, height: 1, background: P.oroClaro }} />
                <Image alt="" aria-hidden height={189} src={themeAsset('xv-papillon', 'reloj-pinki-sf.avif')} style={{ width: 189, height: 189, objectFit: 'contain' }} width={189} />
                <div aria-hidden style={{ width: 44, height: 1, background: P.oroClaro }} />
              </div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.rosaHonda }}>{themes.countdownPrefix.charAt(0).toUpperCase() + themes.countdownPrefix.slice(1).toLowerCase()}</div>
              <Countdown
                cellStyle={{ padding: '12px 2px', borderRadius: 10, background: P.rosaSuave }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                labelStyle={{ fontFamily: SANS, fontSize: 8, marginTop: 2, letterSpacing: '0.15em', color: P.tintaSuave }}
                rowStyle={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, color: P.oro }}
              />
            </Tarjeta>
          </Reveal>
        </Franja>
      )}

      {/* ── La recepción ── */}
      {reception === undefined ? null : (
        <Franja>
          <Reveal>
            <div style={{ textAlign: 'center', ...CRISTAL }}>
              <Image alt="" aria-hidden height={165} src={themeAsset('xv-papillon', 'rosa-pinki-sf.avif')} style={{ width: 165, height: 'auto', margin: '0 auto', display: 'block' }} width={165} />
              <div style={{ marginTop: 12, fontFamily: CALIGRAFIA, fontSize: '2.5rem', color: P.oro }}>{reception.label ?? themes.reception}</div>
              <div style={{ marginTop: 4, fontFamily: SERIF, fontSize: '1.2rem', color: P.tinta }}>{reception.place ?? ''}</div>
              {reception.time === undefined ? null : (
                <div style={{ marginTop: 4, fontFamily: SANS, fontSize: 11, letterSpacing: '0.2em', color: P.oro }}>{reception.time} {themes.hoursShort}</div>
              )}
              {map === undefined ? null : (
                <div style={{ marginTop: 16 }}>
                  <MapPreview
                    accent={P.rosaHonda}
                    border={P.oroClaro}
                    coords={map.coords ?? ''}
                    directionsLabel={themes.viewLocation}
                    href={map.href}
                    label={map.label ?? ''}
                    labelColor={P.oro}
                    pinDot={P.blanco}
                    respaldo={[reception.place, reception.address].filter(Boolean).join(', ')}
                  />
                </div>
              )}
              {llegar === null ? null : (
                <a
                  href={llegar}
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: 12,
                    width: '100%',
                    padding: '12px 0',
                    background: 'rgba(197,165,90,0.2)',
                    border: '1px solid rgba(197,165,90,0.5)',
                    borderRadius: 8,
                    color: P.oro,
                    fontFamily: SANS,
                    fontSize: 11,
                    letterSpacing: '0.2em',
                    textDecoration: 'none',
                  }}
                  target="_blank"
                >
                  📍 {themes.viewLocation}
                </a>
              )}
            </div>
          </Reveal>
        </Franja>
      )}

      {/* ── El itinerario ── */}
      {itinerary === undefined ? null : (
        <Franja centrada>
          <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro }}>{ROTULOS.itinerario}</div>
          <Reveal>
            <Tarjeta style={{ marginTop: 16, textAlign: 'left' }}>
              <div style={{ position: 'relative', paddingLeft: 8 }}>
                <div aria-hidden style={{ position: 'absolute', left: 30, top: 6, bottom: 6, width: 2, background: P.oro }} />
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {itinerary.map((fila, i) => {
                    const clave = (fila.imageId ?? ORDEN[i % ORDEN.length] ?? 'copa') as keyof typeof PIEZAS
                    const pieza = PIEZAS[clave] ?? PIEZAS.copa
                    return (
                      <li key={`${fila.time}-${fila.label}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0' }}>
                        <div style={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Image alt="" aria-hidden height={90} src={themeAsset('xv-papillon', pieza)} style={{ width: 90, height: 90, objectFit: 'contain' }} width={90} />
                        </div>
                        <div>
                          <div
                            style={{
                              fontFamily: SANS,
                              fontSize: '1.1rem',
                              letterSpacing: '0.1em',
                              color: P.oro,
                              fontWeight: 600,
                              textShadow: '0 0 15px rgba(255,255,255,0.8)',
                            }}
                          >
                            {fila.label}
                          </div>
                          <div style={{ fontFamily: SERIF, fontSize: '0.9rem', color: P.ciruela }}>{fila.time}</div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </Tarjeta>
          </Reveal>
        </Franja>
      )}

      {/* ── La canción ── */}
      {music === undefined ? null : (
        <Franja>
          <Reveal>
            <Tarjeta>
              <MusicPlayer
                accent={P.oro}
                artist={music.artist ?? ''}
                artistColor={P.tintaSuave}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.oro}
                playIconColor={P.blanco}
                textColor={P.tinta}
                track={music.track ?? ''}
                trackColor={P.tinta}
              />
            </Tarjeta>
          </Reveal>
        </Franja>
      )}

      {/* ── El código de vestimenta ── */}
      {dressCode === undefined ? null : (
        <Franja centrada>
          <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro }}>{dressCode.title ?? themes.dressCode}</div>
          {dressCode.note === undefined ? null : (
            <div style={{ fontFamily: SANS, fontSize: 11, letterSpacing: '0.24em', color: P.oro, marginTop: 4, textShadow: '0 0 20px rgba(255,255,255,0.9)' }}>{dressCode.note}</div>
          )}
          <Reveal>
            <Image
              alt=""
              aria-hidden
              height={350}
              src={themeAsset('xv-papillon', 'codigo-pinki-sf.avif')}
              style={{ width: 'calc(var(--ancho, 100vw) * 0.65)', maxWidth: 350, height: 'auto', margin: '16px auto 0', display: 'block' }}
              width={350}
            />
            <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 18 }}>
              {CARTA_DE_COLOR.map((muestra) => (
                <div key={muestra.nombre} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: muestra.color,
                      border: '2px solid rgba(197,165,90,0.4)',
                      boxShadow: '0 0 8px rgba(197,165,90,0.2)',
                    }}
                  />
                  <div style={{ marginTop: 6, fontFamily: SANS, fontSize: '0.65rem', color: P.gris }}>{muestra.nombre}</div>
                </div>
              ))}
            </div>
            <PaletaDeColores etiqueta={themes.suggestedColors} borde={P.oro} colores={dressCode.colors} />
          </Reveal>
        </Franja>
      )}

      {/* ── La lluvia de sobres ── */}
      {sobres === undefined ? null : (
        <Franja>
          <Reveal>
            <Tarjeta style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro }}>{sobres.title ?? themes.gifts}</div>
              {sobres.text === undefined ? null : (
                <div style={{ marginTop: 10, fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: P.tintaSuave, lineHeight: 1.7 }}>{sobres.text}</div>
              )}
              <div style={{ marginTop: 16, textAlign: 'left' }}>{slots.registry}</div>
            </Tarjeta>
          </Reveal>
        </Franja>
      )}

      {/* ── La confirmación ── */}
      <Franja centrada>
        <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro }}>{ROTULOS.confirmar}</div>
        {plazo === null ? null : <div style={{ marginTop: 4, fontFamily: SANS, fontSize: 12, color: P.tintaSuave }}>{plazo}</div>}
        <Reveal>
          <Tarjeta style={{ marginTop: 16, textAlign: 'left' }}>{slots.rsvp}</Tarjeta>
        </Reveal>
      </Franja>

      {slots.photos === undefined ? null : (
        <Franja centrada>
          <Reveal>{slots.photos}</Reveal>
        </Franja>
      )}

      <div style={{ padding: '0 22px' }}>
        <Reveal>
          <div>{slots.guestbook}</div>
        </Reveal>
        <div style={{ marginTop: 28 }}>{slots.pass}</div>
      </div>

      {/* ── El cierre ── */}
      <div style={{ position: 'relative', padding: '40px 22px 70px', textAlign: 'center' }}>
        <Reveal>
          <Tarjeta>
            {closing?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, lineHeight: 1.8, color: P.tinta }}>{closing.text}</p>
            )}
            <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 12, letterSpacing: '0.28em', color: P.oro }}>{ROTULOS.misXv}</div>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 56, color: P.oro, marginTop: 6 }}>{closing?.signature ?? nombre}</div>
            {hero?.serial === undefined ? null : (
              <div style={{ marginTop: 8, fontFamily: SANS, fontSize: 12, letterSpacing: '0.3em', color: P.tintaSuave }}>· {hero.serial} ·</div>
            )}
          </Tarjeta>
        </Reveal>
      </div>
    </article>
  )
}
