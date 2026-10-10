import Image from '@/shared/design/ui/ImagenQueAparece'
import { THEME_ASSETS, themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda, type PlaceBlock } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { MarcoQr } from '../kit/MarcoQr'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { BotanicaCover } from './BotanicaCover'
import { FloralCorner } from '../kit/flora/FloralArt'
import { IconoGardenia } from './IconosGardenia'
import { alfaDe, CARTA_DE_COLOR, PALETA as P } from './boda-bot.palette'

/** Las tres del collage, en el orden de la maqueta: anillos, mesa y pastel. */
const COLLAGE = ['boda-03-anillos.avif', 'boda-05-mesa.avif', 'boda-04-pastel.avif'] as const

const SPECTRAL = 'var(--font-spectral)'
const MONTSERRAT = 'var(--font-montserrat)'
const CORMORANT = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'
const PLAYFAIR = 'var(--font-playfair-display)'

/** El rótulo pequeño de la maqueta: Montserrat espaciado, en salvia. */
const rotulo = (size: number, espaciado: string, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: MONTSERRAT,
  fontSize: size,
  letterSpacing: espaciado,
  color: P.salvia,
  ...extra,
})

/**
 * Las rosas blancas de la maqueta (`white_roses_p1`), que flotan entre secciones. La posición va
 * en un contenedor: la animación de flotar es un `transform` y pisaría el espejo.
 */
function Rosas({ ancho, estilo, espejo = false }: { readonly ancho: string; readonly estilo?: React.CSSProperties; readonly espejo?: boolean }) {
  return (
    <div aria-hidden style={{ width: ancho, ...estilo, ...(espejo ? { transform: 'scaleX(-1)' } : {}) }}>
      <Image
        alt=""
        className="theme-flota"
        height={611}
        src={themeAsset('boda-bot', 'rosas-blancas-sf.avif')}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        width={800}
      />
    </div>
  )
}

/** Un dibujo de la maqueta teñido de salvia por máscara (allí, `filter` sobre el dorado). */
function Dibujo({
  archivo,
  ancho,
  proporcion,
  estilo,
}: {
  readonly archivo: (typeof THEME_ASSETS)['boda-bot'][number]
  readonly ancho: number
  readonly proporcion: number
  readonly estilo?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden
      style={{
        width: ancho,
        height: Math.round(ancho * proporcion),
        margin: '0 auto',
        background: P.salvia,
        maskImage: `url("${themeAsset('boda-bot', archivo)}")`,
        maskSize: 'contain',
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        ...estilo,
      }}
    />
  )
}

/**
 * «Gardenia» — Marcia & Ricardo, calcada de `WeddingBotanicalVN` (`wedding-variants-2.jsx`, maqueta V5):
 * marfil y salvia, Spectral de cuerpo con rótulos en Montserrat, la pareja a sangre con los nombres en
 * caligrafía blanca, la hoja de calendario con la cuenta atrás, las rosas blancas entre secciones, el
 * arreglo con su historia, el collage de tres, la invitación con los pases, padres y padrinos,
 * ceremonia y recepción apiladas con su plano, el itinerario de dibujos de línea, vestimenta, solo
 * adultos, la mesa de regalos en franja, la canción, la confirmación con el libro, las fotos y el cierre.
 */
