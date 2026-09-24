import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda, type ItineraryRow } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { CarruselNosotros } from './CarruselNosotros'
import { CinematicaCover } from './CinematicaCover'
import { CARTA_DE_COLOR, PALETA as P } from './boda-cin.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SERIF = 'var(--font-spectral)'
const CORMORANT = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/** Las cuatro fotos del carrusel «Nosotros», en el orden de la maqueta. */
const CARRUSEL = ['novios-negro-3.avif', 'novios-negro-2.avif', 'novios-negro-4.avif', 'novios-negro-1.avif'] as const

/** Las piezas doradas que flotan, como en la maqueta (`floatIcon`). */
const FLOTA = 'theme-flota'

/**
 * El icono de un hito: la casilla `0` a `5` de la lámina dorada (iglesia, camarero, baile,
 * cena, torta, novios), o `copas` y `auto`, que van sueltos. Sin clave, la casilla del orden.
 */
function IconoDelHito({ fila, indice }: { readonly fila: ItineraryRow; readonly indice: number }) {
  const clave = fila.imageId ?? String(indice % 6)
  const lado = clave === 'auto' ? 87 : 67
  const suelto = clave === 'auto' ? 'auto-dorado-sf.avif' : clave === 'copas' ? 'copas-black-sf.avif' : null
  const casilla = Number.parseInt(clave, 10)
  const posicion = Number.isNaN(casilla) ? indice % 6 : casilla % 6
  return (
    <div aria-hidden style={{ width: lado, height: lado, overflow: 'hidden', position: 'relative' }}>
      {suelto === null ? (
        <Image
          alt=""
          height={134}
          src={themeAsset('boda-cin', 'iconos-dorados-sf.avif')}
          style={{
            position: 'absolute',
            width: '300%',
            height: '200%',
            left: `${-(posicion % 3) * 100}%`,
            top: `${-Math.floor(posicion / 3) * 100}%`,
            objectFit: 'contain',
          }}
          width={201}
        />
      ) : (
        <Image alt="" height={lado} src={themeAsset('boda-cin', suelto)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} width={lado} />
      )}
    </div>
  )
}

/**
 * «Cinemática» — Sofía & Diego, de `wedding-variants-9.jsx` (maqueta V3).
 *
 * El póster de cine de la portada abre a un programa de gala en negro y oro: la mancheta, el
 * retrato enmarcado, el reloj, la cuenta atrás entre filetes, la cita con capitular, las
 * tarjetas de ceremonia y recepción con sus piezas doradas flotando, el itinerario sobre un
 * eje vertical con los iconos de la lámina, el carrusel «Nosotros» y los bloques finales.
 *
 */
