import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { CapaFija } from '../kit/CapaFija'
import { Countdown } from '../kit/Countdown'
import { MusicPlayer } from '../kit/MusicPlayer'
import { Reveal } from '../kit/Reveal'
import { CarruselDePerla } from './CarruselDePerla'
import { PerlaCover } from './PerlaCover'
import { CARTA_DE_COLOR, PALETA as P } from './boda-perla.palette'

const SERIF = 'var(--font-spectral)'
const MONO = 'var(--font-jetbrains-mono)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Las cinco fotografías del carrusel, en el orden de la maqueta. */
const CARRUSEL = ['pareja-1.avif', 'pareja-2.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif'] as const

/** Las dieciséis hojas blancas que caen sobre la invitación, por encima de todo. */
const HOJAS = Array.from({ length: 16 }, (_, i) => ({
  izquierda: (i * 6.4) % 100,
  tamano: 9 + (i % 5) * 3,
  duracion: 8 + (i % 7) * 2,
  retraso: -(i * 0.9),
  giro: (i * 23) % 360,
}))

const ROTULOS = {
  nuestraBoda: 'NUESTRA BODA',
  faltan: '· FALTAN ·',
  invitacion: 'Nuestro gran día se aproxima y nos encantaría que formaras parte de él.',
  reservado: 'HEMOS RESERVADO PARA TI',
  pases: 'PASES',
  padresNovia: 'PADRES DE LA NOVIA',
  padresNovio: 'PADRES DEL NOVIO',
  padrinos: 'PADRINOS',
  verUbicacion: 'VER UBICACIÓN',
  itinerario: 'Itinerario',
  nosotros: 'Nosotros',
  vestimenta: 'Código de ',
  vestimentaCursiva: 'vestimenta.',
  regalos: 'Mesa de regalos',
  confirma: 'Confirma tu ',
  confirmaCursiva: 'asistencia.',
  firmas: 'Déjanos un mensaje',
} as const

/** La inicial de un nombre, en mayúscula y sin tilde: el monograma de «Óscar» es «O». */
const inicial = (nombre: string | undefined): string =>
  (nombre ?? '').trim().slice(0, 1).normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()

/** La tarjeta blanca translúcida con filete perla de ceremonia, recepción y «solo adultos». */
const TARJETA: React.CSSProperties = { background: 'rgba(255,255,255,0.55)', border: `1.5px solid ${P.perla}`, borderRadius: 16 }

/**
 * «Marco Perlado» — Emma & Gael, de `wedding-variants-8.jsx` (`WeddingEditorialPearl`).
 *
 * La Editorial en marfil: el marco de flores blancas y perlas de fondo en toda la invitación,
 * hojas blancas cayendo por encima, el retrato enmarcado, las piezas de arte flotando y el
 * itinerario en zigzag a los dos lados de un hilo con rombos.
 */
