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
import { BohoCover } from './BohoCover'
import { CarruselDePerla } from './CarruselDePerla'
import { CARTA_DE_COLOR, PALETA as P } from './boda-boho.palette'

const SERIF = 'var(--font-spectral)'
const MONO = 'var(--font-jetbrains-mono)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Las seis fotografías del carrusel, en el orden de la maqueta. */
const CARRUSEL = ['pareja-1.avif', 'pareja-2.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif', 'pareja-6.avif'] as const

/** El icono de cada hito del itinerario, en su orden. */
const ICONOS = ['iglesia.avif', 'copas.avif', 'vals.avif', 'cena.avif', 'torta.avif', 'despedida.avif'] as const

/** Los iconos de línea negros de la maqueta, teñidos del café del diseño con su mismo filtro. */
const TENIDO_CAFE = 'brightness(0) saturate(100%) invert(28%) sepia(24%) saturate(1200%) hue-rotate(340deg) brightness(85%) contrast(90%)'

/** Las cajas de vidrio dorado de la cabecera, la cuenta atrás, la invitación y «solo adultos». */
const VIDRIO: React.CSSProperties = {
  background: 'rgba(201,169,110,0.08)',
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  border: `1.5px solid ${P.oro}`,
}

/** La sombra crema que despega el texto de la fotografía de fondo. */
const DESPEGA = '0 1px 2px rgba(255,248,230,0.6)'

/** El difuminado del retrato por los cuatro bordes. */
const MASCARA =
  'linear-gradient(to bottom, transparent 0%, black 15%, black 78%, transparent 100%), linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)'

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

/**
 * «Pampas y Flores Secas» — Sara & Óscar, de `wedding-variants-10.jsx` (`WeddingBohoPampas`).
 *
 * La Editorial boho: la fotografía de pampas con un velo crema de fondo en toda la
 * invitación, cajas de vidrio dorado, el retrato difuminado por los bordes, los iconos de
 * línea teñidos de café y el itinerario en rejilla de dos columnas.
 */
