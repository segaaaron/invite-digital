import type { CSSProperties, ReactNode } from 'react'
import { comoLlegar } from '../../../domain/ubicacion'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { CapaFija } from '../kit/CapaFija'
import { MapPreview } from '../kit/MapPreview'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { FemmeCover } from './FemmeCover'
import { CuentaFemme, ReproductorFemme } from './FemmePiezas'
import { PALETA as P } from './cumple-femme.palette'

const SERIF = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'
const SANS = 'var(--font-dm-sans)'

/** La sombra de todo el texto: sin ella, sobre el terciopelo del fondo no se lee. */
const SOMBRA = '0 2px 8px rgba(0,0,0,0.8)'
const TARJETA: CSSProperties = { background: P.vidrio, border: `1px solid ${P.filete}`, borderRadius: 10, backdropFilter: 'blur(3px)' }
/** El arco de las dos fotos: medio punto arriba, esquinas suaves abajo, filete de oro. */
const ARCO: CSSProperties = {
  width: '100%',
  borderRadius: '50% 50% 14px 14px / 42% 42% 14px 14px',
  border: `2px solid ${P.oroViejo}`,
  overflow: 'hidden',
  boxShadow: `0 18px 40px rgba(0,0,0,.6), 0 0 0 6px ${P.aro}`,
}

/** Los titulares de cada bloque: Cormorant en oro, versales espaciadas. */
function Titular({ children }: { readonly children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: SERIF,
        fontWeight: 600,
        fontSize: 24,
        letterSpacing: '0.08em',
        color: P.oro,
        textAlign: 'center',
        lineHeight: 1.2,
        textWrap: 'balance',
      }}
    >
      {children}
    </h2>
  )
}

function Foto({ src, alt, aspecto, foco }: { readonly src: string; readonly alt: string; readonly aspecto: string; readonly foco: string }) {
  return (
    <div style={{ ...ARCO, aspectRatio: aspecto }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- arte del tema o foto del evento ya
          reducida al subirla: el optimizador no aporta nada. */}
      <img alt={alt} src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: foco, display: 'block' }} />
    </div>
  )
}

const mayuscula = (texto: string) => (texto === '' ? texto : texto[0]!.toLocaleUpperCase() + texto.slice(1))

/**
 * «Femme Fatale» — la fiesta de disfraces entre amigas, de `invites-1.jsx:152` de la maqueta V5
 * (`BirthdayInvite`, «Noche Escarlata»).
 *
 * El cartel de cabaret de portada y, dentro, el tocador de terciopelo quieto detrás de todo
 * con un velo que lo oscurece arriba: el titular, las dos fotos en arco, la cuenta atrás, la
 * ficha, el mapa, la canción, las etiquetas de la noche y «¿Vienes?».
 *
 * **Los avisos tienen sitio fijo** y se leen por índice (lo cuenta `cumple-femme.content.ts`).
 */