export function BodaPerlaView({ content, event, dictionary, themes, slots, guestInfo, audioSrc }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, dressCode, notes, gallery, music, closing } = content

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const fechaLarga =
    cuando === null || Number.isNaN(cuando.getTime())
      ? ''
      : cuando.toLocaleDateString(etiquetaLocal, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const nombres = [hero?.nameA, hero?.nameB].filter((nombre) => nombre !== undefined && nombre !== '').join(' & ')
  const papeles = hosts === undefined ? { novia: [], novio: [], padrinos: [] } : anfitrionesBoda(hosts, { madreDelante: true })
  const historia = notes?.[0]
  const soloAdultos = notes?.[1]
  const regalos = notes?.[2]

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  const fotos = CARRUSEL.map((archivo, indice) =>
    gallery?.[indice]?.imageId === undefined ? themeAsset('boda-perla', archivo) : `/media/${gallery[indice].imageId}`,
  )

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.oroBoton, sobreAcento: '#ffffff', tinta: P.tinta, display: SERIF, radio: 8 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        // Las píldoras del RSVP, algo más grandes que en las demás Editorial.
        ['--rsvp-py' as string]: '15.5px',
        ['--rsvp-fs' as string]: '11px',
        position: 'relative',
        color: P.cuerpo,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <PerlaCover
        bgAsset={themeAsset('boda-perla', 'portada-perla.avif')}
        cta={themes.coverEnterShared}
        eyebrow={hero?.eyebrow ?? ''}
        fecha={fechaLarga}
        initials={hero?.monogram ?? `${inicial(hero?.nameA)}${inicial(hero?.nameB)}`}
        names={[hero?.nameA, hero?.nameB].filter(Boolean).join(' ')}
        openLabel={themes.coverAria}
      />

      {/* El fondo: el marco perlado, repetido hacia abajo, como en la maqueta. */}
      <CapaFija
        style={{
          backgroundColor: P.marfil,
          backgroundImage: `url(${themeAsset('boda-perla', 'portada-perla.avif')})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'top center',
        }}
        zIndex={-1}
      />

      {/* Las hojas blancas, por encima de todo. */}
      <CapaFija zIndex={50}>
        {HOJAS.map((hoja) => (
          <span
            className="theme-quieto-si-reduce"
            key={hoja.izquierda}
            style={{
              position: 'absolute',
              top: '-6%',
              left: `${hoja.izquierda}%`,
              width: hoja.tamano,
              height: hoja.tamano * 2.2,
              opacity: 0.3,
              transform: `rotate(${hoja.giro}deg)`,
              animation: `theme-petalFall ${hoja.duracion}s linear ${hoja.retraso}s infinite`,
            }}
          >
            <svg height="100%" viewBox="0 0 24 52" width="100%">
              <path d="M12 0 C22 12 22 40 12 52 C2 40 2 12 12 0 Z" fill="rgba(255,255,255,0.5)" />
              <line stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" x1="12" x2="12" y1="2" y2="50" />
            </svg>
          </span>
        ))}
      </CapaFija>

      {/* ── La cabecera de revista ── */}
      <div style={{ padding: '22px 24px', borderBottom: `1.5px solid ${P.perla}` }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 200, letterSpacing: '0.04em', lineHeight: 0.95 }}>{ROTULOS.nuestraBoda}</p>
          <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 2 }}>· {nombres.toUpperCase()} ·</p>
          {fechaLarga === '' ? null : (
            <p style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600 }}>{fechaLarga}</p>
          )}
        </div>
      </div>

      {/* ── El retrato enmarcado, con el fundido y los nombres encima ── */}
      <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
        <span
          style={{
            position: 'absolute',
            top: 24,
            bottom: 76,
            width: '72%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: 10,
            border: `1.5px solid ${P.perla}`,
            overflow: 'hidden',
          }}
        >
          <Image
            alt=""
            aria-hidden
            fill
            sizes="340px"
            src={hero?.portraitImageId === undefined ? themeAsset('boda-perla', 'retrato.avif') : `/media/${hero.portraitImageId}`}
            style={{ objectFit: 'cover' }}
          />
        </span>
        <span
          aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140, background: `linear-gradient(180deg, transparent 0%, ${P.sombra} 90%)` }}
        />
        <div style={{ position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'left' }}>
          <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 200, fontSize: 64, lineHeight: 0.9, color: P.crema }}>
            {hero?.nameA}
            {hero?.nameB === undefined ? null : (
              <>
                <br />
                <span style={{ fontStyle: 'normal', fontWeight: 400 }}>&amp; {hero.nameB}</span>
              </>
            )}
          </h1>
          {hero?.serial === undefined ? null : (
            <span style={{ display: 'block', marginTop: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.oroClaro }}>{hero.serial}</span>
          )}
        </div>
      </div>

      {/* ── El reloj y la cuenta atrás ── */}
      {schedule === undefined ? null : (
        <>
          <Reveal>
            <div style={{ padding: '20px 24px 0' }}>
              <Arte ancho={96} estilo={{ margin: '0 auto' }} src={themeAsset('boda-perla', 'reloj.avif')} />
            </div>
          </Reveal>
          <Reveal>
            <div style={{ padding: '28px 24px', borderTop: `1.5px solid ${P.perla}`, borderBottom: `1.5px solid ${P.perla}` }}>
              <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', textAlign: 'center', color: P.oliva, fontWeight: 600 }}>{ROTULOS.faltan}</p>
              <Countdown
                labelStyle={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.35em', color: P.oliva, fontWeight: 600, marginTop: 4 }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 14 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: SERIF, fontSize: 52, color: P.cafe }}
              />
            </div>
          </Reveal>
        </>
      )}

      <div style={{ padding: '32px 24px 0' }}>
        {/* ── La frase y su firma ── */}
        {quote === undefined ? null : (
          <Reveal>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 37, fontWeight: 500, lineHeight: 1.25, padding: '0 24px', color: P.guinda, whiteSpace: 'pre-line' }}>
              {quote.text}
            </p>
            {hero?.nameB === undefined ? null : (
              <p style={{ marginTop: 10, padding: '0 24px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', color: P.bronce }}>— {hero.nameB.toUpperCase()}</p>
            )}
          </Reveal>
        )}

        {/* ── La historia, con su capitular ── */}
        {historia?.title === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 28, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', color: P.bronce, textTransform: 'uppercase' }}>{historia.title}</p>
          </Reveal>
        )}
        {historia?.text === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: historia.title === undefined ? 28 : 14, fontSize: 15.5, lineHeight: 1.65, color: P.tinta }}>
              <span style={{ float: 'left', fontFamily: SERIF, fontSize: 76, fontWeight: 600, lineHeight: 0.8, paddingRight: 8, color: P.bronce }}>
                {historia.text.slice(0, 1)}
              </span>
              {historia.text.slice(1)}
            </p>
          </Reveal>
        )}
      </div>

      {/* ── La invitación personal ── */}
      <Reveal>
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: SERIF,
              fontSize: 17,
              lineHeight: 1.9,
              maxWidth: '76%',
              margin: '0 auto',
              color: '#2c2c2c',
              background: 'rgba(255,255,255,0.6)',
              borderRadius: 12,
              padding: '18px 20px',
            }}
          >
            {ROTULOS.invitacion}
          </p>
          {guestInfo === undefined ? (
            <div style={{ marginTop: 20 }}>{slots.guest}</div>
          ) : (
            <>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.cafe, marginTop: 30 }}>{guestInfo.label}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 14, color: P.oliva, fontWeight: 600 }}>{ROTULOS.reservado}</p>
              <p style={{ fontFamily: SERIF, fontSize: 56, color: P.cafe, marginTop: 14 }}>{guestInfo.seats}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 8, color: P.oliva, fontWeight: 600 }}>{ROTULOS.pases}</p>
            </>
          )}
        </div>
      </Reveal>

      {/* ── Los padres y los padrinos ── */}
      {hosts === undefined ? null : (
        <Reveal>
          <div style={{ padding: '40px 24px', margin: '30px 0', borderTop: `2px solid ${P.perla}`, borderBottom: `2px solid ${P.perla}` }}>
            {hosts.label === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 31, fontWeight: 500, textAlign: 'center', color: P.cafe }}>{hosts.label}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 32 }}>
              <Familia nombres={papeles.novia} titulo={ROTULOS.padresNovia} />
              <Familia nombres={papeles.novio} titulo={ROTULOS.padresNovio} />
            </div>
            {papeles.padrinos.length === 0 ? null : (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Familia nombres={papeles.padrinos} titulo={ROTULOS.padrinos} />
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Ceremonia y recepción, en sus tarjetas perladas ── */}
      <Reveal>
        <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
          {[
            { lugar: ceremony, icono: 'iglesia.avif' as const, ancho: 184 },
            { lugar: reception, icono: 'copas.avif' as const, ancho: 110 },
          ].map(({ lugar, icono, ancho }) =>
            lugar === undefined ? null : (
              <div
                key={icono}
                style={{
                  ...TARJETA,
                  width: '100%',
                  maxWidth: 340,
                  padding: '28px 8px 22px',
                  textAlign: 'center',
                  display: 'grid',
                  gridTemplateRows: '184px auto auto auto 1fr auto',
                  justifyItems: 'center',
                  rowGap: 16,
                }}
              >
                <span className="theme-flota" style={{ position: 'relative', display: 'block', width: ancho, height: ancho }}>
                  <Image alt="" aria-hidden fill sizes={`${ancho}px`} src={themeAsset('boda-perla', icono)} style={{ objectFit: 'contain' }} />
                </span>
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.cafe, whiteSpace: 'nowrap' }}>{lugar.label ?? ''}</p>
                <p style={{ fontFamily: SERIF, fontSize: 33, color: P.cafe }}>{lugar.time ?? ''}</p>
                <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', color: P.tinta, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                  {lugar.place ?? ''}
                </p>
                <span />
                {llegarA(lugar) === null ? (
                  <span />
                ) : (
                  <a
                    href={llegarA(lugar) ?? ''}
                    rel="noreferrer"
                    style={{
                      background: P.oroBoton,
                      color: '#ffffff',
                      fontFamily: MONO,
                      fontSize: 9.5,
                      letterSpacing: '0.15em',
                      fontWeight: 700,
                      padding: '11px 16px',
                      borderRadius: 24,
                      whiteSpace: 'nowrap',
                      textDecoration: 'none',
                    }}
                    target="_blank"
                  >
                    {ROTULOS.verUbicacion}
                  </a>
                )}
              </div>
            ),
          )}
        </div>
      </Reveal>

      {/* ── El itinerario en zigzag, a los dos lados de un hilo ── */}
      {itinerary === undefined || itinerary.length === 0 ? null : (
        <div style={{ padding: '0 24px' }}>
          <Reveal>
            <p style={{ fontFamily: SERIF, fontSize: 51, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.cafe }}>
              {ROTULOS.itinerario}
              <span style={{ fontStyle: 'italic' }}>.</span>
            </p>
          </Reveal>
          <Reveal>
            <div style={{ marginTop: 46, position: 'relative' }}>
              <span aria-hidden style={{ position: 'absolute', left: '50%', top: 6, bottom: 6, width: 1, background: P.perla }} />
              <ol style={{ display: 'flex', flexDirection: 'column', gap: 40, listStyle: 'none', margin: 0, padding: 0 }}>
                {itinerary.map((fila, indice) => {
                  const hora = <span style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.cafe }}>{fila.time}</span>
                  const momento = (
                    <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.16em', color: P.oliva, fontWeight: 600, textTransform: 'uppercase' }}>
                      {fila.label}
                    </span>
                  )
                  const par = indice % 2 === 0
                  return (
                    <li key={`${fila.time}-${fila.label}`} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', alignItems: 'center' }}>
                      <span style={{ textAlign: 'right', paddingRight: 18 }}>{par ? hora : momento}</span>
                      <span
                        aria-hidden
                        style={{ display: 'block', width: 9, height: 9, background: P.perla, transform: 'rotate(45deg)', margin: '0 auto', boxShadow: `0 0 0 3px ${P.marfil}` }}
                      />
                      <span style={{ textAlign: 'left', paddingLeft: 18 }}>{par ? momento : hora}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </Reveal>
        </div>
      )}

      {/* ── El carrusel «Nosotros» ── */}
      <div style={{ padding: '44px 24px 0', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 62, color: P.cafe }}>{ROTULOS.nosotros}</p>
        </Reveal>
        <Reveal>
          <CarruselDePerla
            borde="#d4af6a"
            flechaFondo="rgba(10,22,40,0.7)"
            flechaTinta="#ffffff"
            fotos={fotos}
            labels={{ anterior: themes.galleryPrev, siguiente: themes.galleryNext }}
            puntoActivo="#d4af6a"
            puntoInactivo="rgba(255,255,255,0.4)"
            sombra="rgba(212,175,106,0.3)"
          />
        </Reveal>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* ── El código de vestimenta ── */}
        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              {dressCode.title === undefined ? null : (
                <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', color: P.oliva, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase' }}>
                  {dressCode.title}
                </p>
              )}
              <p style={{ fontFamily: SERIF, fontSize: 51, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.cafe }}>
                {ROTULOS.vestimenta}
                <span style={{ fontStyle: 'italic' }}>{ROTULOS.vestimentaCursiva}</span>
              </p>
              <Arte ancho={620} flota estilo={{ width: '85%', margin: '26px auto' }} src={themeAsset('boda-perla', 'vestimenta.avif')} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, width: '58%', margin: '22px auto 0' }}>
                {(dressCode.colors ?? CARTA_DE_COLOR.map((c) => c.color)).map((color) => (
                  <span key={color} style={{ textAlign: 'center', flex: 1 }}>
                    <span style={{ display: 'block', width: '100%', aspectRatio: '1/1', background: color, border: '1px solid rgba(212,182,120,0.25)' }} />
                    <span style={{ display: 'block', marginTop: 3, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: P.guinda }}>
                      {(CARTA_DE_COLOR.find((c) => c.color === color.toLowerCase())?.nombre ?? '').toUpperCase()}
                    </span>
                  </span>
                ))}
              </div>
              {dressCode.note === undefined ? null : (
                <p style={{ marginTop: 14, fontSize: 13, fontStyle: 'italic', color: P.guinda, lineHeight: 1.6, textAlign: 'center' }}>{dressCode.note}</p>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Solo adultos ── */}
        {soloAdultos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 60, marginBottom: 20, padding: '0 10px' }}>
              <div style={{ ...TARJETA, padding: '30px 20px', textAlign: 'center' }}>
                <Arte ancho={156} flota estilo={{ margin: '0 auto' }} src={themeAsset('boda-perla', 'tacon-y-corbata.avif')} />
                <div style={{ maxWidth: '88%', margin: '16px auto 0' }}>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.7, color: P.guinda }}>{soloAdultos.text}</p>
                  {soloAdultos.title === undefined ? null : (
                    <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', color: P.guindaVivo, fontWeight: 700, marginTop: 14, textTransform: 'uppercase' }}>
                      {soloAdultos.title}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── La mesa de regalos ── */}
        <Reveal>
          <div style={{ marginTop: 60, marginBottom: 20, textAlign: 'center' }}>
            <Arte ancho={240} flota estilo={{ margin: '0 auto' }} src={themeAsset('boda-perla', 'regalo.avif')} />
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.cafe, marginTop: 32 }}>{regalos?.title ?? ROTULOS.regalos}</p>
            {regalos?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.8, color: P.tinta, maxWidth: '72%', margin: '18px auto 0' }}>{regalos.text}</p>
            )}
            <div style={{ marginTop: 22 }}>{slots.registry}</div>
          </div>
        </Reveal>

        {/* ── La canción ── */}
        {cancion === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <MusicPlayer
                accent={P.oroBoton}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.oroBoton}
                playIconColor="#ffffff"
                textColor={P.tinta}
                track={music?.track ?? ''}
                trackColor={P.cafe}
              />
            </div>
          </Reveal>
        )}

        {/* ── Confirmación ── */}
        <Reveal>
          <div style={{ marginTop: 40 }}>
            <p style={{ fontFamily: SERIF, fontSize: 35, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.cafe }}>
              {ROTULOS.confirma}
              <span style={{ fontStyle: 'italic' }}>{ROTULOS.confirmaCursiva}</span>
            </p>
            <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
          </div>
        </Reveal>

        {/* ── Comparte tus fotos, con su cámara: solo si el plan trae las fotos de invitados ── */}
        {slots.photos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 50, padding: '32px 24px', borderTop: `1.5px solid ${P.perla}`, textAlign: 'center' }}>
              <Arte ancho={225} flota estilo={{ margin: '0 auto' }} src={themeAsset('boda-perla', 'camara.avif')} />
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.cafe, marginTop: 20 }}>{dictionary.photosTitle}</p>
              <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.8, maxWidth: '72%', margin: '18px auto 0', color: P.tinta }}>{dictionary.photosIntro}</p>
              <div style={{ marginTop: 22 }}>{slots.photos}</div>
            </div>
          </Reveal>
        )}

        {/* ── El libro de firmas ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '32px 0', borderTop: `1.5px solid ${P.perla}`, textAlign: 'center' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.cafe }}>{ROTULOS.firmas}</p>
            <div style={{ marginTop: 18 }}>{slots.guestbook}</div>
          </div>
        </Reveal>

        {/* ── El cierre ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '64px 24px', borderTop: `2px solid ${P.perla}`, textAlign: 'center' }}>
            {closing?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 33, fontWeight: 500, color: P.cafe }}>{closing.text}</p>
            )}
            <p style={{ marginTop: 20, fontFamily: MONO, fontSize: 16, letterSpacing: '0.35em', color: P.oliva, fontWeight: 700, textTransform: 'uppercase' }}>
              {closing?.signature ?? nombres}
            </p>
            <div style={{ marginTop: 28 }}>{slots.pass}</div>
          </div>
        </Reveal>
      </div>
    </article>
  )
}

/** Una pieza de arte del diseño, con su ancho máximo; `flota` la mece como en la maqueta. */
function Arte({
  src,
  ancho,
  flota = false,
  estilo,
}: {
  readonly src: string
  readonly ancho: number
  readonly flota?: boolean
  readonly estilo?: React.CSSProperties
}) {
  return (
    <span className={flota ? 'theme-flota' : undefined} style={{ display: 'block', maxWidth: ancho, ...estilo }}>
      <Image alt="" aria-hidden height={ancho} sizes={`${ancho}px`} src={src} style={{ width: '100%', height: 'auto', display: 'block' }} width={ancho} />
    </span>
  )
}

/** Un grupo de anfitriones: su rótulo y sus nombres. */
function Familia({ titulo, nombres }: { readonly titulo: string; readonly nombres: readonly string[] }) {
  if (nombres.length === 0) return null
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', color: P.oliva, fontWeight: 600 }}>{titulo}</p>
      <p style={{ fontFamily: SERIF, fontSize: 17.5, color: P.tinta, marginTop: 10, lineHeight: 1.6 }}>
        {nombres.map((nombre, indice) => (
          <span key={nombre}>
            {indice === 0 ? null : <br />}
            {nombre}
          </span>
        ))}
      </p>
    </div>
  )
}
