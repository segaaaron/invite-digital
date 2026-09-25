import Image from '@/shared/design/ui/ImagenQueAparece'
import { BRAND } from '@/shared/config/brand'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MusicPlayer } from '../kit/MusicPlayer'
import { Reveal } from '../kit/Reveal'
import { EsenciaCover } from './EsenciaCover'
import { FileteDeEsencia, IconoDeEsencia, RamitaDeOlivo, type ClaveDeIcono } from './esencia-ornamentos'
import { CARTA_DE_COLOR, PALETA as P } from './esencia.palette'


const SANS = 'var(--font-outfit)'
const SERIF = 'var(--font-cormorant)'

/**
 * Las cinco fotografías del diseño, en el orden de la maqueta. Las dos primeras van
 * recortadas a rectángulo: la maqueta las trae con un óvalo y un arco pintados sobre gris,
 * y junto a las fotos que sube el cliente —rectangulares— se veían rotas.
 */
const GALERIA = ['pareja-1-rect.avif', 'pareja-2-rect.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif'] as const

/**
 * Qué casillas van a doble alto: la primera, la cuarta y la última. La maqueta alarga solo
 * la primera y la última y deja un hueco abajo a la izquierda; con la cuarta también alta,
 * las cinco llenan la rejilla sin huecos.
 */
const ALTAS = new Set([0, 3, 4])

/** El icono que acompaña a cada hora del itinerario, por su orden. */
const ICONOS: readonly ClaveDeIcono[] = ['church', 'glasses', 'glasses', 'plate', 'note', 'bouquet', 'star']

/**
 * «Esencia» — Valentina & Mateo, de `esencia.jsx` (`EsenciaWedding`).
 *
 * Minimalista cálido: lino, tinta parda y oro viejo, con ramas de olivo dibujadas a línea
 * en las esquinas de cada bloque. Cada sección es una columna centrada de 430 px con su
 * rótulo pequeño en versales, su filete de rombo y el contenido debajo.
 *
 * Dos tipografías: Outfit para los rótulos y los párrafos —geométrica, ligera— y Cormorant
 * Garamond para los titulares y las horas.
 */