export function BodaBohoView({ content, event, dictionary, themes, slots, guestInfo, audioSrc }: ThemeProps) {
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
    gallery?.[indice]?.imageId === undefined ? themeAsset('boda-boho', archivo) : `/media/${gallery[indice].imageId}`,
  )

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.terracota, sobreAcento: '#ffffff', tinta: P.cafeHondo, display: SERIF, radio: 8 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        // Las píldoras del RSVP, algo más grandes que en las demás Editorial.
        ['--rsvp-py' as string]: '15.5px',
        ['--rsvp-fs' as string]: '11px',
        position: 'relative',
        color: P.cafe,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <BohoCover
        bgAsset={themeAsset('boda-boho', 'portada-boho.avif')}
        cta={themes.coverEnterShared}
        eyebrow={hero?.eyebrow ?? ''}
        initials={hero?.monogram ?? [inicial(hero?.nameA), inicial(hero?.nameB)].filter(Boolean).join(' ')}
        names={nombres}
        openLabel={themes.coverAria}
      />

      {/* El fondo: las pampas con su velo crema, fijas detrás de todo. */}
      <CapaFija
        style={{
          backgroundColor: P.crema,
          backgroundImage: `url(${themeAsset('boda-boho', 'portada-boho.avif')})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'top center',
        }}
        zIndex={-1}
      >
        <span style={{ position: 'absolute', inset: 0, background: 'rgba(245,237,227,0.48)' }} />
      </CapaFija>

      {/* ── La cabecera de revista, en su caja de vidrio ── */}
      <div style={{ padding: '22px 24px' }}>
        <div style={{ ...VIDRIO, textAlign: 'center', borderRadius: 12, padding: '18px 16px' }}>
          <p style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 200, letterSpacing: '0.04em', lineHeight: 0.95 }}>{ROTULOS.nuestraBoda}</p>
          <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 2 }}>· {nombres.toUpperCase()} ·</p>
          {fechaLarga === '' ? null : (
            <p style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600 }}>{fechaLarga}</p>
          )}
        </div>
      </div>

      {/* ── El retrato difuminado por los bordes, con los nombres encima ── */}
      <div style={{ position: 'relative', height: 560, overflow: 'hidden' }}>
        <Image
          alt=""
          aria-hidden
          fill
          sizes="480px"
          src={hero?.portraitImageId === undefined ? themeAsset('boda-boho', 'pareja-2.avif') : `/media/${hero.portraitImageId}`}
          style={{
            objectFit: 'cover',
            objectPosition: 'top center',
            WebkitMaskImage: MASCARA,
            WebkitMaskComposite: 'source-in',
            maskImage: MASCARA,
            maskComposite: 'intersect',
          }}
        />
        <div style={{ position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'left' }}>
          <h1
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontWeight: 200,
              fontSize: 64,
              lineHeight: 0.9,
              color: P.crema,
              textShadow: '0 4px 24px rgba(90,62,43,0.5)',
            }}
          >
            {hero?.nameA}
            {hero?.nameB === undefined ? null : (
              <>
                <br />
                <span style={{ fontStyle: 'normal', fontWeight: 400 }}>&amp; {hero.nameB}</span>
              </>
            )}
          </h1>
          {hero?.serial === undefined ? null : (
            <span
              style={{
                display: 'block',
                marginTop: 12,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.35em',
                color: P.beige,
                textShadow: '0 2px 12px rgba(90,62,43,0.5)',
              }}
            >
              {hero.serial}
            </span>
          )}
        </div>
      </div>

      {/* ── El reloj y la cuenta atrás ── */}
      {schedule === undefined ? null : (
        <>
          <Reveal>
            <div style={{ padding: '20px 24px 0' }}>
              <Arte ancho={130} estilo={{ margin: '0 auto' }} src={themeAsset('boda-boho', 'reloj.avif')} />
            </div>
          </Reveal>
          <Reveal>
            <div style={{ padding: '28px 24px' }}>
              <div style={{ ...VIDRIO, borderRadius: 12, padding: '18px 16px', textShadow: DESPEGA }}>
                <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', textAlign: 'center', fontWeight: 600 }}>{ROTULOS.faltan}</p>
                <Countdown
                  labelStyle={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.35em', fontWeight: 600, marginTop: 4 }}
                  labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                  rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 14 }}
                  targetISO={schedule.startsAt}
                  valueStyle={{ fontFamily: SERIF, fontSize: 52 }}
                />
              </div>
            </div>
          </Reveal>
        </>
      )}

      <div style={{ padding: '32px 24px 0' }}>
        {/* ── La frase y su firma ── */}
        {quote === undefined ? null : (
          <Reveal>
            <div style={{ padding: '0 24px' }}>
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 37, fontWeight: 500, lineHeight: 1.25, textShadow: '0 1px 3px rgba(255,248,230,0.6)', whiteSpace: 'pre-line' }}>
                {quote.text}
              </p>
              {hero?.nameB === undefined ? null : (
                <p style={{ marginTop: 10, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', textShadow: DESPEGA }}>— {hero.nameB.toUpperCase()}</p>
              )}
            </div>
          </Reveal>
        )}

        {/* ── La historia, con su capitular ── */}
        {historia?.title === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 28, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', textTransform: 'uppercase', textShadow: DESPEGA }}>{historia.title}</p>
          </Reveal>
        )}
        {historia?.text === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: historia.title === undefined ? 28 : 14, fontSize: 15.5, lineHeight: 1.65, textShadow: '0 1px 2px rgba(255,248,230,0.5)' }}>
              <span style={{ float: 'left', fontFamily: SERIF, fontSize: 76, fontWeight: 600, lineHeight: 0.8, paddingRight: 8 }}>{historia.text.slice(0, 1)}</span>
              {historia.text.slice(1)}
            </p>
          </Reveal>
        )}
      </div>

      {/* ── La invitación personal ── */}
      <Reveal>
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <p style={{ ...VIDRIO, fontFamily: SERIF, fontSize: 17, lineHeight: 1.9, maxWidth: '76%', margin: '0 auto', borderRadius: 12, padding: '18px 20px' }}>
            {ROTULOS.invitacion}
          </p>
          {guestInfo === undefined ? (
            <div style={{ marginTop: 20 }}>{slots.guest}</div>
          ) : (
            <>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, marginTop: 30 }}>{guestInfo.label}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 14, fontWeight: 600 }}>{ROTULOS.reservado}</p>
              <p style={{ fontFamily: SERIF, fontSize: 56, marginTop: 14 }}>{guestInfo.seats}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600 }}>{ROTULOS.pases}</p>
            </>
          )}
        </div>
      </Reveal>

      {/* ── Los padres y los padrinos ── */}
      {hosts === undefined ? null : (
        <Reveal>
          <div style={{ padding: '40px 24px', margin: '30px 0' }}>
            {hosts.label === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 31, fontWeight: 500, textAlign: 'center' }}>{hosts.label}</p>
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

      {/* ── Ceremonia y recepción ── */}
      <Reveal>
        <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
          {[
            { lugar: ceremony, icono: 'iglesia.avif' as const },
            { lugar: reception, icono: 'copas.avif' as const },
          ].map(({ lugar, icono }) =>
            lugar === undefined ? null : (
              <div
                key={icono}
                style={{
                  width: '100%',
                  maxWidth: 340,
                  background: 'rgba(245,237,227,0.25)',
                  border: '1.5px solid rgba(201,169,110,0.5)',
                  borderRadius: 16,
                  padding: '28px 8px 22px',
                  textAlign: 'center',
                  display: 'grid',
                  gridTemplateRows: '150px auto auto auto 1fr auto',
                  justifyItems: 'center',
                  rowGap: 16,
                }}
              >
                <Icono src={themeAsset('boda-boho', icono)} />
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 28, whiteSpace: 'nowrap' }}>{lugar.label ?? ''}</p>
                <p style={{ fontFamily: SERIF, fontSize: 33 }}>{lugar.time ?? ''}</p>
                <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{lugar.place ?? ''}</p>
                <span />
                {llegarA(lugar) === null ? (
                  <span />
                ) : (
                  <a
                    href={llegarA(lugar) ?? ''}
                    rel="noreferrer"
                    style={{
                      background: P.terracota,
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

      {/* ── El itinerario, en rejilla de dos ── */}
      {itinerary === undefined || itinerary.length === 0 ? null : (
        <div style={{ padding: '0 24px' }}>
          <Reveal>
            <p style={{ fontFamily: SERIF, fontSize: 51, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center' }}>
              {ROTULOS.itinerario}
              <span style={{ fontStyle: 'italic' }}>.</span>
            </p>
          </Reveal>
          <Reveal>
            <ol style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', rowGap: 40, columnGap: 10, listStyle: 'none', padding: 0 }}>
              {itinerary.map((fila, indice) => (
                <li key={`${fila.time}-${fila.label}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Icono retraso={indice * 0.15} src={themeAsset('boda-boho', ICONOS[indice % ICONOS.length] ?? 'vals.avif')} />
                  <span style={{ width: '100%', fontFamily: SERIF, fontSize: 24, marginTop: 10 }}>{fila.time}</span>
                  <span style={{ width: '100%', fontFamily: MONO, fontSize: 9.3, letterSpacing: '0.12em', marginTop: 6, lineHeight: 1.5, fontWeight: 600, textTransform: 'uppercase' }}>
                    {fila.label}
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      )}

      {/* ── El carrusel «Nosotros» ── */}
      <div style={{ padding: '44px 24px 0', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 62 }}>{ROTULOS.nosotros}</p>
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
                <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase' }}>{dressCode.title}</p>
              )}
              <p style={{ fontFamily: SERIF, fontSize: 51, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center' }}>
                {ROTULOS.vestimenta}
                <span style={{ fontStyle: 'italic' }}>{ROTULOS.vestimentaCursiva}</span>
              </p>
              <Arte ancho={620} flota estilo={{ width: '85%', margin: '26px auto' }} src={themeAsset('boda-boho', 'vestimenta.avif')} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, width: '58%', margin: '22px auto 0' }}>
                {(dressCode.colors ?? CARTA_DE_COLOR.map((c) => c.color)).map((color) => (
                  <span key={color} style={{ textAlign: 'center', flex: 1 }}>
                    <span style={{ display: 'block', width: '100%', aspectRatio: '1/1', background: color, border: '1px solid rgba(184,121,90,0.25)' }} />
                    <span style={{ display: 'block', marginTop: 3, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em' }}>
                      {(CARTA_DE_COLOR.find((c) => c.color === color.toLowerCase())?.nombre ?? '').toUpperCase()}
                    </span>
                  </span>
                ))}
              </div>
              {dressCode.note === undefined ? null : (
                <p style={{ marginTop: 14, fontSize: 13, fontStyle: 'italic', lineHeight: 1.6, textAlign: 'center' }}>{dressCode.note}</p>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Solo adultos ── */}
        {soloAdultos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 60, marginBottom: 20, padding: '0 10px' }}>
              <div style={{ ...VIDRIO, borderRadius: 16, padding: '30px 20px', textAlign: 'center' }}>
                <Arte ancho={260} flota estilo={{ margin: '0 auto' }} src={themeAsset('boda-boho', 'tacon-y-corbata.avif')} />
                <div style={{ maxWidth: '88%', margin: '16px auto 0' }}>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.7 }}>{soloAdultos.text}</p>
                  {soloAdultos.title === undefined ? null : (
                    <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', fontWeight: 700, marginTop: 14, textTransform: 'uppercase' }}>{soloAdultos.title}</p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── La mesa de regalos ── */}
        <Reveal>
          <div style={{ marginTop: 60, marginBottom: 20, textAlign: 'center' }}>
            <Arte ancho={240} flota estilo={{ margin: '0 auto' }} src={themeAsset('boda-boho', 'regalo.avif')} />
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, marginTop: 32 }}>{regalos?.title ?? ROTULOS.regalos}</p>
            {regalos?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.8, maxWidth: '72%', margin: '18px auto 0' }}>{regalos.text}</p>
            )}
            <div style={{ marginTop: 22 }}>{slots.registry}</div>
          </div>
        </Reveal>

        {/* ── La canción ── */}
        {cancion === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <MusicPlayer
                accent={P.terracota}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.terracota}
                playIconColor="#ffffff"
                textColor={P.cafe}
                track={music?.track ?? ''}
                trackColor={P.cafe}
              />
            </div>
          </Reveal>
        )}

        {/* ── Confirmación ── */}
        <Reveal>
          <div style={{ marginTop: 40 }}>
            <p style={{ fontFamily: SERIF, fontSize: 35, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center' }}>
              {ROTULOS.confirma}
              <span style={{ fontStyle: 'italic' }}>{ROTULOS.confirmaCursiva}</span>
            </p>
            <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
          </div>
        </Reveal>

        {/* ── Comparte tus fotos, con su cámara: solo si el plan trae las fotos de invitados ── */}
        {slots.photos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 50, padding: '32px 24px', textAlign: 'center' }}>
              <Arte ancho={225} flota estilo={{ margin: '0 auto' }} src={themeAsset('boda-boho', 'camara.avif')} />
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, marginTop: 20 }}>{dictionary.photosTitle}</p>
              <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.8, maxWidth: '72%', margin: '18px auto 0' }}>{dictionary.photosIntro}</p>
              <div style={{ marginTop: 22 }}>{slots.photos}</div>
            </div>
          </Reveal>
        )}

        {/* ── El libro de firmas ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 40 }}>{ROTULOS.firmas}</p>
            <div style={{ marginTop: 18 }}>{slots.guestbook}</div>
          </div>
        </Reveal>

        {/* ── El cierre ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '64px 24px', textAlign: 'center' }}>
            {closing?.text === undefined ? null : <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 33, fontWeight: 500 }}>{closing.text}</p>}
            <p style={{ marginTop: 20, fontFamily: MONO, fontSize: 16, letterSpacing: '0.35em', fontWeight: 700, textTransform: 'uppercase' }}>{closing?.signature ?? nombres}</p>
            <div style={{ marginTop: 28 }}>{slots.pass}</div>
          </div>
        </Reveal>
      </div>
    </article>
  )
}

/** Un icono de línea de 150 px, teñido de café y flotando; `retraso` desfasa los del itinerario. */
function Icono({ src, retraso = 0 }: { readonly src: string; readonly retraso?: number }) {
  return (
    <span className="theme-flota" style={{ position: 'relative', display: 'block', width: 150, height: 150, margin: '0 auto', animationDelay: `${retraso}s` }}>
      <Image alt="" aria-hidden fill sizes="150px" src={src} style={{ objectFit: 'contain', filter: TENIDO_CAFE }} />
    </span>
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
      <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', fontWeight: 600 }}>{titulo}</p>
      <p style={{ fontFamily: SERIF, fontSize: 17.5, marginTop: 10, lineHeight: 1.6 }}>
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
