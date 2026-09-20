import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MusicPlayer } from '../kit/MusicPlayer'
import { Reveal } from '../kit/Reveal'
import { CarruselDePerla } from './CarruselDePerla'
import { RoyalCover } from './RoyalCover'
import { CARTA_DE_COLOR, PALETA as P } from './boda-royal.palette'

const SERIF = 'var(--font-spectral)'
const MONO = 'var(--font-jetbrains-mono)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Las cinco fotografías del carrusel, en el orden de la maqueta. */
const CARRUSEL = ['pareja-1.avif', 'pareja-2.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif'] as const

/** El icono de cada hito del itinerario, en su orden. */
const ICONOS = ['iglesia.avif', 'mesero.avif', 'vals.avif', 'cena.avif', 'torta.avif', 'despedida.avif'] as const

/** Los treinta y dos pétalos rosados que caen sobre la invitación. */
const PETALOS = Array.from({ length: 32 }, (_, i) => ({
  izquierda: (i * 3.2) % 100,
  tamano: 9 + (i % 5) * 4,
  duracion: 8 + (i % 7) * 2,
  retraso: -(i * 0.9),
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
  fotos: 'Comparte tus fotos',
  firmas: 'Déjanos un mensaje',
} as const

/**
 * «Royal Blush» — Renata & Pablo, de `wedding-variants-6.jsx`
 * (`WeddingEditorialRoyalBlush`).
 *
 * La hermana en rosa palo y borgoña de la familia Editorial: la fotografía del palacio se
 * repite de fondo en toda la invitación, los bloques se separan con filetes de oro y el
 * itinerario va en una rejilla de tres columnas con un medallón por hito.
 */
export function BodaRoyalView({ content, event, themes, slots, guestInfo, audioSrc }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, dressCode, notes, gallery, music, closing } = content

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const fechaLarga =
    cuando === null || Number.isNaN(cuando.getTime())
      ? ''
      : cuando.toLocaleDateString(etiquetaLocal, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const nombres = [hero?.nameA, hero?.nameB].filter((nombre) => nombre !== undefined && nombre !== '').join(' & ')
  const papeles = hosts === undefined ? { novia: [], novio: [], padrinos: [] } : anfitrionesBoda(hosts)
  const historia = notes?.[0]
  const soloAdultos = notes?.[1]
  const regalos = notes?.[2]

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  const fotos = CARRUSEL.map((archivo, indice) =>
    gallery?.[indice]?.imageId === undefined ? themeAsset('boda-royal', archivo) : `/media/${gallery[indice].imageId}`,
  )

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.oroClaro, sobreAcento: '#ffffff', tinta: P.borgona, display: SERIF, radio: 8 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        color: P.tinta,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <RoyalCover
        bgAsset={themeAsset('boda-royal', 'portada-royal.avif')}
        cta={themes.coverEnterShared}
        eyebrow={hero?.eyebrow ?? ''}
        fecha={fechaLarga}
        names={nombres}
        openLabel={themes.coverAria}
        ringsAsset={themeAsset('boda-royal', 'anillos.avif')}
      />

      {/* El fondo: la misma fotografía, repetida hacia abajo, como en la maqueta. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundImage: `url(${themeAsset('boda-royal', 'portada-royal.avif')})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'top center',
        }}
      />

      {/* Los pétalos rosados. */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
        {PETALOS.map((petalo) => (
          <span
            key={petalo.izquierda}
            style={{
              position: 'absolute',
              top: '-6%',
              left: `${petalo.izquierda}%`,
              width: petalo.tamano,
              height: petalo.tamano * 0.8,
              borderRadius: '50% 0 50% 50%',
              background: 'rgba(245,182,193,0.55)',
              boxShadow: '0 0 4px rgba(245,182,193,0.4)',
              animation: `theme-petalFall ${petalo.duracion}s linear ${petalo.retraso}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── La cabecera de revista ── */}
      <div style={{ padding: '22px 24px', borderBottom: `1.5px solid ${P.oro}` }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 200, lineHeight: 0.95, color: P.borgona }}>{ROTULOS.nuestraBoda}</p>
          <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 2, color: P.medio }}>· {nombres.toUpperCase()} ·</p>
          {fechaLarga === '' ? null : (
            <p style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600 }}>{fechaLarga}</p>
          )}
        </div>
      </div>

      {/* ── El retrato grande, con el degradado y los nombres encima ── */}
      <div style={{ position: 'relative', height: 640, overflow: 'hidden' }}>
        <Image
          alt=""
          aria-hidden
          fill
          sizes="480px"
          src={hero?.portraitImageId === undefined ? themeAsset('boda-royal', 'pareja-1.avif') : `/media/${hero.portraitImageId}`}
          style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
        />
        <span
          aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 180, background: `linear-gradient(180deg, transparent 0%, ${P.rosa} 92%)` }}
        />
        <span style={{ position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'left' }}>
          <span style={{ display: 'block', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 200, fontSize: 64, lineHeight: 0.9, color: P.borgona }}>
            {hero?.nameA}
            {hero?.nameB === undefined ? null : (
              <>
                <br />
                <span style={{ fontStyle: 'normal', fontWeight: 400 }}>&amp; {hero.nameB}</span>
              </>
            )}
          </span>
          {hero?.serial === undefined ? null : (
            <span style={{ display: 'block', marginTop: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.oroHondo }}>
              {hero.serial}
            </span>
          )}
        </span>
      </div>

      {/* ── La cuenta atrás ── */}
      {schedule === undefined ? null : (
        <Reveal>
          <div
            style={{
              padding: '28px 16px',
              margin: '28px 20px 0',
              borderTop: `1.5px solid ${P.oro}`,
              borderBottom: `1.5px solid ${P.oro}`,
              background: 'rgba(255,245,242,0.7)',
              borderRadius: 16,
            }}
          >
            <Arte ancho={150} estilo={{ margin: '0 auto 18px' }} src={themeAsset('boda-royal', 'reloj.avif')} />
            <p style={{ fontFamily: MONO, fontSize: 12.6, letterSpacing: '0.35em', textAlign: 'center', color: P.borgona, fontWeight: 700 }}>
              {ROTULOS.faltan}
            </p>
            <Countdown
              cellStyle={{ padding: '0 4px' }}
              labelStyle={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.3em', color: P.oro, fontWeight: 700, marginTop: 4 }}
              labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
              rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 14 }}
              targetISO={schedule.startsAt}
              valueStyle={{ fontFamily: SERIF, fontSize: 44, fontWeight: 700, color: P.borgonaHondo }}
            />
          </div>
        </Reveal>
      )}

      {/* ── La frase y la historia, en su caja rosada ── */}
      <div style={{ padding: '32px 24px 0' }}>
        <div style={{ maxWidth: '70%', margin: '0 auto', background: 'rgba(245,224,224,0.6)', borderRadius: 20, padding: '28px 20px' }}>
          {quote === undefined ? null : (
            <Reveal>
              <p
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 33,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  textAlign: 'center',
                  color: P.borgona,
                  whiteSpace: 'pre-line',
                }}
              >
                {quote.text}
              </p>
            </Reveal>
          )}
          {historia?.title === undefined ? null : (
            <Reveal>
              <p style={{ marginTop: 18, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', color: P.borgonaHondo, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>
                {historia.title}
              </p>
            </Reveal>
          )}
          {historia?.text === undefined ? null : (
            <Reveal>
              <p style={{ marginTop: 18, fontSize: 13, lineHeight: 1.6, color: P.tinta }}>
                <span style={{ float: 'left', fontFamily: SERIF, fontSize: 60, fontWeight: 600, lineHeight: 0.8, paddingRight: 6, color: P.oro }}>
                  {historia.text.slice(0, 1)}
                </span>
                {historia.text.slice(1)}
              </p>
            </Reveal>
          )}
        </div>
      </div>

      {/* ── La invitación personal ── */}
      <Reveal>
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.8, maxWidth: '76%', margin: '0 auto', color: P.tinta }}>{ROTULOS.invitacion}</p>
          {guestInfo === undefined ? (
            <div style={{ marginTop: 20 }}>{slots.guest}</div>
          ) : (
            <>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.borgona, marginTop: 30 }}>{guestInfo.label}</p>
              <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.3em', marginTop: 14, color: P.borgonaHondo, fontWeight: 700 }}>
                {ROTULOS.reservado}
              </p>
              <p style={{ fontFamily: SERIF, fontSize: 56, color: P.borgonaHondo, marginTop: 14 }}>{guestInfo.seats}</p>
              <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.3em', marginTop: 8, color: P.borgonaHondo, fontWeight: 700 }}>{ROTULOS.pases}</p>
            </>
          )}
        </div>
      </Reveal>

      {/* ── Los padres y los padrinos ── */}
      {hosts === undefined ? null : (
        <Reveal>
          <div style={{ padding: '40px 20px', margin: '30px 0', borderTop: `2px solid ${P.oro}`, borderBottom: `2px solid ${P.oro}` }}>
            {hosts.label === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 27, fontWeight: 500, textAlign: 'center', color: P.borgona, padding: '0 8px' }}>
                {hosts.label}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 32 }}>
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
        <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 36, alignItems: 'center' }}>
          {[
            { lugar: ceremony, icono: 'iglesia.avif' as const },
            { lugar: reception, icono: 'mesero.avif' as const },
          ].map(({ lugar, icono }) =>
            lugar === undefined ? null : (
              <div key={icono} style={{ width: '100%', maxWidth: 320, textAlign: 'center', display: 'grid', justifyItems: 'center', rowGap: 12 }}>
                <Arte alto={186} ancho={186} src={themeAsset('boda-royal', icono)} />
                {lugar.label === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.borgona }}>{lugar.label}</p>}
                {lugar.time === undefined ? null : (
                  <p style={{ fontFamily: SERIF, fontSize: 30, color: P.borgonaHondo, fontWeight: 700 }}>{lugar.time}</p>
                )}
                {lugar.place === undefined ? null : (
                  <p style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.12em', color: P.tinta, fontWeight: 600, textTransform: 'uppercase' }}>
                    {lugar.place}
                  </p>
                )}
                {llegarA(lugar) === null ? null : (
                  <a
                    href={llegarA(lugar) ?? ''}
                    rel="noreferrer"
                    style={{
                      border: `1.5px solid ${P.oroClaro}`,
                      borderRadius: 30,
                      color: P.borgona,
                      fontFamily: MONO,
                      fontSize: 8.5,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      padding: '10px 12px',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
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

      {/* ── El itinerario, en rejilla de tres ── */}
      {itinerary === undefined || itinerary.length === 0 ? null : (
        <div style={{ padding: '0 24px' }}>
          <Reveal>
            <p style={{ fontFamily: SERIF, fontSize: 51, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.borgona }}>
              {ROTULOS.itinerario}
              <span style={{ fontStyle: 'italic' }}>.</span>
            </p>
          </Reveal>
          <Reveal>
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 32, columnGap: 10 }}>
              {itinerary.map((fila, indice) => (
                <div key={`${fila.time}-${fila.label}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span
                    style={{
                      position: 'relative',
                      display: 'block',
                      width: 84,
                      height: 84,
                      borderRadius: '50%',
                      background: P.rosaClaro,
                      border: `2px solid ${P.oroClaro}`,
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      alt=""
                      aria-hidden
                      fill
                      sizes="84px"
                      src={themeAsset('boda-royal', ICONOS[indice % ICONOS.length] ?? 'vals.avif')}
                      style={{ objectFit: 'contain', padding: '8%' }}
                    />
                  </span>
                  <span style={{ fontFamily: SERIF, fontSize: 22, color: P.borgonaHondo, fontWeight: 700, marginTop: 8 }}>{fila.time}</span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 7.6,
                      letterSpacing: '0.1em',
                      color: P.borgonaHondo,
                      marginTop: 5,
                      lineHeight: 1.4,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {fila.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      )}

      {/* ── El carrusel «Nosotros» ── */}
      <div style={{ padding: '44px 24px 0', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 54, color: P.borgona }}>{ROTULOS.nosotros}</p>
        </Reveal>
        <Reveal>
          <CarruselDePerla
            borde={P.oroClaro}
            flechaFondo="rgba(139,34,82,0.6)"
            flechaTinta="#ffffff"
            fotos={fotos}
            labels={{ anterior: themes.galleryPrev, siguiente: themes.galleryNext }}
            puntoActivo={P.borgona}
            puntoInactivo="rgba(139,34,82,0.35)"
            sombra="rgba(184,134,11,0.3)"
          />
        </Reveal>
        <div style={{ marginTop: 18 }}>{slots.photos}</div>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* ── El código de vestimenta ── */}
        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              {dressCode.title === undefined ? null : (
                <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', color: P.oro, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>
                  {dressCode.title}
                </p>
              )}
              <p style={{ fontFamily: SERIF, fontSize: 51, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.borgona }}>
                {ROTULOS.vestimenta}
                <span style={{ fontStyle: 'italic' }}>{ROTULOS.vestimentaCursiva}</span>
              </p>
              <div style={{ width: '91%', margin: '26px auto', position: 'relative' }}>
                <span aria-hidden style={{ position: 'absolute', inset: '8%', background: P.rosaClaro, borderRadius: '50%', zIndex: -1, opacity: 0.6 }} />
                <Arte ancho={620} src={themeAsset('boda-royal', 'vestimenta.avif')} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, width: '58%', margin: '22px auto 0' }}>
                {(dressCode.colors ?? CARTA_DE_COLOR.map((c) => c.color)).map((color) => (
                  <span key={color} style={{ textAlign: 'center', flex: 1 }}>
                    <span style={{ display: 'block', width: '100%', aspectRatio: '1/1', background: color, border: '1px solid rgba(153,101,21,0.3)' }} />
                    <span style={{ display: 'block', marginTop: 3, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: P.tinta, fontWeight: 700 }}>
                      {(CARTA_DE_COLOR.find((c) => c.color === color)?.nombre ?? '').toUpperCase()}
                    </span>
                  </span>
                ))}
              </div>
              {dressCode.note === undefined ? null : (
                <p style={{ marginTop: 14, fontSize: 15.7, fontWeight: 600, fontStyle: 'italic', color: P.tinta, lineHeight: 1.6, textAlign: 'center' }}>
                  {dressCode.note}
                </p>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Solo adultos ── */}
        {soloAdultos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 60, marginBottom: 20 }}>
              <div style={{ background: 'rgba(255,245,242,0.4)', borderRadius: 16, padding: '30px 20px', textAlign: 'center' }}>
                <Arte ancho={175} estilo={{ margin: '0 auto' }} src={themeAsset('boda-royal', 'tacon-y-corbata.avif')} />
                <div style={{ maxWidth: '88%', margin: '16px auto 0' }}>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.6, color: P.tinta }}>{soloAdultos.text}</p>
                  {soloAdultos.title === undefined ? null : (
                    <p style={{ fontFamily: MONO, fontSize: 12.6, letterSpacing: '0.35em', color: P.borgona, fontWeight: 700, marginTop: 14, textTransform: 'uppercase' }}>
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
            <Arte ancho={220} estilo={{ width: '50%', margin: '0 auto' }} src={themeAsset('boda-royal', 'regalo.avif')} />
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.borgona, marginTop: 32 }}>{regalos?.title ?? ROTULOS.regalos}</p>
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
                accent={P.oroClaro}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.borgona}
                playIconColor="#ffffff"
                textColor={P.borgona}
                track={music?.track ?? ''}
                trackColor={P.borgona}
              />
            </div>
          </Reveal>
        )}

        {/* ── Confirmación ── */}
        <Reveal>
          <div style={{ marginTop: 40 }}>
            <p style={{ fontFamily: SERIF, fontSize: 35, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.borgona }}>
              {ROTULOS.confirma}
              <span style={{ fontStyle: 'italic' }}>{ROTULOS.confirmaCursiva}</span>
            </p>
            <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
          </div>
        </Reveal>

        {/* ── El libro de firmas ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '32px 0', borderTop: `1.5px solid ${P.oro}`, textAlign: 'center' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.borgona }}>{ROTULOS.firmas}</p>
            <div style={{ marginTop: 18 }}>{slots.guestbook}</div>
          </div>
        </Reveal>

        {/* ── El cierre ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '64px 24px', borderTop: `2px solid ${P.oro}`, textAlign: 'center' }}>
            {closing?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 44, fontWeight: 500, color: P.borgona, textShadow: '2px 2px 6px rgba(0,0,0,0.35)' }}>
                {closing.text}
              </p>
            )}
            <span style={{ display: 'inline-block', marginTop: 20, padding: '14px 28px', background: 'rgba(184,134,11,0.88)', borderRadius: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.35em', color: '#fff8e7', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                {closing?.signature ?? nombres}
              </span>
            </span>
            <div style={{ marginTop: 28 }}>{slots.pass}</div>
          </div>
        </Reveal>
      </div>
    </article>
  )
}

/** Una pieza de arte del diseño, con su ancho máximo. */
function Arte({
  src,
  ancho,
  alto,
  estilo,
}: {
  readonly src: string
  readonly ancho: number
  readonly alto?: number
  readonly estilo?: React.CSSProperties
}) {
  return (
    <span style={{ display: 'block', maxWidth: ancho, ...estilo }}>
      <Image alt="" aria-hidden height={alto ?? ancho} sizes={`${ancho}px`} src={src} style={{ width: '100%', height: 'auto', display: 'block' }} width={ancho} />
    </span>
  )
}

/** Un grupo de anfitriones: su rótulo y sus nombres. */
function Familia({ titulo, nombres }: { readonly titulo: string; readonly nombres: readonly string[] }) {
  if (nombres.length === 0) return null
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', color: P.oroHondo, fontWeight: 700 }}>{titulo}</p>
      {nombres.map((nombre, indice) => (
        <p key={nombre} style={{ fontFamily: SERIF, fontSize: 15.5, color: P.tinta, marginTop: indice === 0 ? 10 : 0, lineHeight: 1.6 }}>
          {nombre}
        </p>
      ))}
    </div>
  )
}