export function EsenciaView({ content, event, themes, slots, audioSrc, respondida }: ThemeProps) {
  const ROTULOS = themes.designs['esencia']
  const { hero, quote, schedule, ceremony, reception, map, itinerary, dressCode, gallery, music, closing } = content
  // «#ValentinaYMateo2027»: los dos nombres y el año, sin espacios.
  const anioDeLaBoda = schedule === undefined ? '' : schedule.startsAt.slice(0, 4)
  const hashtag =
    hero?.nameA === undefined || hero.nameB === undefined || anioDeLaBoda === ''
      ? null
      : `#${[hero.nameA, 'Y', hero.nameB, anioDeLaBoda].join('').replace(/\s+/g, '')}`

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiqueta = event.locale === 'en' ? 'en-US' : 'es-BO'
  const fechaLarga =
    cuando === null || Number.isNaN(cuando.getTime())
      ? ''
      : cuando.toLocaleDateString(etiqueta, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  // Las cuatro piezas que no dibuja este diseño heredan su paleta por variables CSS, en vez
  // de entrar marfiles.
  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.oro, sobreAcento: P.papel, tinta: P.tinta, display: SERIF, radio: 4 }),
  )

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  return (
    <article
      style={{
        ...RANURAS,
        // El botón de confirmar, en la tinta del diseño con la letra en papel (`linea`).
        ['--rsvp-fondo' as string]: P.tinta,
        ['--rsvp-tinta' as string]: P.papel,
        position: 'relative',
        background: P.papel,
        color: P.tinta,
        fontFamily: SANS,
        lineHeight: 'normal',
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      <EsenciaCover
        bgAsset={themeAsset('esencia', 'portada-lino.avif')}
        eyebrow={hero?.eyebrow}
        fecha={fechaLarga}
        hint={themes.coverScroll}
        monogram={hero?.monogram}
        nameA={hero?.nameA}
        nameB={hero?.nameB}
        openLabel={themes.coverAria}
        retrato={hero?.portraitImageId === undefined ? themeAsset('esencia', 'pareja-1.avif') : `/media/${hero.portraitImageId}`}
      />

      {/* Los nombres solo se pintan en la portada, que es un botón: el titular de la página va
          para lectores de pantalla. */}
      <h1 className="sr-only">{[hero?.nameA, hero?.nameB].filter(Boolean).join(' & ')}</h1>

      {/* El papel de lino: dos tramas cruzadas al 1,5 %, como en la maqueta. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.015) 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, rgba(0,0,0,0.012) 0 1px, transparent 1px 3px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        {/* ── El mensaje ── */}
        {quote === undefined ? null : (
          <Bloque>
            <RamitaDeOlivo style={{ top: 20, left: -15, transform: 'rotate(-10deg)' }} />
            <Reveal>
              <Rotulo>{ROTULOS.mensaje}</Rotulo>
              <FileteDeEsencia />
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 19, lineHeight: 1.9, maxWidth: 300, margin: '0 auto' }}>
                {quote.text}
              </p>
              {hero?.nameA === undefined ? null : (
                <p style={{ marginTop: 20, fontSize: 11, color: P.tintaSuave }}>
                  — {[hero.nameA, hero.nameB].filter(Boolean).join(' & ')}
                </p>
              )}
              <span style={{ display: 'block', width: 160, height: 220, position: 'relative', margin: '28px auto 0', borderRadius: 8, overflow: 'hidden' }}>
                <Image
                  alt=""
                  aria-hidden
                  fill
                  sizes="160px"
                  src={gallery?.[4]?.imageId === undefined ? themeAsset('esencia', 'pareja-5.avif') : `/media/${gallery[4].imageId}`}
                  style={{ objectFit: 'cover' }}
                />
              </span>
            </Reveal>
          </Bloque>
        )}

        {/* ── Ceremonia y recepción: el mismo bloque con su icono ── */}
        {ceremony === undefined ? null : (
          <Bloque>
            <Lugar icono="church" verUbicacion={ROTULOS.verUbicacion} llegar={llegarA(ceremony)} lugar={ceremony} rotulo={ROTULOS.ceremonia} />
          </Bloque>
        )}

        {reception === undefined ? null : (
          <Bloque>
            <RamitaDeOlivo style={{ bottom: 30, right: -20, transform: 'rotate(30deg)' }} />
            <Lugar icono="glasses" verUbicacion={ROTULOS.verUbicacion} llegar={llegarA(reception)} lugar={reception} rotulo={ROTULOS.recepcion} />
          </Bloque>
        )}

        {/* ── El itinerario, en una línea de tiempo con su punto ── */}
        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Bloque>
            <Rotulo>{ROTULOS.itinerario}</Rotulo>
            <FileteDeEsencia />
            <div style={{ position: 'relative', marginTop: 10, paddingLeft: 6, width: '100%', textAlign: 'left' }}>
              <span aria-hidden style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 1, background: P.oroClaro }} />
              {itinerary.map((fila, indice) => (
                <Reveal delay={indice * 100} key={`${fila.time}-${fila.label}`}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0 13px 24px' }}>
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: P.oro,
                        boxShadow: `0 0 0 4px ${P.papel}, 0 0 0 5px ${P.oroClaro}`,
                      }}
                    />
                    <span style={{ width: 56, flexShrink: 0, fontFamily: SERIF, fontSize: 17 }}>{fila.time}</span>
                    <span style={{ flexShrink: 0 }}>
                      <IconoDeEsencia nombre={ICONOS[indice % ICONOS.length] ?? 'star'} opacidad={0.4} tamano={28} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 300, color: P.tintaSuave }}>{fila.label}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </Bloque>
        )}

        {/* ── La cuenta atrás, en cuatro cajas de papel cálido ── */}
        {schedule === undefined ? null : (
          <Bloque>
            <Reveal>
              <Rotulo>{ROTULOS.faltan}</Rotulo>
              <FileteDeEsencia />
              <Countdown
                cellStyle={{
                  background: P.calido,
                  border: '1px solid rgba(196,168,130,0.15)',
                  borderRadius: 4,
                  padding: '16px 13px',
                  minWidth: 65,
                }}
                labelStyle={{ fontSize: 8, letterSpacing: '0.15em', color: P.tintaSuave, marginTop: 2 }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: SERIF, fontWeight: 400, fontSize: 32 }}
              />
            </Reveal>
          </Bloque>
        )}

        {/* ── El código de vestimenta, con sus discos de color ── */}
        {dressCode === undefined ? null : (
          <Bloque>
            <Reveal>
              <Rotulo>{ROTULOS.vestimenta}</Rotulo>
              <FileteDeEsencia />
              {dressCode.title === undefined ? null : <p style={{ fontFamily: SERIF, fontSize: 21 }}>{dressCode.title}</p>}
              <span style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 18 }}>
                {(dressCode.colors ?? CARTA_DE_COLOR.map((c) => c.color)).map((color) => (
                  <span
                    key={color}
                    style={{
                      display: 'block',
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: color,
                      border: `1.5px solid ${color.toLowerCase() === '#f0eae0' ? '#d0c8bc' : P.filete}`,
                    }}
                    title={CARTA_DE_COLOR.find((c) => c.color === color)?.nombre ?? color}
                  />
                ))}
              </span>
              {dressCode.note === undefined ? null : (
                <p style={{ marginTop: 16, fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: P.tintaSuave }}>{dressCode.note}</p>
              )}
            </Reveal>
          </Bloque>
        )}

        {/* ── La galería: dos columnas, con la primera y la última a doble alto ── */}
        <Bloque>
          <RamitaDeOlivo style={{ top: 15, right: -10, transform: 'rotate(15deg) scaleY(-1)' }} />
          <Rotulo>{ROTULOS.galeria}</Rotulo>
          <FileteDeEsencia />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10, width: '100%' }}>
            {GALERIA.map((archivo, indice) => (
              <span
                key={archivo}
                style={{
                  position: 'relative',
                  gridRow: ALTAS.has(indice) ? 'span 2' : 'auto',
                  aspectRatio: ALTAS.has(indice) ? undefined : '1',
                  minHeight: ALTAS.has(indice) ? 240 : undefined,
                  borderRadius: 4,
                  overflow: 'hidden',
                  display: 'block',
                }}
              >
                <Image
                  alt=""
                  aria-hidden
                  fill
                  sizes="(max-width: 480px) 50vw, 215px"
                  src={gallery?.[indice]?.imageId === undefined ? themeAsset('esencia', archivo) : `/media/${gallery[indice].imageId}`}
                  style={{ objectFit: 'cover' }}
                />
              </span>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>{slots.photos}</div>
        </Bloque>

        {/* ── Confirmación ── */}
        <Bloque>
          <Reveal>
            <Rotulo>{ROTULOS.confirmacion}</Rotulo>
            <FileteDeEsencia />
            <p style={{ fontFamily: SERIF, fontSize: 24 }}>{ROTULOS.preguntaRsvp}</p>
            {respondida || event.rsvpDeadline === null ? null : (
              <p style={{ marginTop: 6, fontSize: 12.5, color: P.tintaSuave }}>
                {`${ROTULOS.confirmaAntes} ${themes.rsvpBefore} ${new Intl.DateTimeFormat(event.locale === 'en' ? 'en-GB' : 'es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${event.rsvpDeadline}T00:00:00Z`))}`}
              </p>
            )}
            <div style={{ marginTop: 22, width: '100%' }}>{slots.rsvp}</div>
          </Reveal>
        </Bloque>

        {/* ── Mesa de regalos ── */}
        <Bloque>
          <RamitaDeOlivo style={{ top: 20, right: -15, transform: 'rotate(25deg)' }} />
          <Rotulo>{ROTULOS.regalos}</Rotulo>
          <FileteDeEsencia />
          <span
            aria-hidden
            style={{
              display: 'flex',
              width: 55,
              height: 55,
              borderRadius: '50%',
              border: `1.5px solid ${P.oroBorde}`,
              margin: '0 auto',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconoDeEsencia nombre="heart" opacidad={1} tamano={24} />
          </span>
          <div style={{ marginTop: 18, width: '100%' }}>{slots.registry}</div>
        </Bloque>

        {/* ── El libro de firmas ── */}
        <Bloque>
          <Rotulo>{ROTULOS.firmas}</Rotulo>
          <FileteDeEsencia />
          <div style={{ width: '100%' }}>{slots.guestbook}</div>
        </Bloque>

        {/* ── La canción, si la hay ── */}
        {cancion === undefined ? null : (
          <Bloque>
            <Rotulo>{ROTULOS.musica}</Rotulo>
            <FileteDeEsencia />
            <div style={{ width: '100%' }}>
              <MusicPlayer
                accent={P.oro}
                artist={music?.artist ?? ''}
                audioSrc={cancion}
                eyebrow={themes.songOfTheNight}
                playBg={P.oro}
                playIconColor={P.papel}
                textColor={P.tinta}
                track={music?.track ?? ''}
                trackColor={P.tinta}
              />
            </div>
          </Bloque>
        )}

        {/* ── El cierre ── */}
        {closing === undefined ? null : (
          <Bloque>
            <RamitaDeOlivo ancho={200} opacidad={0.08} style={{ bottom: 60, left: '50%', transform: 'translateX(-50%)' }} />
            <Reveal>
              {closing.text === undefined ? null : (
                <p style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 27, lineHeight: 1.35 }}>{closing.text}</p>
              )}
              <FileteDeEsencia />
              {closing.signature === undefined ? null : <p style={{ fontSize: 12, color: P.tintaSuave }}>{closing.signature}</p>}
              {hashtag === null ? null : (
                <p style={{ marginTop: 8, fontSize: 11, letterSpacing: '0.15em', color: P.oro }}>{hashtag}</p>
              )}
            </Reveal>
          </Bloque>
        )}

        {/* A quién va dirigida y su pase, al final: es lo nuestro, y va donde no parte el
            diseño en dos. */}
        <Bloque>
          <div style={{ fontSize: 13, color: P.tintaSuave }}>{slots.guest}</div>
          <div style={{ marginTop: 14, width: '100%' }}>{slots.pass}</div>
        </Bloque>
      </div>

      {/* La franja del pie: en la maqueta, «Invitación digital — tu marca». */}
      <div style={{ background: P.calido, borderTop: `1px solid ${P.filete}`, padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 8, letterSpacing: '0.18em', color: P.tintaSuave }}>{`${ROTULOS.pie} — ${BRAND.siteName.toUpperCase()}`}</p>
      </div>
    </article>
  )
}

/** Una sección del diseño: columna centrada de 430 px con el aire de la maqueta. */
function Bloque({ children }: { readonly children: React.ReactNode }) {
  return (
    <section
      style={{
        position: 'relative',
        maxWidth: 430,
        margin: '0 auto',
        padding: '40px 32px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {children}
    </section>
  )
}

/** El rótulo pequeño en versales que abre cada bloque. */
function Rotulo({ children }: { readonly children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', color: P.tintaSuave, textTransform: 'uppercase' }}>
      {children}
    </p>
  )
}

/** Ceremonia y recepción: el mismo bloque con su icono, su lugar, su hora y su botón. */
function Lugar({
  rotulo,
  verUbicacion,
  icono,
  lugar,
  llegar,
}: {
  readonly rotulo: string
  readonly icono: ClaveDeIcono
  readonly verUbicacion: string
  readonly lugar: { readonly label?: string; readonly place?: string; readonly address?: string; readonly time?: string }
  readonly llegar: string | null
}) {
  return (
    <Reveal>
      <Rotulo>{rotulo}</Rotulo>
      <FileteDeEsencia />
      <span style={{ display: 'flex', justifyContent: 'center' }}>
        <IconoDeEsencia nombre={icono} />
      </span>
      {lugar.label === undefined ? null : (
        <p style={{ marginTop: 8, fontSize: 9, letterSpacing: '0.2em', color: P.oro, textTransform: 'uppercase' }}>{lugar.label}</p>
      )}
      {lugar.place === undefined ? null : <p style={{ marginTop: 14, fontFamily: SERIF, fontSize: 24 }}>{lugar.place}</p>}
      {lugar.address === undefined ? null : (
        <p style={{ marginTop: 6, fontSize: 12.5, color: P.tintaSuave, lineHeight: 1.6 }}>{lugar.address}</p>
      )}
      {lugar.time === undefined ? null : (
        <span style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span aria-hidden style={{ display: 'block', width: 20, height: 1, background: P.filete }} />
          <span style={{ fontFamily: SERIF, fontSize: 18 }}>{lugar.time}</span>
          <span aria-hidden style={{ display: 'block', width: 20, height: 1, background: P.filete }} />
        </span>
      )}
      {llegar === null ? null : (
        <a
          href={llegar}
          rel="noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 20,
            padding: '11px 24px',
            border: `1px solid ${P.filete}`,
            borderRadius: 2,
            fontFamily: SANS,
            fontSize: 11,
            letterSpacing: '0.1em',
            color: P.tinta,
            textDecoration: 'none',
          }}
          target="_blank"
        >
          {verUbicacion}
        </a>
      )}
    </Reveal>
  )
}