export function BodaCinView({ content, event, dictionary, themes, slots, guestInfo, audioSrc }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, music, dressCode, gallery, notes, closing } = content

  const [titular = '', firma = '', ...parrafos] = (quote?.text ?? '').split('\n\n')
  const historia = parrafos.join('\n\n')
  const capitular = historia.slice(0, 1)
  const cuerpo = historia.slice(1)

  const portada = gallery?.[0]
  const nosotros = gallery?.[1]
  const fotosNosotros = CARRUSEL.map((archivo, i) => {
    const foto = gallery?.[i + 1]
    return foto?.imageId === undefined ? themeAsset('boda-cin', archivo) : `/media/${foto.imageId}`
  })
  const invitacion = notes?.[0]
  const soloAdultos = notes?.[1]
  const regalos = notes?.[2]
  const fotos = notes?.[3]

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const fechaLarga =
    cuando === null || Number.isNaN(cuando.getTime())
      ? ''
      : cuando.toLocaleDateString(event.locale === 'en' ? 'en-US' : 'es-BO', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const nombres = [hero?.nameA, hero?.nameB?.replace(/^&\s*/, '')].filter((nombre) => nombre !== undefined && nombre !== '').join(' & ')

  const tarjetas = [
    { lugar: ceremony, icono: 'templo-dorado-sf.avif' as const },
    { lugar: reception, icono: 'copas-doradas-sf.avif' as const },
  ].filter((tarjeta) => tarjeta.lugar !== undefined)

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  // La maqueta no dibuja reproductor: sale solo si la boda tiene su canción.
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ sobreAcento: P.fondo, acento: P.oro, acentoHondo: P.crema, display: SERIF, tinta: P.papel }),
  )

  const BOTON = {
    background: P.oro,
    color: P.fondo,
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: '0.15em',
    fontWeight: 700,
    padding: '11px 16px',
    borderRadius: 24,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  } as const

  return (
    <article
      style={{
        ...RANURAS,
        // Las píldoras de «Asistiré» y «No puedo», a la medida de su maqueta.
        ['--rsvp-py' as string]: '15.5px',
        ['--rsvp-fs' as string]: '11px',
        position: 'relative',
        // Negro liso: la maqueta declara una foto de fondo fija, pero queda detrás de este
        // mismo negro (`z-index: -1` bajo un contenedor opaco) y no se ve en ninguna página.
        background: P.fondo,
        color: P.papel,
        fontFamily: CORMORANT,
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      <CinematicaCover
        accent={P.oro}
        bg={P.fondo}
        bgAsset={themeAsset('boda-cin', 'portada-negra-dorada.avif')}
        eyebrow={hero?.eyebrow ?? ''}
        fecha={fechaLarga}
        hint={themes.coverEnterShared}
        names={nombres}
        openLabel={themes.coverAria}
      />

      <ThemeColumn>
        {/* La mancheta. */}
        <div style={{ padding: '36px 24px', position: 'relative', textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 200, letterSpacing: '0.04em', lineHeight: 0.95, color: P.papel }}>
            {hero?.eyebrow ?? ''}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 8, color: P.oro }}>{hero?.monogram ?? ''}</div>
          <div style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600, color: P.papel }}>{fechaLarga}</div>
        </div>

        {/* El retrato enmarcado y los nombres. */}
        <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              top: 24,
              bottom: 76,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '72%',
              borderRadius: 8,
              border: `1.5px solid ${P.oro}`,
              overflow: 'hidden',
            }}
          >
            <PhotoSlot
              bg="transparent"
              border="none"
              color={P.crema}
              height="100%"
              label={portada?.label ?? themes.portraitPlaceholder}
              radius={0}
              src={portada?.imageId === undefined ? themeAsset('boda-cin', 'novios-negro-5.avif') : `/media/${portada.imageId}`}
              width="100%"
            />
          </div>
          <div
            aria-hidden
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160, background: `linear-gradient(180deg, transparent 0%, ${P.fondo} 92%)` }}
          />
          <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
            <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 200, fontSize: 56, color: P.oro, lineHeight: 0.9, margin: 0 }}>
              {hero?.nameA ?? ''}
              {hero?.nameB === undefined ? null : (
                <>
                  <br />
                  <span style={{ fontStyle: 'normal', fontWeight: 400 }}>{hero.nameB}</span>
                </>
              )}
            </h1>
            <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.crema }}>{hero?.serial ?? ''}</div>
          </div>
        </div>

        {schedule === undefined ? null : (
          <>
            <Reveal>
              <div style={{ padding: '20px 24px 0', textAlign: 'center' }}>
                <Image
                  alt=""
                  height={96}
                  src={themeAsset('boda-cin', 'reloj-black-sf.avif')}
                  style={{ width: 96, height: 'auto', display: 'block', margin: '0 auto' }}
                  width={96}
                />
              </div>
            </Reveal>
            <Reveal>
              <div style={{ padding: '28px 24px', borderTop: `1.5px solid ${P.oro}`, borderBottom: `1.5px solid ${P.oro}` }}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', textAlign: 'center', color: P.oro, fontWeight: 600 }}>
                  · {themes.countdownPrefix.toUpperCase()} ·
                </div>
                <Countdown
                  labels={{ days: themes.countdownDays, hours: themes.countdownHoursLong, mins: themes.countdownMins, secs: themes.countdownSecs }}
                  labelStyle={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.35em', color: P.oro, fontWeight: 600, marginTop: 4 }}
                  rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 14 }}
                  targetISO={schedule.startsAt}
                  valueStyle={{ fontFamily: SERIF, fontSize: 52, color: P.papel }}
                />
              </div>
            </Reveal>
          </>
        )}

        <div style={{ padding: '32px 24px 0', position: 'relative' }}>
          {titular === '' ? null : (
            <Reveal>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 33, fontWeight: 500, lineHeight: 1.25, padding: '0 24px', color: P.papel }}>
                {titular.split('\n').map((linea, i) => (
                  <span key={`${i}-${linea}`} style={{ display: 'block' }}>
                    {linea}
                  </span>
                ))}
              </div>
              {firma === '' ? null : (
                <div style={{ marginTop: 10, padding: '0 24px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.3em', color: P.oro }}>{firma}</div>
              )}
            </Reveal>
          )}
          {historia === '' ? null : (
            <Reveal>
              <div style={{ marginTop: 28, fontSize: 15.5, lineHeight: 1.65, color: P.crema }}>
                <span style={{ float: 'left', fontFamily: SERIF, fontSize: 76, fontWeight: 600, lineHeight: 0.8, paddingRight: 8, color: P.oro }}>
                  {capitular}
                </span>
                {cuerpo}
              </div>
            </Reveal>
          )}
        </div>

        {/* A quién va dirigida: el cuadro de la invitación, el nombre y los pases. */}
        <Reveal>
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            {invitacion?.text === undefined ? null : (
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 17,
                  lineHeight: 1.9,
                  maxWidth: '76%',
                  margin: '0 auto',
                  color: P.papel,
                  background: P.tarjeta,
                  border: `1px solid ${P.oro}`,
                  borderRadius: 12,
                  padding: '18px 20px',
                }}
              >
                {invitacion.text}
              </div>
            )}
            {guestInfo === undefined ? (
              slots.guest
            ) : (
              <>
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.oro, marginTop: 30 }}>{guestInfo.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 14, color: P.oro, fontWeight: 600 }}>{themes.reservedForYou}</div>
                <div style={{ fontFamily: SERIF, fontSize: 56, color: P.papel, marginTop: 14 }}>{guestInfo.seats}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 8, color: P.oro, fontWeight: 600 }}>{themes.passes}</div>
              </>
            )}
          </div>
        </Reveal>

        {hosts === undefined ? null : (
          <Reveal>
            <div style={{ padding: '40px 24px', margin: '30px 0', borderTop: `2px solid ${P.oro}`, borderBottom: `2px solid ${P.oro}` }}>
              {hosts.label === undefined ? null : (
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 31, fontWeight: 500, textAlign: 'center', color: P.papel }}>{hosts.label}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 32 }}>
                {[
                  { rotulo: themes.brideParents, nombres: anfitrionesBoda(hosts).novia },
                  { rotulo: themes.groomParents, nombres: anfitrionesBoda(hosts).novio },
                ].map((grupo) =>
                  grupo.nombres.length === 0 ? null : (
                    <div key={grupo.rotulo} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', color: P.oro, fontWeight: 600 }}>{grupo.rotulo}</div>
                      {grupo.nombres.map((nombre, i) => (
                        <div key={nombre} style={{ fontFamily: SERIF, fontSize: 17.5, color: P.crema, marginTop: i === 0 ? 10 : 0, lineHeight: 1.6 }}>
                          {nombre}
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
              {anfitrionesBoda(hosts).padrinos.length === 0 ? null : (
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', color: P.oro, fontWeight: 600 }}>{themes.godparents}</div>
                  {anfitrionesBoda(hosts).padrinos.map((nombre, i) => (
                    <div key={nombre} style={{ fontFamily: SERIF, fontSize: 17.5, color: P.crema, marginTop: i === 0 ? 10 : 0, lineHeight: 1.6 }}>
                      {nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}

        {tarjetas.length === 0 ? null : (
          <Reveal>
            <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
              {tarjetas.map((tarjeta) => (
                <div
                  key={tarjeta.icono}
                  style={{
                    width: '100%',
                    maxWidth: 340,
                    background: P.tarjeta,
                    border: `1.5px solid ${P.oro}`,
                    borderRadius: 16,
                    padding: '28px 8px 22px',
                    textAlign: 'center',
                    display: 'grid',
                    gridTemplateRows: '184px auto auto auto 1fr auto',
                    justifyItems: 'center',
                    rowGap: 16,
                  }}
                >
                  <Image
                    alt=""
                    className={FLOTA}
                    height={184}
                    src={themeAsset('boda-cin', tarjeta.icono)}
                    style={{ width: 184, height: 184, objectFit: 'contain' }}
                    width={184}
                  />
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.oro, whiteSpace: 'nowrap' }}>{tarjeta.lugar?.label ?? ''}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 33, color: P.papel }}>{tarjeta.lugar?.time ?? ''}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', color: P.crema, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {(tarjeta.lugar?.place ?? '').toUpperCase()}
                  </div>
                  <div />
                  {llegarA(tarjeta.lugar) === null ? (
                    <div />
                  ) : (
                    <a href={llegarA(tarjeta.lugar) ?? ''} rel="noopener noreferrer" style={BOTON} target="_blank">
                      {themes.viewLocation}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {itinerary === undefined ? null : (
          <div style={{ padding: '0 24px', position: 'relative' }}>
            <Reveal>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 44, textAlign: 'center', color: P.oro }}>
                {themes.itinerary.charAt(0).toUpperCase() + themes.itinerary.slice(1).toLowerCase()}
              </div>
            </Reveal>
            <Reveal>
              <div style={{ position: 'relative', maxWidth: '70%', margin: '20px auto 0' }}>
                <div aria-hidden style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: P.oro, transform: 'translateX(-1px)' }} />
                <div aria-hidden style={{ position: 'absolute', left: '50%', top: -4, width: 10, height: 10, borderRadius: '50%', background: P.oro, transform: 'translateX(-50%)' }} />
                <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: -4, width: 10, height: 10, borderRadius: '50%', background: P.oro, transform: 'translateX(-50%)' }} />
                <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {itinerary.map((fila, i) => {
                  const izquierda = i % 2 === 0
                  return (
                    <li key={`${fila.time}-${fila.label}`} style={{ position: 'relative', display: 'flex', justifyContent: izquierda ? 'flex-end' : 'flex-start' }}>
                      <div aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, borderRadius: '50%', background: P.oro, transform: 'translate(-50%,-50%)' }} />
                      <div
                        style={{
                          width: '50%',
                          ...(izquierda ? { paddingRight: 10 } : { paddingLeft: 10 }),
                          textAlign: izquierda ? 'right' : 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: izquierda ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <IconoDelHito fila={fila} indice={i} />
                        <div style={{ fontFamily: SERIF, fontSize: 15, color: P.blanco, lineHeight: 1.1 }}>{fila.label}</div>
                        <div aria-hidden style={{ width: '70%', borderTop: `1px dashed ${P.guion}`, margin: '2px 0' }} />
                        <div style={{ fontFamily: MONO, fontSize: 13, color: P.blanco, fontWeight: 700, lineHeight: 1.1 }}>{fila.time}</div>
                      </div>
                    </li>
                  )
                })}
                </ol>
              </div>
            </Reveal>
          </div>
        )}

        {cancion === undefined ? null : (
          <Reveal>
            <div style={{ margin: '40px 24px 0', borderRadius: 999, background: P.tarjeta, boxShadow: `inset 0 0 0 1.5px ${P.oro}` }}>
              <MusicPlayer
                accent={P.oro}
                artist={music?.artist ?? ''}
                artistColor={P.crema}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.oro}
                playIconColor={P.fondo}
                textColor={P.papel}
                track={music?.track ?? ''}
                trackColor={P.papel}
              />
            </div>
          </Reveal>
        )}

        {nosotros === undefined ? null : (
          <div style={{ padding: '44px 0 0', textAlign: 'center' }}>
            <Reveal>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 56, color: P.oro }}>{nosotros.label}</div>
            </Reveal>
            <Reveal>
              <CarruselNosotros
                flechaFondo={P.flechaFondo}
                fotos={fotosNosotros}
                labels={{ anterior: themes.galleryPrev, siguiente: themes.galleryNext }}
                oro={P.oro}
              />
            </Reveal>
          </div>
        )}

        <div style={{ padding: '0 24px' }}>
          {dressCode === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 40 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', color: P.oro, fontWeight: 600, textAlign: 'center' }}>
                  {dressCode.note ?? themes.dressCode}
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.papel }}>
                  <ConCursivaFinal texto={dressCode.title ?? ''} />
                </div>
                <Image
                  alt=""
                  className={FLOTA}
                  height={300}
                  src={themeAsset('boda-cin', 'trajes-dorados-sf.avif')}
                  style={{ width: '70%', height: 'auto', display: 'block', margin: '26px auto' }}
                  width={300}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, width: '58%', margin: '22px auto 0' }}>
                  {CARTA_DE_COLOR.map((muestra) => (
                    <div key={muestra.nombre} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ width: '100%', aspectRatio: '1/1', background: muestra.color, border: `1px solid ${P.fileteMuestra}` }} />
                      <div style={{ marginTop: 3, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: P.crema }}>{muestra.nombre.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 13, fontStyle: 'italic', color: P.crema, lineHeight: 1.6, textAlign: 'center' }}>{dressCode.detail ?? ''}</div>
                <PaletaDeColores etiqueta={themes.suggestedColors} borde="currentColor" colores={dressCode.colors} />
              </div>
            </Reveal>
          )}

          {soloAdultos === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 60, marginBottom: 20, padding: '0 10px' }}>
                <div style={{ background: P.tarjeta, border: `1.5px solid ${P.oro}`, borderRadius: 16, padding: '30px 20px', textAlign: 'center' }}>
                  <Image
                    alt=""
                    className={FLOTA}
                    height={208}
                    src={themeAsset('boda-cin', 'taco-gato-sf.avif')}
                    style={{ width: 208, height: 'auto', display: 'block', margin: '0 auto' }}
                    width={208}
                  />
                  <div style={{ maxWidth: '88%', margin: '16px auto 0' }}>
                    {soloAdultos.text === undefined ? null : (
                      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.7, color: P.papel }}>{soloAdultos.text}</div>
                    )}
                    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.35em', color: P.oro, fontWeight: 700, marginTop: 14 }}>{soloAdultos.title}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          {/* La mesa de regalos: el dibujo, el rótulo y el texto son del diseño; la lista, nuestra. */}
          <Reveal>
            <div style={{ marginTop: 60, marginBottom: 20, textAlign: 'center' }}>
              <Image
                alt=""
                className={FLOTA}
                height={240}
                src={themeAsset('boda-cin', 'regalo-sf.avif')}
                style={{ width: 240, height: 'auto', display: 'block', margin: '0 auto' }}
                width={240}
              />
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.oro, marginTop: 32 }}>{regalos?.title ?? themes.gifts}</div>
              {regalos?.text === undefined ? null : (
                <div style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.8, color: P.crema, maxWidth: '72%', margin: '18px auto 0' }}>{regalos.text}</div>
              )}
              <div style={{ marginTop: 22 }}>{slots.registry}</div>
            </div>
          </Reveal>

          <Reveal>
            <div style={{ marginTop: 40 }}>
              <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, lineHeight: 1, marginTop: 8, textAlign: 'center', color: P.papel }}>
                <ConCursivaFinal texto={dictionary.title.charAt(0).toUpperCase() + dictionary.title.slice(1).toLowerCase()} />
              </div>
              <div style={{ marginTop: 18 }}>{slots.rsvp}</div>
            </div>
          </Reveal>

          {fotos === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 50, padding: '32px 24px', borderTop: `1.5px solid ${P.oro}`, textAlign: 'center', position: 'relative' }}>
                <Image
                  alt=""
                  className={FLOTA}
                  height={225}
                  src={themeAsset('boda-cin', 'camara-dorada-sf.avif')}
                  style={{ width: 225, height: 'auto', display: 'block', margin: '0 auto' }}
                  width={225}
                />
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.oro, marginTop: 20 }}>{fotos.title}</div>
                {fotos.text === undefined ? null : (
                  <div style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.8, maxWidth: '72%', margin: '18px auto 0', color: P.crema }}>{fotos.text}</div>
                )}
                <div style={{ marginTop: 22 }}>{slots.photos}</div>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div style={{ marginTop: 40 }}>{slots.guestbook}</div>
          </Reveal>

          <div style={{ marginTop: 28 }}>{slots.pass}</div>

          {/* La contraportada. */}
          <Reveal>
            <div style={{ marginTop: 50, padding: '64px 24px', borderTop: `2px solid ${P.oro}`, textAlign: 'center' }}>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 33, fontWeight: 500, color: P.papel }}>{closing?.text ?? ''}</div>
              <div style={{ marginTop: 20, fontFamily: MONO, fontSize: 16, letterSpacing: '0.35em', color: P.oro, fontWeight: 700 }}>{closing?.signature ?? ''}</div>
            </div>
          </Reveal>
        </div>
      </ThemeColumn>
    </article>
  )
}

/** «Código de vestimenta.» con la última palabra en cursiva, como la compone la maqueta. */
function ConCursivaFinal({ texto }: { readonly texto: string }) {
  const corte = texto.trimEnd().lastIndexOf(' ')
  if (corte === -1) return <span style={{ fontStyle: 'italic' }}>{texto}.</span>
  return (
    <>
      {texto.slice(0, corte + 1)}
      <span style={{ fontStyle: 'italic' }}>{texto.slice(corte + 1).trimEnd()}.</span>
    </>
  )
}
