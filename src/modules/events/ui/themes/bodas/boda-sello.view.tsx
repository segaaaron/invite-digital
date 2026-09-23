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
import { SelloCover } from './SelloCover'
import { PALETA as P } from './boda-sello.palette'

const SERIF = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'
/** La didona de los números grandes: solo cursiva, como la maqueta. */
const NUMERO = 'var(--font-bodoni-moda)'

/** Cómo llama **este** diseño a sus secciones. Es su guion, no una traducción. */
const ROTULOS = {
  faltan: '· FALTAN ·',
  historia: 'NUESTRA HISTORIA',
  invitacion: 'Nuestro gran día se acerca y nos encantaría que formaras parte de él.',
  reservado: 'HEMOS RESERVADO PARA TI',
  pases: 'PASES',
  padresNovia: 'PADRES DE LA NOVIA',
  padresNovio: 'PADRES DEL NOVIO',
  padrinos: 'PADRINOS',
  verUbicacion: 'VER UBICACIÓN',
  itinerario: 'ITINERARIO',
  vestimenta: 'CÓDIGO DE VESTIMENTA',
  regalos: 'MESA DE REGALOS',
  confirma: 'CONFIRMA TU ASISTENCIA',
  mensaje: 'Déjanos un mensaje',
  fotos: 'Comparte tus fotos',
} as const

/** Los seis iconos de acuarela del itinerario, en el orden de la maqueta. */
const ICONOS_ITINERARIO = ['iglesia.avif', 'copas.avif', 'brindis.avif', 'cena.avif', 'bouquet.avif', 'pareja-baile.avif'] as const

/** Los pétalos que caen sobre toda la invitación: veintidós, como la maqueta. */
const PETALOS = Array.from({ length: 22 }, (_, i) => ({
  izquierda: (i * 4.6) % 100,
  tamano: 10 + (i % 5) * 4,
  duracion: 8 + (i % 7) * 2,
  retraso: -(i * 0.9),
}))

/**
 * «Sobre Lacrado» — Camila & Sebastián, de `boda-sobre-lacrado.jsx` (`WeddingSobreLacrado`).
 *
 * Acuarela crema con guinda: bloques claros y bloques ciruela alternados, esquinas de flores
 * pintadas que flotan, números en Bodoni Moda cursiva, titulares en Cormorant con mucho
 * interletrado y los nombres en caligrafía. Las fotografías entran a sangre y se funden con
 * el papel por una onda dibujada, no por un degradado recto.
 */
