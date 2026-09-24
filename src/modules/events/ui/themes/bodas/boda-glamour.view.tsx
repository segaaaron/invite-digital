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
import { GlamourCover } from './GlamourCover'
import { PALETA as P } from './boda-glamour.palette'

const SERIF = 'var(--font-cormorant)'
const SANS = 'var(--font-montserrat)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Las cinco fotografías del carrusel «Nuestra Historia», en el orden de la maqueta. */
const CARRUSEL = ['pareja-1.avif', 'pareja-2.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif'] as const

/** El icono de cada hito del itinerario, en su orden. */
const ICONOS = ['iglesia.avif', 'mesero.avif', 'vals.avif', 'cena.avif', 'torta.avif', 'fiesta.avif'] as const

/** Los veintidós pétalos guinda que caen por encima de todo. */
const PETALOS = Array.from({ length: 22 }, (_, i) => ({
  izquierda: (i * 4.6) % 100,
  tamano: 10 + (i % 5) * 4,
  duracion: 8 + (i % 7) * 2,
  retraso: -(i * 0.9),
}))

const ROTULOS = {
  nuestraBoda: 'NUESTRA BODA',
  faltan: '· FALTAN ·',
  reservado: 'HEMOS RESERVADO PARA TI',
  pases: 'PASES',
  padresNovia: 'PADRES DE LA NOVIA',
  padresNovio: 'PADRES DEL NOVIO',
  padrinos: 'PADRINOS DE BODA',
  verUbicacion: 'VER UBICACIÓN',
  itinerario: 'Itinerario',
  historia: 'Nuestra Historia',
  soloAdultos: 'CELEBRACIÓN SOLO PARA ADULTOS',
  confirma: 'CONFIRMA TU ASISTENCIA',
  firmas: 'Déjanos un mensaje',
  regalos: 'Mesa de regalos',
} as const

/**
 * «Glamour» — Valeria & Nicolas, de `wedding-variants.jsx` (`WeddingBotanical`).
 *
 * La boda guinda y oro: el retrato recortado dentro de un marco de flores, filetes de oro
 * con su ❋ entre bloques, ramos que flotan, esquinas doradas, la fecha a lo grande con su
 * día de la semana, el itinerario de iconos en rejilla de tres, y pétalos guinda cayendo.
 */
