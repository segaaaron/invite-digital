import { comoLlegar } from '../../../domain/ubicacion'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { MusicPlayer } from '../kit/MusicPlayer'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { CumpleBeerCover } from './CumpleBeerCover'
import { PALETA as P } from './cumple-beer.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SANS = 'var(--font-dm-sans)'
const CALIGRAFIA = 'var(--font-great-vibes)'
const TITULAR = 'var(--font-cinzel)'

/**
 * Cómo llama **este** diseño a sus secciones.
 *
 * No son traducciones —para eso está el diccionario—, son la voz del diseño, y por eso
 * viven con él. Lo que no esté aquí cae al diccionario.
 */
const ROTULOS = {
  celebracion: 'La Celebración',
  confirma: 'CONFIRMA TU LUGAR EN LA BARRA',
  guestbook: 'Déjame un Mensaje',
} as const

/** Las espigas de cebada de las esquinas: el marco del diseño, repetido en tres bloques. */
function Espigas() {
  return (
    <>
      <span aria-hidden style={{ position: 'absolute', top: 6, left: 8, fontSize: 15, opacity: 0.55 }}>
        🌾
      </span>
      <span aria-hidden style={{ position: 'absolute', top: 6, right: 8, fontSize: 15, opacity: 0.55, transform: 'scaleX(-1)' }}>
        🌾
      </span>
    </>
  )
}

/** El filete con la hoja aldina: separa un bloque del siguiente. */
function Filete() {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '22px 0' }}>
      <div style={{ width: 50, height: 1, background: P.oro, opacity: 0.5 }} />
      <span style={{ color: P.oro, fontSize: 14, opacity: 0.85 }}>❧</span>
      <div style={{ width: 50, height: 1, background: P.oro, opacity: 0.5 }} />
    </div>
  )
}

/**
 * «Cervecería Vintage» — el cumpleaños de Miguel, de `invites-4.jsx:479`
 * (`BeerBirthdayInvite`).
 *
 * Una taberna de barrica y cebada: madera oscura con duelas, oro de etiqueta y crema de
 * espuma. Es el primer diseño de la colección que no es ni boda ni XV, así que no tiene
 * anfitriones, ni ceremonia, ni itinerario, ni código de vestimenta: quién cumple, cuándo,
 * dónde se bebe y quién canta.
 *
 * **Los dos avisos tienen su sitio y no se intercambian**: el primero es la frase de
 * arriba con su párrafo, y el segundo, el del karaoke. Se leen por índice porque en la
 * maqueta son dos bloques distintos del diseño, no una lista.
 */