export function BodaBotView({ content, event, dictionary, themes, slots, guestInfo, audioSrc, respondida = false }: ThemeProps) {
  const ROTULOS = themes.designs['boda-bot']
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, music, dressCode, gallery, notes, closing } = content
  // «antes del 21 de noviembre», en el idioma del evento.
  const plazo =
    respondida || event.rsvpDeadline === null
      ? null
      : `${themes.rsvpBefore} ${new Intl.DateTimeFormat(event.locale === 'en' ? 'en-GB' : 'es-BO', {
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }).format(new Date(`${event.rsvpDeadline}T00:00:00Z`))}`

  const retrato = gallery?.[0]
  const momento = gallery?.[1]
  const trio = (gallery ?? []).slice(2, 5)

  // La cita son tres piezas: la frase, los años y la historia (un solo texto en la maqueta).
  const [frase = '', anos = '', ...parrafos] = (quote?.text ?? '').split('\n\n')
  const historia = parrafos.join('\n\n')

  const invitacion = notes?.[0]
  const soloAdultos = notes?.[1]
  const fotos = notes?.[2]

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const diaSemana = cuando === null ? '' : cuando.toLocaleDateString(etiquetaLocal, { weekday: 'long' })
  const mes = cuando === null ? '' : cuando.toLocaleDateString(etiquetaLocal, { month: 'long' })
  // «VER UBICACIÓN» de cada tarjeta: el enlace del mapa, o el lugar escrito como búsqueda.
  const llegarA = (lugar: PlaceBlock) => comoLlegar({ href: map?.href, coords: map?.coords }, [lugar.place, lugar.address].filter(Boolean).join(', '))
  const familia = hosts === undefined ? null : anfitrionesBoda(hosts)
  const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()

  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.papel, acento: P.salvia, display: CORMORANT, tinta: P.texto }))

  return (
    <article style={{ ...RANURAS, position: 'relative', background: P.papel, color: P.texto, fontFamily: SPECTRAL, minHeight: 'var(--alto, 100dvh)', overflowX: 'clip' }}>
      {/* La portada: el sobre lacrado sobre las rosas blancas. */}
      <BotanicaCover
        bgAsset={themeAsset('boda-bot', 'portada-rosas.avif')}
        bg={P.papel}
        hint={themes.coverHint}
        line1={themes.coverBigDay}
        line2={themes.coverWeMarry}
        names={[hero?.nameA, hero?.nameB].filter((nombre) => nombre !== undefined && nombre !== '').join(' &\n')}
        openLabel={themes.coverAria}
        textColor={P.bosque}
      />

      <ThemeColumn>
        {/* ── La pareja a sangre (3:4), con el degradado a negro y los nombres en blanco ── */}
        <div style={{ position: 'relative', aspectRatio: '3 / 4' }}>
          <PhotoSlot
            bg="transparent"
            border="none"
            color="rgba(255,255,255,0.6)"
            height="100%"
            label={retrato?.label ?? themes.portraitPlaceholder}
            radius={0}
            src={retrato?.imageId === undefined ? themeAsset('boda-bot', 'wedding-couple.avif') : `/media/${retrato.imageId}`}
            width="100%"
          />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.92) 100%)' }} />
          <div style={{ position: 'absolute', top: 26, left: 0, right: 0, textAlign: 'center', fontFamily: CORMORANT, fontSize: 14, letterSpacing: '0.4em', color: P.blanco }}>
            {hero?.eyebrow ?? themes.coverWeMarry}
          </div>
          <div style={{ position: 'absolute', bottom: '16%', left: 0, right: 0, textAlign: 'center', fontFamily: CALIGRAFIA, color: P.blanco, lineHeight: 1.05 }}>
            <h1 style={{ fontSize: 58, fontWeight: 400, margin: 0, lineHeight: 1.05 }}>{hero?.nameA ?? ''}</h1>
            {hero?.nameB === undefined ? null : (
              <>
                <div aria-hidden style={{ fontSize: 26, margin: '2px 0' }}>
                  &amp;
                </div>
                <div style={{ fontSize: 58 }}>{hero.nameB}</div>
              </>
            )}
          </div>
          <div aria-hidden style={{ position: 'absolute', left: -18, bottom: -22, zIndex: 3 }}>
            <FloralCorner side="left" tone="white" width={260} />
          </div>
          <div aria-hidden style={{ position: 'absolute', right: -18, bottom: -22, zIndex: 3 }}>
            <FloralCorner side="right" tone="white" width={260} />
          </div>
        </div>

        {/* ── La hoja de calendario y la cuenta atrás ── */}
        {cuando === null ? null : (
          <div style={{ padding: '34px 24px 30px', textAlign: 'center' }}>
            <div style={rotulo(12, '0.3em', { textTransform: 'uppercase' })}>{diaSemana}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '10px 0' }}>
              <span aria-hidden style={{ width: 60, height: 1, background: P.linea }} />
              <div style={rotulo(12, '0.3em', { textTransform: 'uppercase' })}>{mes}</div>
              <span aria-hidden style={{ width: 60, height: 1, background: P.linea }} />
            </div>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 68, color: P.salvia, lineHeight: 1.2 }}>{cuando.getDate()}</div>
            <div style={rotulo(11, '0.25em', { color: P.texto, marginTop: 6 })}>{cuando.getFullYear()}</div>
            {schedule === undefined ? null : (
              <>
                <div aria-hidden style={{ width: '70%', height: 1, background: P.linea, margin: '24px auto' }} />
                <div style={rotulo(10, '0.3em')}>· {themes.countdownPrefix.toUpperCase()} ·</div>
                <Countdown
                  labels={{ days: themes.countdownDays, hours: themes.countdownHoursLong, mins: themes.countdownMins, secs: themes.countdownSecs }}
                  labelStyle={rotulo(8, '0.2em', { marginTop: 4 })}
                  rowStyle={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, textAlign: 'center' }}
                  targetISO={schedule.startsAt}
                  valueStyle={{ fontFamily: CORMORANT, fontSize: 32, color: P.texto, lineHeight: 1.2 }}
                />
              </>
            )}
          </div>
        )}

        {/* ── Las rosas y la frase ── */}
        {frase === '' ? null : (
          <Reveal>
            <div style={{ padding: '10px 24px 30px', textAlign: 'center', position: 'relative' }}>
              <Rosas ancho="50%" estilo={{ margin: '0 auto 18px' }} />
              <div aria-hidden style={{ width: 50, height: 1, background: P.linea, margin: '0 auto 14px' }} />
              <p style={{ fontFamily: CORMORANT, fontStyle: 'italic', fontSize: 27.5, color: P.frase, fontWeight: 500, lineHeight: 1.8, margin: 0 }}>
                {frase.split('\n').map((linea) => (
                  <span key={linea} style={{ display: 'block' }}>
                    {linea}
                  </span>
                ))}
              </p>
            </div>
          </Reveal>
        )}

        {/* ── El arreglo con sus rosas y la historia ── */}
        {momento === undefined && historia === '' ? null : (
          <Reveal>
            <div style={{ padding: '0 24px' }}>
              {momento === undefined ? null : (
                <div style={{ position: 'relative', aspectRatio: '4 / 5' }}>
                  <PhotoSlot
                    bg={alfaDe('salvia', 0.05)}
                    border="none"
                    color={alfaDe('salvia', 0.5)}
                    height="100%"
                    label={momento.label}
                    radius={4}
                    src={momento.imageId === undefined ? themeAsset('boda-bot', 'boda-02-arreglo.avif') : `/media/${momento.imageId}`}
                    width="100%"
                  />
                  <Rosas ancho="48%" espejo estilo={{ position: 'absolute', left: -24, top: -18, zIndex: 3 }} />
                  <Rosas ancho="48%" estilo={{ position: 'absolute', right: -24, bottom: -18, zIndex: 3 }} />
                </div>
              )}
              {historia === '' ? null : (
                <div style={{ textAlign: 'center', marginTop: 34 }}>
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.salvia }}>{conMayuscula(themes.ourStory)}</div>
                  {anos === '' ? null : <div style={rotulo(10, '0.3em', { marginTop: 8 })}>{anos}</div>}
                  <p style={{ marginTop: 16, fontSize: 17.5, fontWeight: 500, lineHeight: 1.8, color: P.texto }}>{historia}</p>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* ── El collage de tres, a lo ancho ── */}
        {trio.length === 0 ? null : (
          <Reveal>
            <div style={{ padding: '26px 0 0', display: 'flex', gap: 4 }}>
              {trio.map((foto, indice) => (
                <div key={foto.label} style={{ width: '33.33%', aspectRatio: '1 / 1' }}>
                  <PhotoSlot
                    bg={alfaDe('salvia', 0.05)}
                    border="none"
                    color={alfaDe('salvia', 0.5)}
                    height="100%"
                    label={foto.label}
                    radius={0}
                    src={foto.imageId === undefined ? themeAsset('boda-bot', COLLAGE[indice] ?? COLLAGE[0]) : `/media/${foto.imageId}`}
                    width="100%"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* ── La invitación y los pases ── */}
        <Reveal>
          <div style={{ padding: '40px 24px 40px', textAlign: 'center' }}>
            {invitacion?.text === undefined ? null : <p style={{ fontSize: 17.5, fontWeight: 500, lineHeight: 1.8, color: P.texto, margin: 0 }}>{invitacion.text}</p>}
            {guestInfo === undefined ? (
              <div style={{ marginTop: 22 }}>{slots.guest}</div>
            ) : (
              <>
                <div style={{ marginTop: 22, fontFamily: CALIGRAFIA, fontSize: 40, color: P.texto }}>{guestInfo.label}</div>
                <div style={rotulo(10, '0.25em', { marginTop: 14 })}>{themes.reservedForYou}</div>
                <div style={{ fontFamily: CORMORANT, fontStyle: 'italic', fontSize: 48, marginTop: 10, color: P.texto, lineHeight: 1.1 }}>{guestInfo.seats}</div>
                <div style={rotulo(10, '0.25em')}>{themes.passes}</div>
              </>
            )}
          </div>
        </Reveal>

        {/* ── Padres y padrinos ── */}
        {familia === null ? null : (
          <Reveal>
            <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
              {hosts?.label === undefined ? null : <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.salvia }}>{hosts.label}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 32 }}>
                {[
                  { rotulo: themes.brideParents, nombres: familia.novia },
                  { rotulo: themes.groomParents, nombres: familia.novio },
                ].map((grupo) =>
                  grupo.nombres.length === 0 ? null : (
                    <div key={grupo.rotulo} style={{ flex: 1 }}>
                      <div style={rotulo(9, '0.2em')}>{grupo.rotulo}</div>
                      <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.8, color: P.texto }}>
                        {grupo.nombres.map((nombre) => (
                          <div key={nombre}>{nombre}</div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
              {familia.padrinos.length === 0 ? null : (
                <div style={{ marginTop: 30 }}>
                  <div style={rotulo(9, '0.2em')}>{themes.godparents}</div>
                  <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.8, color: P.texto }}>
                    {familia.padrinos.map((nombre) => (
                      <div key={nombre}>{nombre}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Ceremonia y recepción, apiladas, cada una con su dibujo, «VER UBICACIÓN» y su plano ── */}
        {ceremony === undefined && reception === undefined ? null : (
          <Reveal>
            <div style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
              {(
                [
                  { lugar: ceremony, dibujo: 'templo-v5-sf.avif' },
                  { lugar: reception, dibujo: 'copas-v5-sf.avif' },
                ] as const
              ).map(({ lugar, dibujo }) =>
                lugar === undefined ? null : (
                  <div key={dibujo} style={{ textAlign: 'center', border: `1px solid ${P.borde}`, borderRadius: 16, padding: '30px 20px', width: '100%', boxSizing: 'border-box' }}>
                    <Dibujo ancho={135} archivo={dibujo} proporcion={273 / 500} />
                    <div style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.salvia, marginTop: 12 }}>{lugar.label ?? ''}</div>
                    <div style={{ fontFamily: CORMORANT, fontSize: 30, marginTop: 6, color: P.texto }}>{lugar.time ?? ''}</div>
                    <div style={{ fontFamily: MONTSERRAT, fontSize: 9, letterSpacing: '0.15em', opacity: 0.75, marginTop: 8, color: P.texto }}>{(lugar.place ?? '').toUpperCase()}</div>
                    {llegarA(lugar) === null ? null : (
                      <a
                        href={llegarA(lugar) ?? ''}
                        rel="noopener noreferrer"
                        style={{
                          marginTop: 16,
                          display: 'inline-block',
                          border: `1px solid ${P.salvia}`,
                          color: P.salvia,
                          fontFamily: MONTSERRAT,
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          fontWeight: 700,
                          padding: '10px 22px',
                          borderRadius: 20,
                          textDecoration: 'none',
                        }}
                        target="_blank"
                      >
                        {themes.viewLocation}
                      </a>
                    )}
                    <div style={{ marginTop: 20 }}>
                      <MapPreview
                        accent={P.salvia}
                        border={alfaDe('salvia', 0.3)}
                        coords={map?.coords ?? ''}
                        coordsColor={P.salvia}
                        directionsLabel={themes.viewLocation}
                        href={map?.href}
                        label={(lugar.place ?? '').toUpperCase()}
                        pinDot={P.salvia}
                        pinRing={P.papel}
                        respaldo={[lugar.place, lugar.address].filter(Boolean).join(', ')}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </Reveal>
        )}

        {/* ── El itinerario: titular en Playfair, filete de rombo y los hitos en dos columnas ── */}
        {itinerary === undefined ? null : (
          <Reveal>
            <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
              <div style={{ fontFamily: PLAYFAIR, fontStyle: 'italic', fontWeight: 600, fontSize: 32, color: P.bosque }}>{conMayuscula(themes.itinerary)}</div>
              <div aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                <span style={{ width: 56, height: 1, background: P.bosque, opacity: 0.5 }} />
                <span style={{ width: 6, height: 6, background: P.bosque, transform: 'rotate(45deg)', opacity: 0.7 }} />
                <span style={{ width: 56, height: 1, background: P.bosque, opacity: 0.5 }} />
              </div>
              <ol style={{ listStyle: 'none', padding: 0, margin: '34px 0 0', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '36px 8px' }}>
                {itinerary.map((fila) => {
                  return (
                    <li key={`${fila.time}-${fila.label}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <IconoGardenia clave={fila.imageId} color={P.bosque} size={52} />
                      <div style={{ fontFamily: CORMORANT, fontStyle: 'italic', fontSize: 18, color: P.bosque, marginTop: 10 }}>{fila.time}</div>
                      <div style={{ fontFamily: MONTSERRAT, fontSize: 10, letterSpacing: '0.18em', color: P.bosque, marginTop: 6, textTransform: 'uppercase' }}>{fila.label}</div>
                    </li>
                  )
                })}
              </ol>
              <Rosas ancho="72%" estilo={{ margin: '36px auto 0' }} />
            </div>
          </Reveal>
        )}

        {/* ── Código de vestimenta ── */}
        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
              <div style={rotulo(11, '0.25em', { color: P.texto })}>{dressCode.note ?? themes.dressCode}</div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 36, color: P.texto, marginTop: 8 }}>{dressCode.title ?? ''}</div>
              <div style={{ margin: '24px 0' }}>
                <Dibujo ancho={220} archivo="codigo-v5-sf.avif" proporcion={1} />
              </div>
              {dressCode.detail === undefined ? null : (
                <p style={{ fontSize: 15, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.8, color: P.texto, margin: 0 }}>{dressCode.detail}</p>
              )}
              <div aria-hidden style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
                {CARTA_DE_COLOR.map((color) => (
                  <div key={color} style={{ width: 30, height: 30, borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
                ))}
              </div>
              <PaletaDeColores etiqueta={themes.suggestedColors} borde="currentColor" colores={dressCode.colors} />
            </div>
          </Reveal>
        )}

        {/* ── Solo adultos: el rótulo arriba, el tacón y la corbata, y el texto ── */}
        {soloAdultos === undefined ? null : (
          <Reveal>
            <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
              {soloAdultos.title === undefined ? null : <div style={rotulo(10, '0.2em', { fontWeight: 700, marginBottom: 16 })}>{soloAdultos.title}</div>}
              <Dibujo ancho={130} archivo="tacon-v5-sf.avif" proporcion={1} estilo={{ marginBottom: 18 }} />
              {soloAdultos.text === undefined ? null : <p style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.8, color: P.texto, margin: 0 }}>{soloAdultos.text}</p>}
            </div>
          </Reveal>
        )}

        {/* ── La mesa de regalos, en su franja: texto a la izquierda y el código a la derecha ──
            En una invitación de verdad la franja solo sale si hay algo que ofrecer, y el código es el
            QR del banco del cliente o ninguno: el de adorno invitaría a pagar a la nada. */}
        {slots.regalos !== undefined && !slots.regalos.sobres && slots.regalos.qr === null && slots.regalos.resto === null ? null : (
          <Reveal>
            <div style={{ padding: '30px 24px', background: P.franja }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={rotulo(10, '0.2em')}>{themes.gifts}</div>
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.texto, marginTop: 6 }}>{ROTULOS.giftsTitle}</div>
                  <div style={{ fontSize: 14, marginTop: 6, fontWeight: 500, lineHeight: 1.8, color: P.texto }}>{ROTULOS.giftsNote}</div>
                </div>
                {slots.regalos === undefined ? (
                  <div style={{ flexShrink: 0 }}>
                    <MarcoQr bg={P.blanco} fg={P.negro} size={84} />
                  </div>
                ) : null}
              </div>
              {slots.registry === null ? null : <div style={{ marginTop: 16 }}>{slots.registry}</div>}
            </div>
          </Reveal>
        )}

        {/* ── La canción ── */}
        {music === undefined ? null : (
          <Reveal>
            <div style={{ padding: '24px 24px 40px' }}>
              <MusicPlayer
                accent={P.salvia}
                artist={music.artist ?? ''}
                audioSrc={audioSrc ?? (music.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)}
                eyebrow={themes.songOfTheNight}
                eyebrowFont={MONTSERRAT}
                playBg={P.salvia}
                playIconColor={P.papel}
                textColor={P.texto}
                track={music.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        {/* ── La confirmación y, debajo, el libro: «Déjanos un mensaje» ── */}
        <Reveal>
          <div style={{ padding: '0 24px 40px' }}>
            <div style={rotulo(11, '0.25em', { textAlign: 'center', textTransform: 'uppercase' })}>{dictionary.title}</div>
            {plazo === null ? null : <div style={{ textAlign: 'center', fontFamily: CALIGRAFIA, fontSize: 26, color: P.texto, margin: '8px 0 22px' }}>{plazo}</div>}
            {slots.rsvp}
            {slots.guestbook === null ? null : (
              <>
                <div style={{ textAlign: 'center', marginTop: 30, fontFamily: CALIGRAFIA, fontSize: 24, color: P.salvia }}>{ROTULOS.guestbook}</div>
                <div style={{ marginTop: 14 }}>{slots.guestbook}</div>
              </>
            )}
          </div>
        </Reveal>

        {/* ── Comparte tus fotos (cuando el plan las trae) ── */}
        {fotos === undefined || slots.photos === undefined ? null : (
          <Reveal>
            <div style={{ margin: '0 24px 40px', textAlign: 'center', border: `1px solid ${P.borde}`, borderRadius: 14, padding: '34px 24px' }}>
              <Dibujo ancho={90} archivo="camara-v5-sf.avif" proporcion={1} />
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.salvia, marginTop: 14 }}>{fotos.title}</div>
              {fotos.text === undefined ? null : <p style={{ marginTop: 10, fontSize: 15, fontWeight: 500, lineHeight: 1.8, color: P.texto }}>{fotos.text}</p>}
              <div style={{ marginTop: 18 }}>{slots.photos}</div>
            </div>
          </Reveal>
        )}

        <div style={{ padding: '0 24px' }}>{slots.pass}</div>

        {/* ── El cierre ── */}
        {closing === undefined ? null : (
          <Reveal>
            <div style={{ padding: '50px 24px 70px', textAlign: 'center' }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.salvia }}>{closing.text ?? ''}</div>
              {closing.signature === undefined ? null : <div style={{ marginTop: 10, fontFamily: CALIGRAFIA, fontSize: 40, color: P.texto }}>{closing.signature}</div>}
              <Rosas ancho="62%" estilo={{ margin: '26px auto 0' }} />
            </div>
          </Reveal>
        )}
      </ThemeColumn>
    </article>
  )
}
