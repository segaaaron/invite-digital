import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { MusicPlayer } from '../kit/MusicPlayer'
import { CapaFija } from '../kit/CapaFija'
import { Reveal } from '../kit/Reveal'
import { CarruselDePerla } from './CarruselDePerla'
import { CuentaConAros } from './CuentaConAros'
import { NavyCover } from './NavyCover'
import { RelojDeItinerario } from './RelojDeItinerario'
import { CARTA_DE_COLOR, PALETA as P } from './boda-navy.palette'

const SERIF = 'var(--font-spectral)'
const MONO = 'var(--font-jetbrains-mono)'
const CALIGRAFIA = 'var(--font-great-vibes)'
const DISPLAY = 'var(--font-playfair-display)'

/** Las seis fotografías del carrusel, en el orden de la maqueta. */
const CARRUSEL = ['pareja-1.avif', 'pareja-2.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif', 'pareja-6.avif'] as const

const ROTULOS = {
  nuestraBoda: 'NUESTRA BODA',
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
 * «Noche Estrellada» — Maya & Anderson, de `wedding-variants-7.jsx`
 * (`WeddingEditorialNavy`).
 *
 * La Editorial de medianoche: la lluvia de purpurina de fondo en toda la invitación, texto
 * blanco y cuatro oros, la cuenta atrás con aros que se llenan, las tarjetas de ceremonia y
 * recepción con marco dorado y el itinerario como la esfera de un reloj.
 */
export function BodaNavyView({ content, event, themes, slots, guestInfo, audioSrc }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, dressCode, notes, gallery, music, closing } = content

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const fechaLarga =
    cuando === null || Number.isNaN(cuando.getTime())
      ? ''
      : cuando.toLocaleDateString(etiquetaLocal, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const nombres = [hero?.nameA, hero?.nameB].filter((nombre) => nombre !== undefined && nombre !== '').join(' & ')
  const iniciales = [inicial(hero?.nameA), inicial(hero?.nameB)].filter((letra) => letra !== '')
  const papeles = hosts === undefined ? { novia: [], novio: [], padrinos: [] } : anfitrionesBoda(hosts, { madreDelante: true })
  const historia = notes?.[0]
  const soloAdultos = notes?.[1]
  const regalos = notes?.[2]

  // La última línea de la frase va en oro, como en la maqueta.
  const lineasDeLaFrase = quote?.text.split('\n') ?? []
  const ultimaLinea = lineasDeLaFrase.at(-1)

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  const fotos = CARRUSEL.map((archivo, indice) =>
    gallery?.[indice]?.imageId === undefined ? themeAsset('boda-navy', archivo) : `/media/${gallery[indice].imageId}`,
  )

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.oro, sobreAcento: P.marino, tinta: P.tinta, display: SERIF, radio: 8 }),
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
      <NavyCover
        bgAsset={themeAsset('boda-navy', 'portada-navy.avif')}
        cta={themes.coverEnterShared}
        eyebrow={hero?.eyebrow ?? ''}
        fecha={fechaLarga}
        initials={hero?.monogram ?? iniciales.join('')}
        names={nombres}
        openLabel={themes.coverAria}
      />

      {/* El fondo: la misma lluvia de purpurina, repetida hacia abajo, como en la maqueta. */}
      <CapaFija
        style={{
        backgroundColor: P.marino,
        backgroundImage: `url(${themeAsset('boda-navy', 'portada-navy.avif')})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'repeat-y',
        backgroundPosition: 'top center',
        }}
        zIndex={-1}
      />

      {/* ── La cabecera de revista, con la luna ── */}
      <div style={{ padding: '22px 24px', borderBottom: `1.5px solid ${P.oro}` }}>
        <div style={{ textAlign: 'center' }}>
          <Arte ancho={117} estilo={{ margin: '0 auto 12px' }} src={themeAsset('boda-navy', 'luna.avif')} />
          <p style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 200, lineHeight: 0.95 }}>{ROTULOS.nuestraBoda}</p>
          <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 2, color: P.oroPalido }}>· {nombres.toUpperCase()} ·</p>
          {fechaLarga === '' ? null : (
            <p style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600 }}>{fechaLarga}</p>
          )}
        </div>
      </div>

      {/* ── El retrato, fundido con el marino, y los nombres encima ── */}
      <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
        <Image
          alt=""
          aria-hidden
          fill
          sizes="480px"
          src={hero?.portraitImageId === undefined ? themeAsset('boda-navy', 'pareja-1.avif') : `/media/${hero.portraitImageId}`}
          style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
        />
        <span
          aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140, background: `linear-gradient(180deg, transparent 0%, ${P.marino} 90%)` }}
        />
        <div style={{ position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'left' }}>
          <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 200, fontSize: 64, lineHeight: 0.9, color: P.oro }}>
            {hero?.nameA}
            {hero?.nameB === undefined ? null : (
              <>
                <br />
                <span style={{ fontStyle: 'normal', fontWeight: 400 }}>&amp; {hero.nameB}</span>
              </>
            )}
          </h1>
          {hero?.serial === undefined ? null : (
            <span style={{ display: 'block', marginTop: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.oroPalido }}>
              {hero.serial}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '32px 24px 0' }}>
        {/* ── La cuenta atrás, con sus aros ── */}
        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ padding: '36px 16px', borderTop: `1.5px solid ${P.oro}`, borderBottom: `1.5px solid ${P.oro}`, borderRadius: 16, textAlign: 'center' }}>
              <Arte ancho={84} estilo={{ margin: '0 auto 20px' }} src={themeAsset('boda-navy', 'reloj.avif')} />
              <CuentaConAros
                aro={P.oro}
                aroFondo="rgba(197,150,58,0.25)"
                cifra={P.tinta}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                mono={MONO}
                rotulo={P.tinta}
                serif={SERIF}
                targetISO={schedule.startsAt}
              />
            </div>
          </Reveal>
        )}

        {/* ── La frase, con su última línea en oro ── */}
        {quote === undefined ? null : (
          <Reveal>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 37, fontWeight: 500, lineHeight: 1.25, padding: '24px 24px 0' }}>
              {lineasDeLaFrase.slice(0, -1).map((linea, indice) => (
                <span key={`${indice}-${linea}`}>
                  {linea}
                  <br />
                </span>
              ))}
              <span style={{ color: P.oro }}>{ultimaLinea}</span>
            </p>
            {hero?.nameB === undefined ? null : (
              <p style={{ marginTop: 10, padding: '0 24px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', color: P.oroPalido }}>
                — {hero.nameB.toUpperCase()}
              </p>
            )}
          </Reveal>
        )}

        {/* ── La historia, con su capitular ── */}
        {historia?.title === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 28, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', color: P.oroPalido, textTransform: 'uppercase' }}>{historia.title}</p>
          </Reveal>
        )}
        {historia?.text === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: historia.title === undefined ? 28 : 14, fontSize: 15.5, lineHeight: 1.65 }}>
              <span style={{ float: 'left', fontFamily: SERIF, fontSize: 76, fontWeight: 600, lineHeight: 0.8, paddingRight: 8, color: P.oro }}>
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
              fontSize: 18,
              lineHeight: 1.8,
              maxWidth: '76%',
              margin: '0 auto',
              background: 'rgba(255,255,255,0.1)',
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
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.oro, marginTop: 30 }}>{guestInfo.label}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 14, color: P.oroPalido, fontWeight: 600 }}>{ROTULOS.reservado}</p>
              <p style={{ fontFamily: SERIF, fontSize: 56, marginTop: 14 }}>{guestInfo.seats}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 8, color: P.oroPalido, fontWeight: 600 }}>{ROTULOS.pases}</p>
            </>
          )}
        </div>
      </Reveal>

      {/* ── Los padres y los padrinos ── */}
      {hosts === undefined ? null : (
        <Reveal>
          <div style={{ padding: '40px 24px', margin: '30px 0', borderTop: `2px solid ${P.oro}`, borderBottom: `2px solid ${P.oro}` }}>
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

      {/* ── Ceremonia y recepción, en sus tarjetas con marco de oro ── */}
      <Reveal>
        <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { lugar: ceremony, icono: 'iglesia.avif' as const },
            { lugar: reception, icono: 'copas.avif' as const },
          ].map(({ lugar, icono }) =>
            lugar === undefined ? null : (
              <div
                key={icono}
                style={{
                  textAlign: 'center',
                  display: 'grid',
                  gridTemplateRows: '267px auto auto auto 1fr auto',
                  justifyItems: 'center',
                  rowGap: 16,
                  border: `1.5px solid ${P.oroVivo}`,
                  borderRadius: 20,
                  padding: '28px 20px',
                }}
              >
                <span style={{ position: 'relative', display: 'block', width: 267, maxWidth: '100%', height: 267 }}>
                  <Image alt="" aria-hidden fill sizes="267px" src={themeAsset('boda-navy', icono)} style={{ objectFit: 'contain' }} />
                </span>
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 32, color: P.marfil, whiteSpace: 'nowrap' }}>{lugar.label ?? ''}</p>
                <p style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 700 }}>{lugar.time ?? ''}</p>
                <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
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
                      background: P.oroVivo,
                      color: P.marino,
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

      {/* ── El itinerario, como esfera de reloj ── */}
      {itinerary === undefined || itinerary.length === 0 ? null : (
        <div style={{ padding: '0 24px' }}>
          <Reveal>
            <p style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.oroBrillo }}>
              {ROTULOS.itinerario}
            </p>
          </Reveal>
          <Reveal>
            <div style={{ marginTop: 56 }}>
              <RelojDeItinerario
                aro={P.oroVivo}
                brillo={P.oroBrillo}
                centro={iniciales.join(' & ')}
                display={DISPLAY}
                filas={itinerary}
                mono={MONO}
                serif={SERIF}
                tinta={P.tinta}
              />
            </div>
          </Reveal>
        </div>
      )}

      {/* ── El carrusel «Nosotros» ── */}
      <div style={{ padding: '44px 24px 0', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 62, color: P.oroTitular }}>{ROTULOS.nosotros}</p>
        </Reveal>
        <Reveal>
          <CarruselDePerla
            borde={P.oro}
            flechaFondo="rgba(20,40,70,0.7)"
            flechaTinta={P.oroTitular}
            fondo={P.marino}
            fotos={fotos}
            labels={{ anterior: themes.galleryPrev, siguiente: themes.galleryNext }}
            puntoActivo={P.oroTitular}
            puntoInactivo="rgba(212,168,75,0.4)"
            sombra="rgba(197,150,58,0.35)"
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
                <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', textAlign: 'center', textTransform: 'uppercase' }}>{dressCode.title}</p>
              )}
              <p style={{ fontFamily: SERIF, fontSize: 58.5, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.oroTitular }}>
                {ROTULOS.vestimenta}
                <span style={{ fontStyle: 'italic' }}>{ROTULOS.vestimentaCursiva}</span>
              </p>
              <Arte ancho={620} estilo={{ width: '85%', margin: '26px auto' }} src={themeAsset('boda-navy', 'vestimenta.avif')} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, width: '58%', margin: '22px auto 0' }}>
                {(dressCode.colors ?? CARTA_DE_COLOR.map((c) => c.color)).map((color) => (
                  <span key={color} style={{ textAlign: 'center', flex: 1 }}>
                    <span style={{ display: 'block', width: '100%', aspectRatio: '1/1', background: color, border: `1.5px solid ${P.tinta}` }} />
                    <span style={{ display: 'block', marginTop: 3, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em' }}>
                      {(CARTA_DE_COLOR.find((c) => c.color === color.toLowerCase())?.nombre ?? '').toUpperCase()}
                    </span>
                  </span>
                ))}
              </div>
              {dressCode.note === undefined ? null : (
                <p style={{ marginTop: 14, fontSize: 14.3, fontStyle: 'italic', lineHeight: 1.6, textAlign: 'center' }}>{dressCode.note}</p>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Solo adultos ── */}
        {soloAdultos === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 60, marginBottom: 20, padding: '0 10px' }}>
              <Arte ancho={156} estilo={{ margin: '0 auto' }} src={themeAsset('boda-navy', 'tacon-y-corbata.avif')} />
              <div style={{ maxWidth: '88%', margin: '16px auto 0', textAlign: 'center' }}>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, lineHeight: 1.7 }}>{soloAdultos.text}</p>
                {soloAdultos.title === undefined ? null : (
                  <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', fontWeight: 700, marginTop: 14, textTransform: 'uppercase' }}>
                    {soloAdultos.title}
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        )}

        {/* ── La mesa de regalos ── */}
        <Reveal>
          <div style={{ marginTop: 60, marginBottom: 20, textAlign: 'center' }}>
            <Arte ancho={240} estilo={{ margin: '0 auto' }} src={themeAsset('boda-navy', 'regalo.avif')} />
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.oroTitular, marginTop: 32 }}>{regalos?.title ?? ROTULOS.regalos}</p>
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
                accent={P.oro}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.oro}
                playIconColor={P.marino}
                textColor={P.tinta}
                track={music?.track ?? ''}
                trackColor={P.oroTitular}
              />
            </div>
          </Reveal>
        )}

        {/* ── Confirmación ── */}
        <Reveal>
          <div style={{ marginTop: 40 }}>
            <p style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.oroTitular }}>
              {ROTULOS.confirma}
              <span style={{ fontStyle: 'italic' }}>{ROTULOS.confirmaCursiva}</span>
            </p>
            <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
          </div>
        </Reveal>

        {/* ── El libro de firmas ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '32px 0', borderTop: `1.5px solid ${P.oro}`, textAlign: 'center' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.oroTitular }}>{ROTULOS.firmas}</p>
            <div style={{ marginTop: 18 }}>{slots.guestbook}</div>
          </div>
        </Reveal>

        {/* ── El cierre ── */}
        <Reveal>
          <div style={{ marginTop: 50, padding: '64px 24px', borderTop: `2px solid ${P.oro}`, textAlign: 'center' }}>
            {closing?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 28, fontWeight: 200 }}>{closing.text}</p>
            )}
            <p style={{ marginTop: 20, fontFamily: MONO, fontSize: 15, letterSpacing: '0.35em', color: P.oroTitular, fontWeight: 700, textTransform: 'uppercase' }}>
              {closing?.signature ?? nombres}
            </p>
            <div style={{ marginTop: 28 }}>{slots.pass}</div>
          </div>
        </Reveal>
      </div>
    </article>
  )
}

/** Una pieza de arte del diseño, con su ancho máximo. */
function Arte({ src, ancho, estilo }: { readonly src: string; readonly ancho: number; readonly estilo?: React.CSSProperties }) {
  return (
    <span style={{ display: 'block', maxWidth: ancho, ...estilo }}>
      <Image alt="" aria-hidden height={ancho} sizes={`${ancho}px`} src={src} style={{ width: '100%', height: 'auto', display: 'block' }} width={ancho} />
    </span>
  )
}

/** Un grupo de anfitriones: su rótulo y sus nombres. */
function Familia({ titulo, nombres }: { readonly titulo: string; readonly nombres: readonly string[] }) {
  if (nombres.length === 0) return null
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', color: P.oroPalido, fontWeight: 600 }}>{titulo}</p>
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