export function BodaGlamourView({ content, event, dictionary, themes, slots, guestInfo, audioSrc, respondida }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, dressCode, notes, gallery, music, closing } = content

  const etiquetaLocal = event.locale === 'en' ? 'en-GB' : 'es-BO'
  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const fechaValida = cuando !== null && !Number.isNaN(cuando.getTime())
  // «Intl» en español mete un «de» entre mes y año: se piden por separado.
  const diaSemana = fechaValida ? cuando.toLocaleDateString(etiquetaLocal, { weekday: 'long' }).toUpperCase() : ''
  const dia = fechaValida ? String(cuando.getDate()) : ''
  const mesYAnio = fechaValida
    ? `${cuando.toLocaleDateString(etiquetaLocal, { month: 'long' })} ${cuando.getFullYear()}`.toUpperCase()
    : ''

  const plazo =
    respondida || event.rsvpDeadline === null
      ? null
      : `${themes.rsvpBefore} ${new Intl.DateTimeFormat(etiquetaLocal, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
          new Date(`${event.rsvpDeadline}T00:00:00Z`),
        )}`

  const nombres = [hero?.nameA, hero?.nameB].filter((nombre) => nombre !== undefined && nombre !== '').join(' & ')
  const papeles = hosts === undefined ? { novia: [], novio: [], padrinos: [] } : anfitrionesBoda(hosts, { madreDelante: true })
  const historia = notes?.[0]
  const soloAdultos = notes?.[1]
  const regalos = notes?.[2]

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  const fotos = CARRUSEL.map((archivo, indice) =>
    gallery?.[indice]?.imageId === undefined ? themeAsset('boda-glamour', archivo) : `/media/${gallery[indice].imageId}`,
  )

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  // Los botones y los campos de la maqueta son huecos y en marfil: fondo transparente, letra
  // y filete marfil, y el campo del libro de firmas con un velo blanco apenas visible.
  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.marfil, sobreAcento: P.guinda, boton: 'transparent', sobreBoton: P.marfil, tinta: P.crema, display: SERIF, radio: 8 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        ['--rsvp-borde' as string]: P.marfil,
        position: 'relative',
        background: P.guinda,
        color: P.crema,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      {/* Los pétalos guinda, por encima de todo. */}
      <CapaFija zIndex={50}>
        {PETALOS.map((petalo) => (
          <span
            className="theme-quieto-si-reduce"
            key={petalo.izquierda}
            style={{
              position: 'absolute',
              top: '-6%',
              left: `${petalo.izquierda}%`,
              width: petalo.tamano,
              height: petalo.tamano * 0.8,
              borderRadius: '50% 0 50% 50%',
              background: 'rgba(139,26,43,0.5)',
              boxShadow: '0 0 4px rgba(139,26,43,0.4)',
              animation: `theme-petalFall ${petalo.duracion}s linear ${petalo.retraso}s infinite`,
            }}
          />
        ))}
      </CapaFija>

      <GlamourCover
        bgAsset={themeAsset('boda-glamour', 'portada-glamour.avif')}
        cta={themes.coverTap}
        eyebrow={hero?.eyebrow ?? ''}
        names={nombres}
        openLabel={themes.coverAria}
        ringsAsset={themeAsset('boda-glamour', 'anillos.avif')}
      />

      {/* ── El retrato recortado, dentro de su marco de flores ── */}
      <div style={{ padding: '0 22px 8px' }}>
        {/* Sin foto de fondo: la maqueta la pide con `url(uploads/fondo bordes guindo .jpeg)`, que
            con espacios y sin comillas es CSS inválido, así que en ella la tarjeta es lisa. */}
        <div style={{ position: 'relative', borderRadius: 18, border: `1.5px solid ${P.oro}`, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
            <p style={{ fontFamily: SANS, fontSize: 12, letterSpacing: '0.28em' }}>{ROTULOS.nuestraBoda}</p>
            <h1 style={{ fontFamily: CALIGRAFIA, fontSize: 34, marginTop: 2 }}>{nombres}</h1>
          </div>
          <span style={{ position: 'relative', display: 'block', width: '82%', margin: '70px auto 0' }}>
            <Image
              alt=""
              aria-hidden
              height={900}
              sizes="360px"
              src={hero?.portraitImageId === undefined ? themeAsset('boda-glamour', 'retrato.avif') : `/media/${hero.portraitImageId}`}
              style={{ width: '100%', height: 'auto', maxHeight: 900, objectFit: 'contain', objectPosition: 'top', display: 'block' }}
              width={700}
            />
          </span>
          <Ramo estilo={{ position: 'absolute', bottom: -6, left: '14%', width: '72%', zIndex: 2, animationDuration: '4.2s' }} />
          <Ramo estilo={{ position: 'absolute', bottom: -6, left: -4, width: '48%', zIndex: 2, animationDuration: '4.6s', animationDelay: '0.6s' }} reflejado />
        </div>
      </div>

      {/* ── La frase, su firma y la historia ── */}
      <Reveal>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          {quote === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro }}>{quote.text}</p>}
          {quote === undefined || hero?.nameB === undefined ? null : (
            <p style={{ marginTop: 10, fontFamily: SANS, fontSize: 10, letterSpacing: '0.3em', opacity: 0.75 }}>— {hero.nameB.toUpperCase()}</p>
          )}
          {historia?.text === undefined ? null : <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.7, opacity: 0.9 }}>{historia.text}</p>}
        </div>
      </Reveal>

      <FileteDeOro />
      <Separador />

      {/* ── La fecha y la cuenta atrás ── */}
      {schedule === undefined ? null : (
        <Reveal>
          <div style={{ position: 'relative', padding: '28px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}>
            <Esquinas ancho={44} opacidad={0.45} />
            {fechaValida ? (
              <>
                <p style={{ fontFamily: SANS, fontSize: 12, letterSpacing: '0.3em', color: P.oro }}>{diaSemana}</p>
                <p style={{ fontSize: 72, lineHeight: 1, color: P.marfil, marginTop: 6 }}>{dia}</p>
                <p style={{ fontFamily: SANS, fontSize: 12, letterSpacing: '0.3em', color: P.oro, marginTop: 6 }}>{mesYAnio}</p>
              </>
            ) : null}
            <span aria-hidden style={{ display: 'block', width: 60, height: 1, background: P.oro, margin: '20px auto', opacity: 0.6 }} />
            <Arte ancho={70} estilo={{ margin: '0 auto 16px' }} src={themeAsset('boda-glamour', 'reloj.avif')} />
            <p style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.3em', color: P.oro }}>{ROTULOS.faltan}</p>
            <Countdown
              labelStyle={{ fontFamily: SANS, fontSize: 8, letterSpacing: '0.25em', color: P.oro, marginTop: 4 }}
              labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
              rowStyle={{ display: 'flex', justifyContent: 'space-around', marginTop: 14 }}
              targetISO={schedule.startsAt}
              valueStyle={{ fontSize: 40 }}
            />
          </div>
        </Reveal>
      )}

      {/* ── La tarjeta del invitado ── */}
      <Reveal>
        <div style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center' }}>
          {guestInfo === undefined ? (
            <div>{slots.guest}</div>
          ) : (
            <div style={{ border: `1.5px solid ${P.marfil}`, borderRadius: 4, padding: '36px 30px', textAlign: 'center', maxWidth: 300 }}>
              <p style={{ fontSize: 16, letterSpacing: '0.2em', color: P.marfil, textTransform: 'uppercase' }}>{guestInfo.label}</p>
              <span aria-hidden style={{ display: 'block', width: 50, height: 1, background: P.marfil, margin: '16px auto', opacity: 0.7 }} />
              <p style={{ fontSize: 11, letterSpacing: '0.28em', color: P.oro }}>{ROTULOS.reservado}</p>
              <p style={{ fontSize: 58, lineHeight: 1, color: P.marfil, marginTop: 10 }}>{guestInfo.seats}</p>
              <p style={{ fontSize: 13, letterSpacing: '0.25em', color: P.oro, marginTop: 6 }}>{ROTULOS.pases}</p>
            </div>
          )}
        </div>
      </Reveal>

      <FileteDeOro />

      {/* ── Los padres y los padrinos ── */}
      {hosts === undefined ? null : (
        <Reveal>
          <div style={{ padding: '24px 24px 40px', textAlign: 'center' }}>
            {hosts.label === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.oro }}>{hosts.label}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 28 }}>
              <Familia nombres={papeles.novia} titulo={ROTULOS.padresNovia} />
              <Familia nombres={papeles.novio} titulo={ROTULOS.padresNovio} />
            </div>
            {papeles.padrinos.length === 0 ? null : (
              <>
                <span aria-hidden style={{ display: 'block', width: 60, height: 1, background: P.oro, margin: '28px auto', opacity: 0.6 }} />
                <p style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.25em', color: P.oro }}>{ROTULOS.padrinos}</p>
                <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: P.marfil }}>{papeles.padrinos.join(' & ')}</p>
              </>
            )}
          </div>
        </Reveal>
      )}

      <Separador />
      <FileteDeOro />

      {/* ── Ceremonia y recepción ── */}
      <Reveal>
        <div style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
          {[
            { lugar: ceremony, icono: 'iglesia.avif' as const },
            { lugar: reception, icono: 'copas.avif' as const },
          ].map(({ lugar, icono }, indice) =>
            lugar === undefined ? null : (
              <div key={icono} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 30 }}>
                {indice === 1 ? <FileteDeOro /> : null}
                <div style={{ textAlign: 'center' }}>
                  <Arte ancho={119} estilo={{ margin: '0 auto' }} src={themeAsset('boda-glamour', icono)} />
                  {lugar.label === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro, marginTop: 12 }}>{lugar.label}</p>}
                  {lugar.time === undefined ? null : <p style={{ fontSize: 26, marginTop: 4 }}>{lugar.time}</p>}
                  {lugar.place === undefined ? null : (
                    <p style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.15em', opacity: 0.8, marginTop: 4, textTransform: 'uppercase' }}>{lugar.place}</p>
                  )}
                  {llegarA(lugar) === null ? null : (
                    <a
                      href={llegarA(lugar) ?? ''}
                      rel="noreferrer"
                      style={{
                        marginTop: 16,
                        display: 'inline-block',
                        border: `1.5px solid ${P.marfil}`,
                        color: P.oro,
                        fontFamily: SERIF,
                        fontSize: 12,
                        letterSpacing: '0.2em',
                        padding: '10px 24px',
                        borderRadius: 30,
                        textDecoration: 'none',
                      }}
                      target="_blank"
                    >
                      {ROTULOS.verUbicacion}
                    </a>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </Reveal>

      <FileteDeOro />

      {/* ── El itinerario, en rejilla de tres ── */}
      {itinerary === undefined || itinerary.length === 0 ? null : (
        <Reveal>
          <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro, marginBottom: 30 }}>{ROTULOS.itinerario}</p>
            <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 30, columnGap: 8, maxWidth: 340, margin: '0 auto', listStyle: 'none', padding: 0 }}>
              {itinerary.map((fila, indice) => (
                <li key={`${fila.time}-${fila.label}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ position: 'relative', display: 'block', width: 72, height: 72 }}>
                    <Image
                      alt=""
                      aria-hidden
                      fill
                      sizes="72px"
                      src={themeAsset('boda-glamour', ICONOS[indice % ICONOS.length] ?? 'vals.avif')}
                      style={{ objectFit: 'contain' }}
                    />
                  </span>
                  <span style={{ fontSize: 22, lineHeight: 1, color: P.marfil }}>{fila.time}</span>
                  <span style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.15em', color: P.oro, textTransform: 'uppercase' }}>{fila.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      )}

      <FileteDeOro />
      <Separador />

      {/* ── El código de vestimenta ── */}
      {dressCode === undefined ? null : (
        <Reveal>
          <div style={{ position: 'relative', padding: '0 24px 40px', textAlign: 'center' }}>
            <Esquinas ancho={44} opacidad={0.4} />
            {dressCode.title === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, marginTop: 6 }}>{dressCode.title}</p>}
            <Arte ancho={620} estilo={{ width: '78%', margin: '20px auto' }} src={themeAsset('boda-glamour', 'vestimenta.avif')} />
            {dressCode.note === undefined ? null : <p style={{ fontSize: 12, opacity: 0.8, fontStyle: 'italic' }}>{dressCode.note}</p>}
          </div>
        </Reveal>
      )}

      <FileteDeOro />
      <FileteDeOro />

      {/* ── El carrusel «Nuestra Historia» ── */}
      <Reveal>
        <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro, marginBottom: 20 }}>{ROTULOS.historia}</p>
          <CarruselDePerla
            borde={P.oro}
            flechaFondo="rgba(74,28,42,0.7)"
            flechaTinta={P.oro}
            fotos={fotos}
            labels={{ anterior: themes.galleryPrev, siguiente: themes.galleryNext }}
            puntoActivo={P.oro}
            puntoInactivo="rgba(184,134,11,0.35)"
            sombra="rgba(184,134,11,0.3)"
          />
        </div>
      </Reveal>

      <FileteDeOro />

      {/* ── Solo adultos ── */}
      {soloAdultos === undefined ? null : (
        <>
          <Reveal>
            <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
              <Arte ancho={154} estilo={{ margin: '0 auto' }} src={themeAsset('boda-glamour', 'tacon-y-corbata.avif')} />
              {soloAdultos.text === undefined ? null : <p style={{ marginTop: 14, fontSize: 14, opacity: 0.9 }}>{soloAdultos.text}</p>}
              <p style={{ marginTop: 10, fontFamily: SANS, fontSize: 10, letterSpacing: '0.25em', color: P.oro, fontWeight: 700 }}>{ROTULOS.soloAdultos}</p>
            </div>
          </Reveal>
          <FileteDeOro />
        </>
      )}

      {/* ── Confirmación ── */}
      <Reveal>
        <div style={{ position: 'relative', padding: '0 24px 40px', textAlign: 'center' }}>
          <Esquinas ancho={60} opacidad={0.5} />
          <p style={{ fontFamily: SANS, fontSize: 12, letterSpacing: '0.3em', color: P.oro, fontWeight: 700, paddingTop: 30 }}>{ROTULOS.confirma}</p>
          {plazo === null ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro, marginTop: 8 }}>{plazo.charAt(0).toUpperCase() + plazo.slice(1)}</p>}
          <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
        </div>
      </Reveal>

      <FileteDeOro />

      {/* ── El libro de firmas ── */}
      <Reveal>
        <div style={{ padding: '0 24px 50px', textAlign: 'center' }}>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.oro, marginBottom: 16 }}>{ROTULOS.firmas}</p>
          {slots.guestbook}
        </div>
      </Reveal>

      <FileteDeOro />

      {/* ── La mesa de regalos ── */}
      <Reveal>
        <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
          <Arte ancho={180} estilo={{ margin: '0 auto' }} src={themeAsset('boda-glamour', 'regalo.avif')} />
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.oro, marginTop: 16 }}>{ROTULOS.regalos}</p>
          {regalos?.text === undefined ? null : <p style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{regalos.text}</p>}
          <div style={{ marginTop: 18 }}>{slots.registry}</div>
        </div>
      </Reveal>

      <FileteDeOro />

      {/* ── Comparte tus fotos: solo si el plan trae las fotos de invitados ── */}
      {slots.photos === undefined ? null : (
        <>
          <Reveal>
            <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.oro }}>{dictionary.photosTitle}</p>
              <p style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{dictionary.photosIntro}</p>
              <div style={{ marginTop: 18 }}>{slots.photos}</div>
            </div>
          </Reveal>
          <FileteDeOro />
        </>
      )}

      {/* ── La canción ── */}
      {cancion === undefined ? null : (
        <Reveal>
          <div style={{ padding: '0 24px 40px' }}>
            <MusicPlayer
              accent={P.oro}
              artist={music?.artist ?? ''}
              audioSrc={cancion}
              eyebrow={themes.songOfTheNight}
              playBg={P.oro}
              playIconColor={P.guinda}
              textColor={P.crema}
              track={music?.track ?? ''}
              trackColor={P.oro}
            />
          </div>
        </Reveal>
      )}

      <Separador />

      {/* ── El cierre ── */}
      <Reveal>
        <div style={{ padding: '40px 24px 70px', textAlign: 'center' }}>
          {closing?.text === undefined ? null : <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro, marginTop: 40 }}>{closing.text}</p>}
          <p style={{ marginTop: 10, fontFamily: SANS, fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{closing?.signature ?? nombres}</p>
          <div style={{ marginTop: 28 }}>{slots.pass}</div>
        </div>
      </Reveal>
    </article>
  )
}

/** El filete de oro con su ❋ en medio (`GoldDivider` de la maqueta). */
function FileteDeOro() {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '8px 24px', opacity: 0.85 }}>
      <span style={{ display: 'block', flex: 1, maxWidth: 90, height: 1, background: `linear-gradient(to right, transparent, ${P.oro})` }} />
      <span style={{ fontSize: 16, color: P.oro }}>❋</span>
      <span style={{ display: 'block', flex: 1, maxWidth: 90, height: 1, background: `linear-gradient(to left, transparent, ${P.oro})` }} />
    </div>
  )
}

/** El ramo guinda que flota entre bloques (`FloralSeparator` de la maqueta). */
function Separador() {
  return (
    <div aria-hidden style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
      <Ramo estilo={{ width: '68%', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))', animationDuration: '4s' }} />
    </div>
  )
}

/** El ramo de flores guinda, flotando; `reflejado` lo da la vuelta. */
function Ramo({ estilo, reflejado = false }: { readonly estilo: React.CSSProperties; readonly reflejado?: boolean }) {
  return (
    <span className="theme-flota" style={{ display: 'block', pointerEvents: 'none', opacity: 0.9, ...estilo }}>
      <Image
        alt=""
        aria-hidden
        height={220}
        sizes="300px"
        src={themeAsset('boda-glamour', 'flores.avif')}
        style={{ width: '100%', height: 'auto', display: 'block', transform: reflejado ? 'scaleX(-1)' : undefined }}
        width={600}
      />
    </span>
  )
}

/** Las dos esquinas doradas de arriba de un bloque. */
function Esquinas({ ancho, opacidad }: { readonly ancho: number; readonly opacidad: number }) {
  return (
    <>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: -6, width: ancho, opacity: opacidad }}>
        <Image alt="" height={ancho} sizes={`${ancho}px`} src={themeAsset('boda-glamour', 'esquina-izq.avif')} style={{ width: '100%', height: 'auto' }} width={ancho} />
      </span>
      <span aria-hidden style={{ position: 'absolute', top: 0, right: -6, width: ancho, opacity: opacidad }}>
        <Image alt="" height={ancho} sizes={`${ancho}px`} src={themeAsset('boda-glamour', 'esquina-der.avif')} style={{ width: '100%', height: 'auto' }} width={ancho} />
      </span>
    </>
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
    <div style={{ flex: 1 }}>
      <p style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.25em', color: P.oro }}>{titulo}</p>
      <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
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
