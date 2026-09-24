import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MusicPlayer } from '../kit/MusicPlayer'
import { CapaFija } from '../kit/CapaFija'
import { Reveal } from '../kit/Reveal'
import { CarruselDePerla } from './CarruselDePerla'
import { SerenidadCover } from './SerenidadCover'
import { CARTA_DE_COLOR, PALETA as P } from './boda-serenidad.palette'

const SERIF = 'var(--font-spectral)'
const MONO = 'var(--font-jetbrains-mono)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Las seis fotografías del carrusel «Nosotros», en el orden de la maqueta. */
const CARRUSEL = ['pareja-2.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif', 'pareja-6.avif', 'portada-flores.avif'] as const

/** Los treinta y dos pétalos blancos que caen sobre toda la invitación. */
const PETALOS = Array.from({ length: 32 }, (_, i) => ({
  izquierda: (i * 3.2) % 100,
  tamano: 9 + (i % 5) * 4,
  duracion: 8 + (i % 7) * 2,
  retraso: -(i * 0.9),
}))

/** Cómo llama **este** diseño a sus secciones. Es su voz, no una traducción. */
const ROTULOS = {
  nuestraBoda: 'NUESTRA BODA',
  faltan: '· FALTAN ·',
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
 * «Jardín de Serenidad» — Sofía & Daniel, de `wedding-variants-5.jsx`
 * (`WeddingEditorialFloralBlue`).
 *
 * Editorial de revista en azules: Spectral de dos pesos para los titulares, monoespaciada
 * con mucho interletrado para los rótulos y caligrafía para las horas del itinerario. Los
 * bloques se separan con la cenefa floral, que alterna su reflejo, y sobre toda la
 * invitación caen treinta y dos pétalos blancos.
 */
export function BodaSerenidadView({ content, event, dictionary, themes, slots, guestInfo, audioSrc }: ThemeProps) {
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
    gallery?.[indice]?.imageId === undefined ? themeAsset('boda-serenidad', archivo) : `/media/${gallery[indice].imageId}`,
  )

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.marino, sobreAcento: '#ffffff', tinta: P.tinta, display: SERIF, radio: 8 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.cielo,
        color: P.tinta,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <SerenidadCover
        bgAsset={themeAsset('boda-serenidad', 'portada-flores.avif')}
        cta={themes.coverEnterShared}
        eyebrow={hero?.eyebrow ?? ''}
        fecha={fechaLarga}
        names={nombres}
        openLabel={themes.coverAria}
      />

      {/* Los pétalos blancos, cayendo sobre toda la invitación. */}
      <CapaFija zIndex={5}>
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
              background: 'rgba(255,255,255,0.85)',
              boxShadow: '0 0 4px rgba(255,255,255,0.5)',
              animation: `theme-petalFall ${petalo.duracion}s linear ${petalo.retraso}s infinite`,
            }}
          />
        ))}
      </CapaFija>

      <Cenefa />

      {/* ── La cabecera de revista ── */}
      <div style={{ padding: '10px 24px 0' }}>
        <div style={{ textAlign: 'center', paddingBottom: 18 }}>
          <p style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 200, lineHeight: 0.95, color: P.titular }}>{ROTULOS.nuestraBoda}</p>
          <h1 style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 2, color: P.medio }}>
            · {nombres.toUpperCase()} ·
          </h1>
          {fechaLarga === '' ? null : (
            <p style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600, color: P.tinta }}>{fechaLarga}</p>
          )}
        </div>
      </div>

      {/* ── El retrato grande ── */}
      <div style={{ padding: '24px 20px 0' }}>
        <Reveal>
          <span
            style={{
              position: 'relative',
              display: 'block',
              width: '100%',
              aspectRatio: '3/4',
              background: P.marco,
              borderRadius: 12,
              border: `1.5px solid ${P.oro}`,
              overflow: 'hidden',
            }}
          >
            <Image
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 480px) 92vw, 400px"
              src={hero?.portraitImageId === undefined ? themeAsset('boda-serenidad', 'pareja-1.avif') : `/media/${hero.portraitImageId}`}
              style={{ objectFit: 'contain', objectPosition: 'center top' }}
            />
          </span>
        </Reveal>
      </div>

      {/* ── La cuenta atrás, sobre el velo blanco ── */}
      {schedule === undefined ? null : (
        <div style={{ padding: '20px 20px 0' }}>
          <Reveal>
            <div style={{ padding: '28px 16px', background: P.velo, borderRadius: 16 }}>
              <Arte ancho={130} estilo={{ margin: '0 auto 16px' }} src={themeAsset('boda-serenidad', 'reloj.avif')} />
              <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', textAlign: 'center', color: P.medio, fontWeight: 600 }}>
                {ROTULOS.faltan}
              </p>
              <Countdown
                cellStyle={{ padding: '0 4px' }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.medio, fontWeight: 600, marginTop: 4 }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 14 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: P.titular }}
              />
            </div>
          </Reveal>
        </div>
      )}

      {/* ── La frase y la historia, con su capitular ── */}
      <div style={{ padding: '32px 24px 0' }}>
        {quote === undefined ? null : (
          <Reveal>
            <p
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: 32,
                fontWeight: 500,
                lineHeight: 1.25,
                padding: '0 24px',
                color: P.titular,
                textAlign: 'center',
                whiteSpace: 'pre-line',
              }}
            >
              {quote.text}
            </p>
          </Reveal>
        )}
        {historia?.title === undefined ? null : (
          <Reveal>
            {/* La maqueta abre la historia sin rótulo, pero el editor pregunta por su título:
                un campo que se pide y no sale a ninguna parte es trabajo que el cliente hace
                para nadie. Va en la voz del diseño: monoespaciada, pequeña y espaciada. */}
            <p style={{ marginTop: 28, fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', color: P.medio, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase' }}>
              {historia.title}
            </p>
          </Reveal>
        )}
        {historia?.text === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.65, color: P.tinta }}>
              {/* La capitular de la maqueta: la primera letra, flotando a la izquierda. */}
              <span style={{ float: 'left', fontFamily: SERIF, fontSize: 64, fontWeight: 600, lineHeight: 0.85, paddingRight: 8, color: P.titular }}>
                {historia.text.slice(0, 1)}
              </span>
              {historia.text.slice(1)}
            </p>
          </Reveal>
        )}
      </div>

      {/* ── La tarjeta del invitado ── */}
      <Reveal>
        <div style={{ padding: '10px 24px 36px', display: 'flex', justifyContent: 'center' }}>
          {guestInfo === undefined ? (
            <div style={{ fontSize: 13, color: P.medio }}>{slots.guest}</div>
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: 320,
                border: `1px solid ${P.marino}`,
                background: P.papel,
                borderRadius: 4,
                padding: '34px 24px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: SERIF, fontSize: 17, letterSpacing: '0.12em', color: P.marino, textTransform: 'uppercase' }}>
                {guestInfo.label}
              </p>
              <span aria-hidden style={{ display: 'block', width: 46, height: 1, background: P.marino, margin: '16px auto' }} />
              <p style={{ fontSize: 11, letterSpacing: '0.2em', color: P.tintaTenue }}>{ROTULOS.reservado}</p>
              <p style={{ fontFamily: SERIF, fontSize: 52, color: P.marino, marginTop: 10, lineHeight: 1 }}>{guestInfo.seats}</p>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', color: P.tintaTenue, marginTop: 6 }}>{ROTULOS.pases}</p>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Los padres y los padrinos ── */}
      {hosts === undefined ? null : (
        <Reveal>
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            {hosts.label === undefined ? null : (
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.titular }}>{hosts.label}</p>
            )}
            <Familia nombres={papeles.novia} primero titulo={ROTULOS.padresNovia} />
            <Familia nombres={papeles.novio} titulo={ROTULOS.padresNovio} />
            {papeles.padrinos.length === 0 ? null : <Familia nombres={papeles.padrinos} titulo={ROTULOS.padrinos} />}
          </div>
        </Reveal>
      )}

      <Cenefa reflejada />

      {/* ── Ceremonia y recepción ── */}
      <Reveal>
        <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 36, alignItems: 'center' }}>
          {[
            { lugar: ceremony, icono: 'iglesia.avif' as const },
            { lugar: reception, icono: 'copas.avif' as const },
          ].map(({ lugar, icono }) =>
            lugar === undefined ? null : (
              <div key={icono} style={{ width: '100%', maxWidth: 320, textAlign: 'center', display: 'grid', justifyItems: 'center', rowGap: 12 }}>
                <Arte alto={186} ancho={186} src={themeAsset('boda-serenidad', icono)} />
                {lugar.label === undefined ? null : (
                  <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.titular }}>{lugar.label}</p>
                )}
                {lugar.time === undefined ? null : (
                  <p style={{ fontFamily: SERIF, fontSize: 30, color: P.titular, fontWeight: 700 }}>{lugar.time}</p>
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
                      border: `1.5px solid ${P.titular}`,
                      borderRadius: 30,
                      color: P.titular,
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

      <Cenefa />

      {/* ── El itinerario ── */}
      {itinerary === undefined || itinerary.length === 0 ? null : (
        <div style={{ padding: '0 24px' }}>
          <Reveal>
            <p style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.titular }}>
              {ROTULOS.itinerario}
              <span style={{ fontStyle: 'italic' }}>.</span>
            </p>
          </Reveal>
          <Reveal>
            <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 22 }}>
              {itinerary.map((fila) => (
                <div key={`${fila.time}-${fila.label}`} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span style={{ fontFamily: CALIGRAFIA, fontSize: 38, color: P.titular, width: 100, textAlign: 'right', flexShrink: 0 }}>
                    {fila.time}
                  </span>
                  <span aria-hidden style={{ display: 'block', width: 1, height: 34, background: P.oro, flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: P.titular, fontWeight: 600, textTransform: 'uppercase' }}>
                    {fila.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      )}

      <Cenefa reflejada />

      {/* ── El carrusel «Nosotros» ── */}
      <div style={{ padding: '44px 24px 0', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 52, color: P.titular }}>{ROTULOS.nosotros}</p>
        </Reveal>
        <Reveal>
          <CarruselDePerla
            borde={P.oro}
            flechaFondo="rgba(26,43,74,0.7)"
            flechaTinta="#ffffff"
            fotos={fotos}
            labels={{ anterior: themes.galleryPrev, siguiente: themes.galleryNext }}
            puntoActivo={P.titular}
            puntoInactivo="rgba(26,43,74,0.35)"
            sombra="rgba(184,150,12,0.3)"
          />
        </Reveal>
      </div>

      <Cenefa />

      <div style={{ padding: '0 24px' }}>
        {/* ── El código de vestimenta ── */}
        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              {dressCode.title === undefined ? null : (
                <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', color: P.medio, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase' }}>
                  {dressCode.title}
                </p>
              )}
              <p style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.titular }}>
                {ROTULOS.vestimenta}
                <span style={{ fontStyle: 'italic' }}>{ROTULOS.vestimentaCursiva}</span>
              </p>
              <Arte ancho={420} estilo={{ width: '78%', margin: '26px auto' }} src={themeAsset('boda-serenidad', 'vestimenta.avif')} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, width: '58%', margin: '22px auto 0' }}>
                {(dressCode.colors ?? CARTA_DE_COLOR.map((c) => c.color)).map((color) => (
                  <span key={color} style={{ textAlign: 'center', flex: 1 }}>
                    <span style={{ display: 'block', width: '100%', aspectRatio: '1/1', background: color, border: '1.5px solid #ffffff' }} />
                    <span style={{ display: 'block', marginTop: 3, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: P.tinta }}>
                      {(CARTA_DE_COLOR.find((c) => c.color === color)?.nombre ?? '').toUpperCase()}
                    </span>
                  </span>
                ))}
              </div>
              {dressCode.note === undefined ? null : (
                <p style={{ marginTop: 14, fontSize: 13, fontStyle: 'italic', color: P.tinta, lineHeight: 1.6, textAlign: 'center' }}>
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
              <Arte ancho={240} estilo={{ margin: '0 auto' }} src={themeAsset('boda-serenidad', 'tacon-y-corbatin.avif')} />
              <div style={{ maxWidth: '88%', margin: '16px auto 0', textAlign: 'center' }}>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.6, color: P.tinta }}>{soloAdultos.text}</p>
                {soloAdultos.title === undefined ? null : (
                  <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.3em', color: P.titular, fontWeight: 700, marginTop: 14, textTransform: 'uppercase' }}>
                    {soloAdultos.title}
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        )}

        <Cenefa />

        {/* ── La mesa de regalos ── */}
        <Reveal>
          <div style={{ marginTop: 60, marginBottom: 20, textAlign: 'center' }}>
            <Arte ancho={220} estilo={{ margin: '0 auto' }} src={themeAsset('boda-serenidad', 'regalo.avif')} />
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.titular, marginTop: 32 }}>{regalos?.title ?? ROTULOS.regalos}</p>
            {regalos?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.8, color: P.tinta, maxWidth: '72%', margin: '18px auto 0' }}>
                {regalos.text}
              </p>
            )}
            <div style={{ marginTop: 22 }}>{slots.registry}</div>
          </div>
        </Reveal>

        <Cenefa reflejada />

        {/* ── La canción ── */}
        {cancion === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <MusicPlayer
                accent={P.oro}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.marino}
                playIconColor="#ffffff"
                textColor={P.titular}
                track={music?.track ?? ''}
                trackColor={P.titular}
              />
            </div>
          </Reveal>
        )}

        {/* ── Confirmación ── */}
        <Reveal>
          <div style={{ marginTop: 8 }}>
            <p style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.titular }}>
              {ROTULOS.confirma}
              <span style={{ fontStyle: 'italic' }}>{ROTULOS.confirmaCursiva}</span>
            </p>
            <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
          </div>
        </Reveal>

        {/* ── Comparte tus fotos, con su cámara: solo si el plan trae las fotos de invitados ── */}
        {slots.photos === undefined ? null : (
          <>
            <Cenefa />
            <Reveal>
              <div style={{ marginTop: 8, padding: '32px 24px', textAlign: 'center' }}>
                <Arte ancho={220} estilo={{ margin: '0 auto' }} src={themeAsset('boda-serenidad', 'camara.avif')} />
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.titular, marginTop: 20 }}>{dictionary.photosTitle}</p>
                <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.8, maxWidth: '72%', margin: '18px auto 0', color: P.tinta }}>{dictionary.photosIntro}</p>
                <div style={{ marginTop: 22 }}>{slots.photos}</div>
              </div>
            </Reveal>
          </>
        )}

        <Cenefa />

        {/* ── El libro de firmas ── */}
        <Reveal>
          <div style={{ marginTop: 8, padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.titular }}>{ROTULOS.firmas}</p>
            <div style={{ marginTop: 18 }}>{slots.guestbook}</div>
          </div>
        </Reveal>

        <Cenefa reflejada />

        {/* ── El cierre ── */}
        <Reveal>
          <div style={{ marginTop: 8, padding: '32px 24px', textAlign: 'center' }}>
            {closing?.text === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 34, fontWeight: 500, color: P.titular }}>{closing.text}</p>
            )}
            <p style={{ marginTop: 20, fontFamily: MONO, fontSize: 16, letterSpacing: '0.35em', color: P.medio, fontWeight: 700, textTransform: 'uppercase' }}>
              {closing?.signature ?? nombres}
            </p>
            <div style={{ marginTop: 28 }}>{slots.pass}</div>
          </div>
        </Reveal>
      </div>
    </article>
  )
}