export function CumpleBeerView({ content, event, themes, slots, audioSrc }: ThemeProps) {
  const { hero, quote, schedule, reception, map, music, notes, closing } = content

  const bienvenida = notes?.[0]
  const karaoke = notes?.[1]

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const fecha = (opciones: Intl.DateTimeFormatOptions) =>
    cuando === null || Number.isNaN(cuando.getTime()) ? '' : cuando.toLocaleDateString(etiquetaLocal, opciones)
  const diaSemana = fecha({ weekday: 'long' })
  const dia = fecha({ day: 'numeric' })
  // Mes y año por separado: en español, pedirlos juntos a `Intl` devuelve «septiembre de
  // 2026», y la maqueta escribe «SEPTIEMBRE 2026».
  const mesYAno = cuando === null ? '' : `${fecha({ month: 'long' })} ${fecha({ year: 'numeric' })}`

  // La dirección va escrita en varias líneas, y una búsqueda de Google con saltos dentro no
  // encuentra nada: para el mapa se aplana.
  const direccion = reception?.address ?? ''
  const lineas = direccion.split('\n').filter((linea) => linea.trim() !== '')
  // La tarjeta de la recepción la escribe en una línea —«Calle W. Z. Tovar #2045,
  // Cochabamba»— y el bloque de arriba entera, con sus tres renglones. Son los dos sitios
  // de la maqueta y el mismo dato: la corta es la calle y la ciudad.
  const direccionCorta = lineas.length < 2 ? direccion : `${lineas[0]}, ${lineas[lineas.length - 1]}`
  const respaldo = [reception?.place, direccion.replace(/\n+/g, ', ')].filter((parte) => parte !== undefined && parte !== '').join(', ')
  const llegar = comoLlegar({ href: map?.href, coords: map?.coords }, respaldo)

  /**
   * La canción que suena, si la hay. **El reproductor solo aparece con archivo detrás.**
   *
   * La maqueta de este diseño no lleva ninguno —es el único de la colección que no lo
   * pinta—, así que con el contenido de muestra se ve exactamente como ella; cuando el
   * cliente sube su MP3 (o el admin le pone música al modelo), el bloque del karaoke gana
   * su reproductor, que es donde tiene sentido.
   */
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  // Las cuatro piezas que no dibuja este diseño —RSVP, mesa de regalos, respuesta del libro
  // de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.oro, sobreAcento: P.madera, tinta: P.crema, display: TITULAR, radio: 14 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: `linear-gradient(180deg, ${P.madera}, ${P.maderaClara})`,
        color: P.crema,
        fontFamily: SANS,
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <CumpleBeerCover
        accent={P.oro}
        bg={P.madera}
        bgAsset={themeAsset('cumple-beer', 'portada-cumple.avif')}
        foto={hero?.coverImageId === undefined ? undefined : `/media/${hero.coverImageId}`}
        hint={themes.coverEnter}
        label={hero?.eyebrow ?? themes.coverOpen}
        name={hero?.nameA ?? ''}
        openLabel={themes.coverAria}
      />

      {/* Las duelas del barril: son lo que hace que el fondo se lea como madera. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(90deg, ${P.duelas} 0 2px, transparent 2px 40px)`,
          pointerEvents: 'none',
        }}
      />

      <ThemeColumn style={{ padding: '40px 26px 60px' }}>
        {/* ── La cuenta atrás, bajo el reloj de la taberna ── */}
        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ position: 'relative', padding: '10px 0 0', textAlign: 'center' }}>
              <Espigas />
              {/* eslint-disable-next-line @next/next/no-img-element -- arte del tema en
                  `public/temas`, con su tamaño fijo: el optimizador no aporta nada. */}
              <img
                alt=""
                aria-hidden
                src={themeAsset('cumple-beer', 'reloj-beer.avif')}
                style={{ width: 110, display: 'block', margin: '0 auto' }}
              />
              <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 14, letterSpacing: '0.5em', color: P.oro, textTransform: 'uppercase' }}>
                · {themes.countdownPrefix} ·
              </div>
              <Countdown
                cellStyle={{
                  textAlign: 'center',
                  padding: '14px 2px',
                  borderRadius: '50%',
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1.5px solid ${P.oro}`,
                  background: P.vidrioFuerte,
                }}
                labels={{
                  days: themes.countdownDays,
                  hours: themes.countdownHours,
                  mins: themes.countdownMins,
                  secs: themes.countdownSecs,
                }}
                labelStyle={{ fontFamily: MONO, fontSize: 7, marginTop: 2, letterSpacing: '0.15em', opacity: 0.75 }}
                rowStyle={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: TITULAR, fontSize: 22, fontWeight: 700, color: P.oro }}
              />
            </div>
          </Reveal>
        )}

        {bienvenida === undefined ? null : (
          <>
            <Filete />
            <Reveal delay={100}>
              <div style={{ textAlign: 'center', padding: '0 8px' }}>
                {bienvenida.title === undefined ? null : (
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 36, lineHeight: 1.25, color: P.oro, whiteSpace: 'pre-line' }}>
                    {bienvenida.title}
                  </div>
                )}
                {bienvenida.text === undefined ? null : (
                  <div style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>{bienvenida.text}</div>
                )}
                {/* A quién va dirigida, aquí y no junto al RSVP: el propio formulario lo
                    repite arriba de sus botones, y pegados se leía dos veces seguidas. */}
                <div style={{ marginTop: 18, fontSize: 13, opacity: 0.85 }}>{slots.guest}</div>
              </div>
            </Reveal>
          </>
        )}

        {/* ── Cuándo: el tarro con las velas y la fecha en grande ── */}
        <Reveal>
          <div style={{ position: 'relative', marginTop: 48, textAlign: 'center' }}>
            <Espigas />
            <div style={{ maxWidth: 400, margin: '0 auto', borderRadius: 8, overflow: 'hidden', border: `1px solid ${P.filete}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- arte del tema. */}
              <img
                alt=""
                aria-hidden
                src={themeAsset('cumple-beer', 'cerveza-pastel.avif')}
                style={{ width: '100%', display: 'block' }}
              />
            </div>
            <h1 style={{ marginTop: 18, fontFamily: CALIGRAFIA, fontSize: 40, fontWeight: 400, color: P.oro }}>
              {ROTULOS.celebracion}
            </h1>
            {cuando === null ? null : (
              <>
                <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 12, letterSpacing: '0.4em', color: P.oro, textTransform: 'uppercase' }}>
                  {diaSemana}
                </div>
                <div style={{ fontFamily: TITULAR, fontWeight: 700, fontSize: 72, lineHeight: 1, color: P.crema }}>{dia}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.4em', color: P.oro, textTransform: 'uppercase' }}>
                  {mesYAno}
                </div>
              </>
            )}
            {reception?.time === undefined ? null : (
              <div style={{ marginTop: 12, fontSize: 15, opacity: 0.85 }}>{reception.time}</div>
            )}
          </div>
        </Reveal>

        <Filete />

        {/* ── Dónde: la dirección y el botón que abre el mapa ── */}
        {direccion === '' ? null : (
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{direccion}</div>
              {llegar === null ? null : (
                <a
                  href={llegar}
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 18,
                    padding: '13px 32px',
                    background: P.oro,
                    color: P.madera,
                    borderRadius: 24,
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: '0.25em',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                  target="_blank"
                >
                  {themes.viewLocation}
                </a>
              )}
            </div>
          </Reveal>
        )}

        {reception === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 30,
                padding: '22px 20px',
                borderRadius: 14,
                border: `1px solid ${P.fileteSuave}`,
                background: P.vidrio,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro }}>{reception.label ?? themes.reception}</div>
                <span aria-hidden style={{ fontSize: 66, lineHeight: 1 }}>
                  🍺
                </span>
              </div>
              {reception.place === undefined ? null : (
                <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: P.crema }}>{reception.place}</div>
              )}
              {direccion === '' ? null : <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{direccionCorta}</div>}
              {reception.time === undefined ? null : (
                <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 13, color: P.oro }}>{reception.time}</div>
              )}
              {map === undefined ? null : (
                <>
                  <div aria-hidden style={{ marginTop: 16, height: 1, background: P.fileteSuave }} />
                  <div style={{ marginTop: 16 }}>
                    <MapPreview
                      accent={P.oro}
                      border={P.filete}
                      coords={map.coords ?? ''}
                      coordsColor={P.oro}
                      directionsLabel={themes.viewLocation}
                      href={map.href}
                      label={map.label ?? ''}
                      labelColor={P.crema}
                      pinDot={P.madera}
                      pinRing={P.madera}
                      respaldo={respaldo}
                    />
                  </div>
                </>
              )}
            </div>
          </Reveal>
        )}

        {/* El filete de las hojas de lúpulo: el que separa el lugar de la música. */}
        <div aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '26px 0' }}>
          <div style={{ width: 40, height: 1, background: P.oro, opacity: 0.5 }} />
          <span style={{ color: P.oro, fontSize: 16 }}>🌿</span>
          <span style={{ color: P.oro, fontSize: 14 }}>❧</span>
          <span style={{ color: P.oro, fontSize: 16 }}>🌿</span>
          <div style={{ width: 40, height: 1, background: P.oro, opacity: 0.5 }} />
        </div>

        {/* ── El karaoke, y debajo la canción que suena ── */}
        {karaoke === undefined ? null : (
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- arte del tema. */}
              <img
                alt=""
                aria-hidden
                src={themeAsset('cumple-beer', 'karaoke-beer.avif')}
                style={{ width: 156, display: 'block', margin: '0 auto' }}
              />
              {karaoke.title === undefined ? null : (
                <div style={{ marginTop: 12, fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro }}>{karaoke.title}</div>
              )}
              {karaoke.text === undefined ? null : (
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, opacity: 0.85, padding: '0 10px' }}>{karaoke.text}</div>
              )}
            </div>
          </Reveal>
        )}

        {cancion === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 22,
                padding: '16px 18px',
                borderRadius: 14,
                border: `1px solid ${P.fileteSuave}`,
                background: P.vidrio,
              }}
            >
              <MusicPlayer
                accent={P.oro}
                artist={music?.artist ?? ''}
                artistColor={P.crema}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.oro}
                playIconColor={P.madera}
                textColor={P.crema}
                track={music?.track ?? ''}
                trackColor={P.crema}
              />
            </div>
          </Reveal>
        )}

        {/* ── Confirmar ── */}
        {quote === undefined ? null : (
          <Reveal>
            <div style={{ position: 'relative', marginTop: 48, textAlign: 'center' }}>
              <Espigas />
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, lineHeight: 1.35, color: P.oro, whiteSpace: 'pre-line' }}>
                {quote.text}
              </div>
            </div>
          </Reveal>
        )}

        <Filete />

        <Reveal>
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '0.3em', color: P.oro, marginBottom: 14 }}>
            {ROTULOS.confirma}
          </div>
          {slots.rsvp}
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 30, textAlign: 'center' }}>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro, marginBottom: 14 }}>{ROTULOS.guestbook}</div>
            {slots.guestbook}
          </div>
        </Reveal>

        {/* La mesa de regalos no está en la maqueta —un cumpleaños entre amigos no la suele
            tener—, pero es nuestra y el atelier puede cargarla: va con la piel del diseño y
            sin ella el bloque no pinta nada. */}
        <Reveal>
          <div style={{ marginTop: 28 }}>{slots.registry}</div>
        </Reveal>

        <div style={{ marginTop: 28 }}>{slots.pass}</div>

        {closing === undefined ? null : (
          <div style={{ marginTop: 34, textAlign: 'center' }}>
            {closing.text === undefined ? null : (
              <div style={{ fontSize: 15, color: P.oro }}>
                {closing.text}{' '}
                <span aria-hidden style={{ fontSize: 45 }}>
                  🍻
                </span>
              </div>
            )}
            {closing.signature === undefined ? null : (
              <Reveal>
                <div style={{ marginTop: 24, fontFamily: TITULAR, fontWeight: 700, fontSize: 40, letterSpacing: '0.05em', color: P.crema }}>
                  {closing.signature}
                </div>
              </Reveal>
            )}
          </div>
        )}
      </ThemeColumn>
    </article>
  )
}