export function BodaSelloView({ content, event, themes, slots, guestInfo, audioSrc }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, dressCode, notes, music, closing } = content

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const fecha = (opciones: Intl.DateTimeFormatOptions) =>
    cuando === null || Number.isNaN(cuando.getTime()) ? '' : cuando.toLocaleDateString(etiquetaLocal, opciones)
  const diaSemana = fecha({ weekday: 'long' })
  const mes = fecha({ month: 'long' })
  const dia = fecha({ day: 'numeric' })
  const anio = fecha({ year: 'numeric' })
  const fechaCorta = cuando === null ? '' : `${dia} · ${String(cuando.getMonth() + 1).padStart(2, '0')} · ${anio}`

  const nombres = [hero?.nameA, hero?.nameB].filter((nombre) => nombre !== undefined && nombre !== '').join(' & ')
  const papeles = hosts === undefined ? { novia: [], novio: [], padrinos: [] } : anfitrionesBoda(hosts)
  const historia = notes?.[0]
  const soloAdultos = notes?.[1]
  const regalos = notes?.[2]

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  const RANURAS = variablesDeRanuras(
    pielDeRanuras({ acento: P.vino, sobreAcento: P.crema, tinta: P.vino, display: SERIF, radio: 10 }),
  )

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.crema,
        color: P.vino,
        fontFamily: SERIF,
        lineHeight: 'normal',
        minHeight: '100dvh',
        overflowX: 'clip',
      }}
    >
      <SelloCover
        bgAsset={themeAsset('boda-sello', 'portada-sobre.avif')}
        eyebrow={hero?.eyebrow ?? ''}
        hint={themes.coverTap}
        names={nombres}
        openLabel={themes.coverAria}
      />

      {/* Los pétalos de la maqueta, cayendo sobre toda la invitación. */}
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
              background: 'rgba(240,234,222,0.7)',
              boxShadow: '0 0 5px rgba(240,234,222,0.5)',
              animation: `theme-petalFall ${petalo.duracion}s linear ${petalo.retraso}s infinite`,
            }}
          />
        ))}
      </CapaFija>

      {/* ── La fecha, con la pareja a sangre ── */}
      <Seccion estilo={{ padding: '0 26px 68px' }}>
        <FotoConOnda alto={560} posicion="20% 15%" src={themeAsset('boda-sello', 'pareja-fecha.avif')} />
        <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 8 }}>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 44, lineHeight: 1.1, color: P.vino }}>{nombres}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Rotulo color={P.rosa}>{diaSemana}</Rotulo>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 12 }}>
            <span aria-hidden style={{ display: 'block', width: 44, height: 1, background: P.oro }} />
            <Rotulo>{mes}</Rotulo>
            <span aria-hidden style={{ display: 'block', width: 44, height: 1, background: P.oro }} />
          </div>
          <p style={{ fontFamily: NUMERO, fontStyle: 'italic', fontWeight: 500, fontSize: 150, lineHeight: 1, color: P.vino, marginTop: 14 }}>
            {dia}
          </p>
          <Rotulo color={P.rosa} estilo={{ marginTop: 6 }}>
            {anio}
          </Rotulo>
        </div>
      </Seccion>

      {/* El reloj de arena, entre la fecha y la cuenta atrás. */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <Arte alto={235} ancho={235} flota src={themeAsset('boda-sello', 'reloj-de-arena.avif')} />
      </div>

      {/* ── La cuenta atrás, sobre ciruela ── */}
      {schedule === undefined ? null : (
        <Seccion ciruela>
          <div style={{ textAlign: 'center' }}>
            <Rotulo>{ROTULOS.faltan}</Rotulo>
            <Countdown
              cellStyle={{ textAlign: 'center', padding: '0 16px' }}
              labelStyle={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, letterSpacing: '0.4em', marginTop: 8 }}
              labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
              rowStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 38 }}
              targetISO={schedule.startsAt}
              valueStyle={{ fontFamily: NUMERO, fontStyle: 'italic', fontWeight: 500, fontSize: 46, lineHeight: 1, color: P.oro }}
            />
          </div>
        </Seccion>
      )}

      {/* ── La frase ── */}
      {quote === undefined ? null : (
        <Seccion>
          <div style={{ textAlign: 'center', padding: '10px 20px' }}>
            <p style={{ fontFamily: CALIGRAFIA, fontSize: 40, lineHeight: 1.1, color: P.vino, whiteSpace: 'pre-line' }}>{quote.text}</p>
          </div>
        </Seccion>
      )}

      {/* ── La historia, con su fotografía al pie ── */}
      {historia === undefined ? null : (
        <Seccion esquinas={['tr', 'bl']} estilo={{ paddingBottom: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <Rotulo color={P.rosa}>{historia.title ?? ROTULOS.historia}</Rotulo>
            <p style={{ fontSize: 19, fontStyle: 'italic', lineHeight: 1.7, marginTop: 26, color: P.vino, opacity: 0.9 }}>{historia.text}</p>
          </div>
          <div style={{ margin: '36px -34px 0', width: 'calc(100% + 68px)' }}>
            <FotoConOnda alto={300} src={themeAsset('boda-sello', 'pareja-historia.avif')} />
          </div>
        </Seccion>
      )}

      {/* ── La invitación personal: a quién va dirigida y cuántos pases tiene ── */}
      <Seccion>
        <div style={{ textAlign: 'center' }}>
          <Arte
            ancho={260}
            estilo={{ width: '60%', borderRadius: 14, border: `1.5px solid ${P.oro}`, margin: '0 auto 20px' }}
            src={themeAsset('boda-sello', 'pareja-invitacion.avif')}
          />
          <p style={{ fontSize: 19, lineHeight: 1.7, color: P.vino, maxWidth: '88%', margin: '0 auto' }}>{ROTULOS.invitacion}</p>
          {guestInfo === undefined ? (
            <div style={{ marginTop: 20 }}>{slots.guest}</div>
          ) : (
            <div style={{ width: '85%', margin: '20px auto 0', border: `1.5px solid ${P.oro}`, borderRadius: 16, padding: '22px 20px' }}>
              <p style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase', color: P.vino }}>
                {guestInfo.label}
              </p>
              <span aria-hidden style={{ display: 'block', width: 44, height: 1, background: P.oro, margin: '12px auto' }} />
              <Rotulo color={P.rosa} tamano={12}>
                {ROTULOS.reservado}
              </Rotulo>
              <p style={{ fontFamily: NUMERO, fontStyle: 'italic', fontWeight: 500, fontSize: 56, lineHeight: 1, color: P.oro, marginTop: 2 }}>
                {guestInfo.seats}
              </p>
              <Rotulo color={P.rosa} estilo={{ marginTop: 2 }}>
                {ROTULOS.pases}
              </Rotulo>
            </div>
          )}
        </div>
      </Seccion>

      {/* ── Los padres y los padrinos ── */}
      {hosts === undefined ? null : (
        <Seccion>
          <div style={{ textAlign: 'center' }}>
            {hosts.label === undefined ? null : <p style={{ fontStyle: 'italic', fontSize: 19, color: P.vino }}>{hosts.label}</p>}
            <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 42 }}>
              <Familia nombres={papeles.novia} titulo={ROTULOS.padresNovia} />
              <Familia nombres={papeles.novio} titulo={ROTULOS.padresNovio} />
            </div>
            {papeles.padrinos.length === 0 ? null : (
              <div style={{ marginTop: 42 }}>
                <Familia nombres={papeles.padrinos} titulo={ROTULOS.padrinos} />
              </div>
            )}
          </div>
        </Seccion>
      )}

      {/* La banda de los anillos, fundida por arriba y por abajo. */}
      <div style={{ position: 'relative', height: 280, overflow: 'hidden', background: P.crema }}>
        <Image
          alt=""
          aria-hidden
          fill
          sizes="480px"
          src={themeAsset('boda-sello', 'pareja-anillos.avif')}
          style={{ objectFit: 'cover', objectPosition: '50% 58%' }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(${P.crema} 0%, transparent 22%, transparent 78%, ${P.crema} 100%)`,
          }}
        />
      </div>

      {/* ── Ceremonia y recepción, en dos tarjetas sobre ciruela ── */}
      <Seccion ciruela>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {[
            { lugar: ceremony, icono: 'iglesia.avif' as const },
            { lugar: reception, icono: 'copas.avif' as const },
          ].map(({ lugar, icono }) =>
            lugar === undefined ? null : (
              <div key={icono} style={{ border: `1.5px solid ${P.oro}`, borderRadius: 16, padding: '36px 22px', textAlign: 'center' }}>
                <Arte
                  ancho={186}
                  estilo={{ width: '57%', margin: '0 auto 28px' }}
                  flota
                  src={themeAsset('boda-sello', icono)}
                />
                {lugar.label === undefined ? null : (
                  <p style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.cremaTinta }}>
                    {lugar.label}
                  </p>
                )}
                {lugar.time === undefined ? null : (
                  <p style={{ fontFamily: NUMERO, fontStyle: 'italic', fontWeight: 500, fontSize: 42, lineHeight: 1, color: P.oro, marginTop: 14 }}>
                    {lugar.time}
                  </p>
                )}
                {lugar.place === undefined ? null : (
                  <Rotulo color={P.cremaTinta} estilo={{ marginTop: 8 }}>
                    {lugar.place}
                  </Rotulo>
                )}
                {llegarA(lugar) === null ? null : (
                  <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
                    <a
                      href={llegarA(lugar) ?? ''}
                      rel="noreferrer"
                      style={{
                        minWidth: 240,
                        textAlign: 'center',
                        padding: '18px 26px',
                        border: `1.5px solid ${P.oro}`,
                        borderRadius: 26,
                        fontFamily: SERIF,
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: '0.25em',
                        color: P.oro,
                        textDecoration: 'none',
                      }}
                      target="_blank"
                    >
                      {ROTULOS.verUbicacion}
                    </a>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      </Seccion>

      {/* ── El itinerario, con su medallón de acuarela por hito ── */}
      {itinerary === undefined || itinerary.length === 0 ? null : (
        <Seccion>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <Rotulo color={P.rosa}>{ROTULOS.itinerario}</Rotulo>
          </div>
          <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }}>
            <span aria-hidden style={{ position: 'absolute', left: 28, top: 16, bottom: 16, width: 1, background: P.oro, opacity: 0.5 }} />
            {itinerary.map((fila, indice) => (
              <Reveal delay={indice * 90} key={`${fila.time}-${fila.label}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: indice < itinerary.length - 1 ? 32 : 0 }}>
                  <span
                    style={{
                      position: 'relative',
                      display: 'block',
                      width: 95,
                      height: 95,
                      borderRadius: '50%',
                      border: `1px solid ${P.oro}`,
                      flexShrink: 0,
                      background: P.crema,
                      zIndex: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      alt=""
                      aria-hidden
                      fill
                      sizes="95px"
                      src={themeAsset('boda-sello', ICONOS_ITINERARIO[indice % ICONOS_ITINERARIO.length] ?? 'copas.avif')}
                      style={{ objectFit: 'cover' }}
                    />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontFamily: NUMERO, fontStyle: 'italic', fontWeight: 500, fontSize: 26, color: P.vino }}>
                      {fila.time}
                    </span>
                    <span style={{ display: 'block', fontFamily: SERIF, fontSize: 15, letterSpacing: '0.08em', color: P.rosa, marginTop: 4 }}>
                      {fila.label}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Seccion>
      )}

      {/* ── El código de vestimenta, sobre ciruela ── */}
      {dressCode === undefined ? null : (
        <Seccion ciruela>
          <div style={{ textAlign: 'center' }}>
            <Rotulo>{ROTULOS.vestimenta}</Rotulo>
            {dressCode.title === undefined ? null : (
              <p style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 12 }}>
                {dressCode.title}
              </p>
            )}
            <Arte ancho={235} estilo={{ margin: '36px auto' }} flota src={themeAsset('boda-sello', 'vestido-y-saco.avif')} />
            {dressCode.note === undefined ? null : (
              <p style={{ fontSize: 16, fontStyle: 'italic', opacity: 0.75, marginTop: 8 }}>{dressCode.note}</p>
            )}
          </div>
        </Seccion>
      )}

      {/* ── Solo adultos ── */}
      {soloAdultos === undefined ? null : (
        <Seccion>
          <div style={{ border: `1.5px solid ${P.oro}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <Arte ancho={214} estilo={{ margin: '0 auto' }} flota src={themeAsset('boda-sello', 'tacon-y-corbata.avif')} />
            <p style={{ fontSize: 18, fontStyle: 'italic', lineHeight: 1.6, color: P.vino, maxWidth: '82%', margin: '32px auto 0' }}>
              {soloAdultos.text}
            </p>
            {soloAdultos.title === undefined ? null : (
              <div style={{ marginTop: 20 }}>
                <Rotulo color={P.rosa}>{soloAdultos.title}</Rotulo>
              </div>
            )}
          </div>
        </Seccion>
      )}

      {/* ── La mesa de regalos ── */}
      <Seccion>
        <div style={{ textAlign: 'center' }}>
          <Arte ancho={230} estilo={{ margin: '0 auto 18px' }} src={themeAsset('boda-sello', 'regalo.avif')} />
          <Rotulo color={P.rosa}>{regalos?.title ?? ROTULOS.regalos}</Rotulo>
          {regalos?.text === undefined ? null : (
            <p style={{ fontSize: 19, color: P.vino, marginTop: 18, lineHeight: 1.7 }}>{regalos.text}</p>
          )}
          <div style={{ marginTop: 22 }}>{slots.registry}</div>
        </div>
      </Seccion>

      {/* ── La canción ── */}
      {cancion === undefined ? null : (
        <Seccion>
          <Arte
            ancho={420}
            estilo={{ width: '90%', borderRadius: 14, border: `1.5px solid ${P.oro}`, margin: '0 auto 28px' }}
            src={themeAsset('boda-sello', 'pareja-musica.avif')}
          />
          <MusicPlayer
            accent={P.oro}
            artist={music?.artist ?? ''}
            audioSrc={cancion}
            eyebrow={themes.songOfTheNight}
            playBg={P.vino}
            playIconColor={P.crema}
            textColor={P.vino}
            track={music?.track ?? ''}
            trackColor={P.vino}
          />
        </Seccion>
      )}

      {/* ── Confirmación ── */}
      <Seccion esquinas={['tr', 'bl']}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Rotulo color={P.rosa}>{ROTULOS.confirma}</Rotulo>
        </div>
        <div style={{ width: '100%' }}>{slots.rsvp}</div>
      </Seccion>

      {/* ── El libro de firmas ── */}
      <Seccion>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.vino }}>{ROTULOS.mensaje}</p>
        </div>
        <div style={{ width: '100%' }}>{slots.guestbook}</div>
      </Seccion>

      {/* ── Las fotos del invitado ── */}
      <Seccion>
        <div style={{ border: `1.5px solid ${P.oro}`, borderRadius: 16, padding: '36px 22px', textAlign: 'center' }}>
          <Arte alto={289} ancho={289} estilo={{ margin: '0 auto' }} src={themeAsset('boda-sello', 'camara.avif')} />
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 32, color: P.vino, marginTop: 24 }}>{ROTULOS.fotos}</p>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>{slots.photos}</div>
        </div>
      </Seccion>

      {/* ── El cierre, sobre ciruela ── */}
      <Seccion ciruela estilo={{ paddingTop: 0, paddingBottom: 80 }}>
        <div style={{ margin: '0 -34px 34px', width: 'calc(100% + 68px)' }}>
          <FotoConOnda alto={300} fondo={P.ciruela} posicion="center 20%" src={themeAsset('boda-sello', 'pareja-cierre.avif')} />
        </div>
        <div style={{ textAlign: 'center' }}>
          {closing?.text === undefined ? null : (
            <p style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{closing.text}</p>
          )}
          <p style={{ fontFamily: CALIGRAFIA, fontSize: 36, marginTop: 12 }}>{nombres}</p>
          <span aria-hidden style={{ display: 'block', width: 110, height: 1, background: P.oro, margin: '32px auto' }} />
          {closing?.signature === undefined ? null : <Rotulo>{closing.signature}</Rotulo>}
          {fechaCorta === '' ? null : (
            <p style={{ fontFamily: NUMERO, fontStyle: 'italic', fontWeight: 500, fontSize: 22, color: P.oro, marginTop: 16 }}>{fechaCorta}</p>
          )}
          <div style={{ marginTop: 28 }}>{slots.pass}</div>
        </div>
      </Seccion>
    </article>
  )
}

/** Un bloque del diseño: crema o ciruela, con sus esquinas de flores pintadas. */
function Seccion({
  children,
  ciruela = false,
  esquinas = ['tl', 'br'],
  estilo,
}: {
  readonly children: React.ReactNode
  readonly ciruela?: boolean
  readonly esquinas?: readonly ('tl' | 'tr' | 'bl' | 'br')[]
  readonly estilo?: React.CSSProperties
}) {
  return (
    <section
      style={{
        position: 'relative',
        background: ciruela ? P.ciruela : P.crema,
        color: ciruela ? P.cremaTinta : P.vino,
        overflow: 'hidden',
        padding: '68px 34px',
        ...estilo,
      }}
    >
      {/* Las esquinas solo van sobre el papel crema: sobre ciruela no las pinta la maqueta. */}
      {ciruela
        ? null
        : esquinas.map((esquina) => (
            <Esquina clave={esquina} key={esquina} />
          ))}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </section>
  )
}

/** Una esquina de flores pintadas, flotando. */
function Esquina({ clave }: { readonly clave: 'tl' | 'tr' | 'bl' | 'br' }) {
  const derecha = clave === 'tr' || clave === 'br'
  const abajo = clave === 'bl' || clave === 'br'
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        [abajo ? 'bottom' : 'top']: 4,
        [derecha ? 'right' : 'left']: 4,
        width: 162,
        opacity: 0.92,
        transform: abajo ? 'scaleY(-1)' : undefined,
        pointerEvents: 'none',
        zIndex: 0,
        animation: 'theme-floatIcon 4s ease-in-out infinite',
      }}
    >
      <Image
        alt=""
        height={162}
        sizes="162px"
        src={themeAsset('boda-sello', derecha ? 'esquina-derecha.avif' : 'esquina-izquierda.avif')}
        style={{ width: '100%', height: 'auto' }}
        width={162}
      />
    </span>
  )
}

/** El rótulo en versales con mucho interletrado que abre cada bloque. */
function Rotulo({
  children,
  color,
  tamano = 15,
  estilo,
}: {
  readonly children: React.ReactNode
  readonly color?: string
  readonly tamano?: number
  readonly estilo?: React.CSSProperties
}) {
  return (
    <p
      style={{
        fontFamily: SERIF,
        fontSize: tamano,
        letterSpacing: tamano <= 12 ? '0.18em' : '0.4em',
        fontWeight: 600,
        textTransform: 'uppercase',
        color,
        ...estilo,
      }}
    >
      {children}
    </p>
  )
}

/** Una fotografía a sangre que se funde con el papel por una onda dibujada. */
function FotoConOnda({
  src,
  alto,
  posicion = 'center',
  fondo = P.crema,
}: {
  readonly src: string
  readonly alto: number
  readonly posicion?: string
  readonly fondo?: string
}) {
  return (
    <div style={{ position: 'relative', width: '100%', height: alto }}>
      <Image alt="" aria-hidden fill sizes="480px" src={src} style={{ objectFit: 'cover', objectPosition: posicion }} />
      <svg
        aria-hidden
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 50, display: 'block' }}
        viewBox="0 0 100 30"
      >
        <path d="M0,10 C15,4 28,16 42,9 C58,2 70,18 85,11 C92,8 96,13 100,10 L100,30 L0,30 Z" fill={fondo} />
      </svg>
    </div>
  )
}

/** Una pieza de acuarela del diseño: los iconos y las fotografías enmarcadas. */
function Arte({
  src,
  ancho,
  alto,
  flota = false,
  estilo,
}: {
  readonly src: string
  readonly ancho: number
  readonly alto?: number
  readonly flota?: boolean
  readonly estilo?: React.CSSProperties
}) {
  return (
    <span
      style={{
        display: 'block',
        maxWidth: ancho,
        animation: flota ? 'theme-floatIcon 3.6s ease-in-out infinite' : undefined,
        ...estilo,
      }}
    >
      <Image
        alt=""
        aria-hidden
        height={alto ?? ancho}
        sizes={`${ancho}px`}
        src={src}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'inherit' }}
        width={ancho}
      />
    </span>
  )
}

/** Un grupo de anfitriones: su título, su filete y sus nombres en versales. */
function Familia({ titulo, nombres }: { readonly titulo: string; readonly nombres: readonly (string | undefined)[] }) {
  const lista = nombres.filter((nombre): nombre is string => nombre !== undefined && nombre !== '')
  if (lista.length === 0) return null
  return (
    <div>
      <p style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: '0.35em', fontWeight: 700, color: P.oro }}>{titulo}</p>
      <span aria-hidden style={{ display: 'block', width: 80, height: 1, background: P.oro, margin: '8px auto 10px' }} />
      {lista.map((nombre) => (
        <p key={nombre} style={{ fontFamily: SERIF, fontSize: 15, textTransform: 'uppercase', color: P.vino, lineHeight: 1.8 }}>
          {nombre}
        </p>
      ))}
    </div>
  )
}