/**
 * La cenefa floral que separa los bloques, con el filete en el oro del diseño. La maqueta
 * la alterna reflejada, y así se lee como una guarda de revista y no como una repetición.
 */
function Cenefa({ reflejada = false }: { readonly reflejada?: boolean }) {
  // La franja de «caída de flores» (`FloralDivider` de `wedding-variants-4.jsx`, la que gana
  // en la maqueta porque se carga después que la de `flora-art.jsx`): 54 px de la fotografía
  // de la portada, desde arriba; `reflejada` la da la vuelta en vertical.
  return (
    <div aria-hidden style={{ position: 'relative', width: '100%', height: 54, overflow: 'hidden', opacity: 0.9, transform: reflejada ? 'scaleY(-1)' : undefined }}>
      <span style={{ position: 'absolute', left: 0, right: 0, top: -30, height: 220 }}>
        <Image alt="" fill sizes="480px" src={themeAsset('boda-serenidad', 'portada-flores.avif')} style={{ objectFit: 'cover', objectPosition: 'top' }} />
      </span>
    </div>
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
      <Image
        alt=""
        aria-hidden
        height={alto ?? ancho}
        sizes={`${ancho}px`}
        src={src}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        width={ancho}
      />
    </span>
  )
}

/** Un grupo de anfitriones: su rótulo, sus nombres y el filete que lo separa del siguiente. */
function Familia({
  titulo,
  nombres,
  primero = false,
}: {
  readonly titulo: string
  readonly nombres: readonly string[]
  readonly primero?: boolean
}) {
  if (nombres.length === 0) return null
  return (
    <>
      {primero ? null : <span aria-hidden style={{ display: 'block', width: 60, height: 1, background: P.medio, opacity: 0.5, margin: '28px auto' }} />}
      <p style={{ marginTop: primero ? 30 : 0, fontFamily: MONO, fontSize: 11, letterSpacing: '0.25em', color: P.medio, fontWeight: 600 }}>{titulo}</p>
      {nombres.map((nombre, indice) => (
        <p key={nombre} style={{ marginTop: indice === 0 ? 10 : 4, fontSize: 17, color: P.tinta }}>
          {nombre}
        </p>
      ))}
    </>
  )
}