export function CumpleFemmeView({ content, event, dictionary, themes, slots, guestInfo, audioSrc, respondida = false, asistira = false }: ThemeProps) {
  const ROTULOS = themes.designs['cumple-femme']
  const { hero, quote, schedule, gallery, notes, reception, dressCode, map, music, closing } = content

  const etiqueta = guestInfo?.label.trim() ?? ''
  const invitado = etiqueta === '' ? null : etiqueta

  const [tarjeta, brindis, ultimaFila, vibra] = [notes?.[0], notes?.[1], notes?.[2], notes?.[3]]
  const fotoDe = (indice: number, arte: 'amigas-disfraces.avif' | 'brindis-copas.avif') => {
    const id = gallery?.[indice]?.imageId
    return id === undefined ? themeAsset('cumple-femme', arte) : `/media/${id}`
  }

  // La fecha y la hora, leídas tal cual de lo escrito: la hora sale de la cadena y no de un
  // `Date`, que la pasaría por la zona del servidor.
  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const valida = cuando !== null && !Number.isNaN(cuando.getTime())
  const local = event.locale === 'en' ? 'en-US' : 'es-BO'
  const parte = (opciones: Intl.DateTimeFormatOptions) => (valida ? cuando.toLocaleDateString(local, opciones) : '')
  const hora = schedule?.startsAt.slice(11, 16) ?? ''
  const dia = parte({ day: 'numeric' })
  const mes = parte({ month: 'long' })
  // «17 · OCTUBRE · 18:00» bajo el titular, y «Sábado 17 de octubre» en la ficha.
  const fechaCorta = valida ? [dia, mes.toLocaleUpperCase(local), hora].filter((p) => p !== '').join(' · ') : ''
  const fechaLarga = !valida
    ? ''
    : event.locale === 'en'
      ? parte({ weekday: 'long', month: 'long', day: 'numeric' })
      : mayuscula(`${parte({ weekday: 'long' })} ${dia} de ${mes}`)

  const lugar = reception?.place ?? ''
  const llegar = comoLlegar({ href: map?.href, coords: map?.coords }, lugar)

  // La ficha, en el orden de la maqueta. Lo que no está escrito no se pinta.
  const ficha = [
    [ROTULOS.fecha, fechaLarga],
    [ROTULOS.hora, hora],
    [ROTULOS.lugar, lugar],
    [ROTULOS.vestimenta, dressCode?.title ?? ''],
    [ultimaFila?.title ?? '', ultimaFila?.text ?? ''],
  ].filter(([clave, valor]) => clave !== '' && valor !== '')

  const lineas = (quote?.text ?? '').split('\n').filter((linea) => linea.trim() !== '')
  const etiquetas = (vibra?.text ?? '').split(/\s+/).filter((t) => t !== '')
  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  // Lo que no dibuja este diseño —el libro de firmas, la mesa de regalos— entra con su piel; y
  // el RSVP con los botones de la maqueta: huecos sobre el vidrio, «ENVIAR» en vino.
  const RANURAS = {
    ...variablesDeRanuras(pielDeRanuras({ acento: P.oroViejo, sobreAcento: P.tintaSobreOro, tinta: P.crema, display: SERIF, radio: 10 })),
    '--rsvp-fondo': P.vidrio,
    '--rsvp-enviar': P.vino,
    '--rsvp-enviar-tinta': P.crema,
  } as CSSProperties

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: P.noche,
        color: P.crema,
        fontFamily: SANS,
        lineHeight: 'normal',
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      {/* El tocador de terciopelo, quieto detrás de todo, y el velo que lo oscurece arriba. */}
      <CapaFija
        style={{
          backgroundImage: `url(${themeAsset('cumple-femme', 'fondo-tocador.avif')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        zIndex={0}
      />
      <CapaFija style={{ background: P.velo }} zIndex={0} />

      <FemmeCover bg={P.noche} bgAsset={themeAsset('cumple-femme', 'portada-cabaret.avif')} cta={ROTULOS.entrar} openLabel={themes.coverAria} />

      <ThemeColumn style={{ zIndex: 1, padding: '48px 24px 60px', textShadow: SOMBRA, textAlign: 'center' }}>
        {/* ── El titular ── */}
        <Reveal delay={120} scale={0.9}>
          <div>
            {hero?.eyebrow === undefined ? null : (
              <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, letterSpacing: '0.22em', color: P.oro }}>{hero.eyebrow}</div>
            )}
            <h1
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: 54,
                lineHeight: 0.95,
                letterSpacing: '0.04em',
                color: P.crema,
                marginTop: 14,
                textTransform: 'uppercase',
                // «FEMME / FATALE» en dos líneas, como la maqueta: una palabra por renglón.
                maxWidth: '7.5em',
                marginInline: 'auto',
              }}
            >
              {hero?.nameA ?? ''}
            </h1>
            {/* Caligrafía, versales, caligrafía: «Te espero para festejar · UNA NOCHE SEXY Y
                SENSUAL · entre amigas». */}
            {lineas.map((linea, i) =>
              i % 2 === 0 ? (
                <div key={i} style={{ fontFamily: CALIGRAFIA, fontSize: 34, marginTop: i === 0 ? 18 : 6, color: P.crema, lineHeight: 1.1 }}>
                  {linea}
                </div>
              ) : (
                <div
                  key={i}
                  style={{
                    fontFamily: SERIF,
                    fontSize: 26,
                    fontWeight: 700,
                    marginTop: 8,
                    color: P.oroViejo,
                    letterSpacing: '0.06em',
                    lineHeight: 1.15,
                    textWrap: 'balance',
                  }}
                >
                  {linea}
                </div>
              ),
            )}
            {fechaCorta === '' ? null : (
              <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, letterSpacing: '0.14em', color: P.oro, marginTop: 18 }}>{fechaCorta}</div>
            )}
          </div>
        </Reveal>

        {/* ── Las amigas disfrazadas ── */}
        {gallery?.[0] === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <Foto alt={gallery[0].label} aspecto="3/2" foco="center 40%" src={fotoDe(0, 'amigas-disfraces.avif')} />
            </div>
          </Reveal>
        )}

        {tarjeta === undefined ? null : (
          <Reveal>
            <div style={{ ...TARJETA, marginTop: 36, padding: '26px 20px' }}>
              {tarjeta.title === undefined ? null : (
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, lineHeight: 1.3, color: P.crema, textWrap: 'pretty' }}>{tarjeta.title}</div>
              )}
              {tarjeta.text === undefined ? null : (
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: P.oro, marginTop: 14 }}>{tarjeta.text}</div>
              )}
            </div>
          </Reveal>
        )}

        {/* ── El brindis ── */}
        {brindis === undefined && gallery?.[1] === undefined ? null : (
          <Reveal delay={120}>
            <div style={{ marginTop: 40 }}>
              {brindis?.title === undefined ? null : <Titular>{brindis.title}</Titular>}
              {gallery?.[1] === undefined ? null : (
                <div style={{ marginTop: 18 }}>
                  <Foto alt={gallery[1].label} aspecto="4/3" foco="center 45%" src={fotoDe(1, 'brindis-copas.avif')} />
                </div>
              )}
              {brindis?.text === undefined ? null : (
                <div style={{ marginTop: 16, fontFamily: CALIGRAFIA, fontSize: 30, lineHeight: 1.25, color: P.crema, textWrap: 'balance' }}>
                  {brindis.text}
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Faltan ── */}
        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <Titular>{themes.countdownPrefix.toLocaleUpperCase(local)}</Titular>
              <CuentaFemme
                esHoy={ROTULOS.esHoy}
                labels={[themes.countdownDays, themes.countdownHoursLong, themes.countdownMins, themes.countdownSecs]}
                targetISO={schedule.startsAt}
              />
            </div>
          </Reveal>
        )}

        {/* ── La ficha ── */}
        {ficha.length === 0 ? null : (
          <Reveal>
            <div style={{ ...TARJETA, marginTop: 36, padding: '6px 16px', textAlign: 'left' }}>
              {ficha.map(([clave, valor], i) => (
                <div
                  key={clave}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 14,
                    padding: '13px 0',
                    borderTop: i === 0 ? 'none' : `1px solid ${P.fileteSuave}`,
                  }}
                >
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: P.oro, flexShrink: 0 }}>{clave}</span>
                  <span style={{ fontFamily: SANS, fontSize: 17, textAlign: 'right', lineHeight: 1.35 }}>{valor}</span>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* ── Aquí nos vemos ── */}
        {lugar === '' && map === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <Titular>{ROTULOS.nosVemos}</Titular>
              <div style={{ marginTop: 14 }}>
                <MapPreview
                  accent={P.oroViejo}
                  border={P.filete}
                  coords=""
                  directionsLabel={themes.viewLocation}
                  height={150}
                  href={map?.href}
                  label=""
                  pinDot={P.punto}
                  respaldo={lugar}
                  sinEsquina
                />
              </div>
              {lugar === '' ? null : <div style={{ marginTop: 12, fontSize: 17, lineHeight: 1.4, textWrap: 'balance' }}>{lugar}</div>}
              {llegar === null ? null : (
                <a
                  href={llegar}
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 14,
                    padding: '12px 24px',
                    background: P.oroViejo,
                    color: P.tintaSobreOro,
                    borderRadius: 999,
                    fontFamily: SANS,
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: '0.04em',
                    textDecoration: 'none',
                    textShadow: 'none',
                    boxShadow: '0 6px 18px rgba(0,0,0,.45)',
                  }}
                  target="_blank"
                >
                  {ROTULOS.verMaps}
                </a>
              )}
            </div>
          </Reveal>
        )}

        {/* ── La canción ── */}
        {music?.track === undefined && cancion === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <ReproductorFemme artist={music?.artist ?? ''} audioSrc={cancion} track={music?.track ?? ''} />
            </div>
          </Reveal>
        )}

        {/* ── La vibra de la noche ── */}
        {vibra === undefined ? null : (
          <Reveal>
            <div style={{ ...TARJETA, marginTop: 28, padding: '20px 16px' }}>
              {vibra.title === undefined ? null : <Titular>{vibra.title}</Titular>}
              {etiquetas.length === 0 ? null : (
                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                  {etiquetas.map((t, i) => (
                    <span key={`${t}-${i}`} style={{ fontSize: 15, padding: '6px 12px', border: `1px solid ${P.fileteEtiqueta}`, borderRadius: 999, color: P.crema }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* ── ¿Vienes? ── */}
        <Reveal>
          <div style={{ marginTop: 40 }}>
            {/* A quién va: cada enlace es de alguien. En el escaparate no hay invitado y no se
                pinta, como en la maqueta. */}
            {invitado === null ? null : (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', color: P.oro, textTransform: 'uppercase' }}>
                  {dictionary.invitationFor}
                </div>
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.crema, lineHeight: 1.2, marginTop: 4 }}>{invitado}</div>
              </div>
            )}
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: P.crema }}>{ROTULOS.vienes}</div>
            {respondida ? (
              <div style={{ ...TARJETA, marginTop: 14, padding: '20px 16px' }} role="status">
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 32, color: P.crema }}>{asistira ? ROTULOS.graciasViene : ROTULOS.graciasNo}</div>
                <div style={{ fontSize: 15, color: P.oro, marginTop: 6 }}>{ROTULOS.enviada}</div>
              </div>
            ) : (
              <div style={{ marginTop: 14, textShadow: 'none' }}>{slots.rsvp}</div>
            )}
          </div>
        </Reveal>

        {/* El libro de firmas y la mesa de regalos no están en la maqueta; son nuestros y van con
            la piel del diseño. Sin ellos en el plan, las ranuras no pintan nada. **Sin pase**: una
            fiesta entre amigas no controla la entrada con un QR. */}
        {slots.guestbook === null ? null : (
          <Reveal>
            <div style={{ ...TARJETA, marginTop: 36, padding: '20px 16px', textShadow: 'none' }}>
              <Titular>{ROTULOS.guestbook}</Titular>
              <div style={{ marginTop: 14 }}>{slots.guestbook}</div>
            </div>
          </Reveal>
        )}
        <div style={{ marginTop: 28, textShadow: 'none' }}>{slots.registry}</div>

        {closing?.text === undefined ? null : (
          <div
            style={{
              marginTop: 40,
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 21,
              lineHeight: 1.4,
              color: P.oro,
              textWrap: 'balance',
            }}
          >
            {closing.text}
          </div>
        )}
      </ThemeColumn>
    </article>
  )
}
