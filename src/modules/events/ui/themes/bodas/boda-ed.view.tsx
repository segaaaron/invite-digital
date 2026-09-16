import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { OvalFrameCover } from './OvalFrameCover'
import { CARTA_DE_COLOR, PALETA as P } from './boda-ed.palette'

const MONO = 'var(--font-jetbrains-mono)'
const DISPLAY = 'var(--font-spectral)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/**
 * «Editorial» — María & Alex, de `wedding-variants.jsx:558`.
 *
 * **La maqueta lo rehízo entero.** Era una revista de papel crema con tinta negra y acento
 * terracota; ahora es verde botánico con oro encima: fotografía de hojas de fondo, retrato
 * enmarcado flotando sobre ella, dos tarjetas con iconos dorados, seis dibujos para el
 * itinerario y un muestrario de color para la vestimenta. Se repintó aquí en vez de
 * mantener las dos versiones, porque un diseño es uno.
 *
 * El fondo va **fijo y detrás de todo**, y por eso el artículo no lleva color propio: uno
 * opaco taparía la fotografía entera. Dentro del marco de la vista previa se ancla a la
 * tarjeta, que es lo que se quiere.
 *
 * Los seis iconos del itinerario vienen en **una sola lámina** de tres por dos, y cada fila
 * enseña su casilla moviendo la imagen dentro de una ventana de 56 píxeles. Ahí `imageId`
 * es el número de casilla —`0` a `5`—, no una fotografía del evento; sin él manda el orden
 * de la fila.
 */
export function BodaEdView({ content, event, dictionary, themes, slots, guestInfo }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, dressCode, gallery, notes, closing } =
    content

  // La cita del principio son tres piezas y el orden es del diseño: titular, firma de quien
  // lo dice y la columna con capitular. Es un solo bloque porque en la maqueta es un solo
  // texto, y partirlo en tres campos sería inventar una estructura que el diseño no tiene.
  const [titular = '', firma = '', ...parrafos] = (quote?.text ?? '').split('\n\n')
  const historia = parrafos.join('\n\n')
  const capitular = historia.slice(0, 1)
  const cuerpo = historia.slice(1)

  const portada = gallery?.[0]
  const nosotros = gallery?.[1]
  const invitacion = notes?.[0]
  const soloAdultos = notes?.[1]
  const lugar = notes?.[2]
  const fotos = notes?.[3]

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const fechaLarga =
    cuando === null
      ? ''
      : cuando
          .toLocaleDateString(event.locale === 'en' ? 'en-US' : 'es-BO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          .toUpperCase()

  // Las iniciales de la portada se calculan, no se copian: la maqueta las pasa a mano
  // («MA») y el `monogram` del contenido es otra cosa —«· MARÍA & ALEX ·», la mancheta—.
  const iniciales = [hero?.nameA, hero?.nameB]
    .map((nombre) => (nombre ?? '').replace(/[^\p{L}]/gu, '').slice(0, 1).toUpperCase())
    .join('')

  const tarjetas = [
    { lugar: ceremony, icono: 'templo-dorado-sf.avif' as const },
    { lugar: reception, icono: 'copas-doradas-sf.avif' as const },
  ].filter((tarjeta) => tarjeta.lugar !== undefined)

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.fondo, acento: P.oro, acentoHondo: P.oroPalido, display: DISPLAY, tinta: P.papel }))

  return (
    <article style={{ ...RANURAS, position: 'relative', color: P.papel, fontFamily: DISPLAY, minHeight: '100dvh', overflowX: 'clip' }}>
      <OvalFrameCover
        accent={P.oro}
        bg={P.fondo}
        bgAsset={themeAsset('boda-ed', 'fondo-verde.avif')}
        eyebrow={hero?.eyebrow ?? ''}
        hint={themes.coverEnterShared}
        initials={iniciales}
        initialsColor={P.oroPalido}
        names={`${hero?.nameA ?? ''} ${hero?.nameB ?? ''}`.trim()}
        openLabel={themes.coverAria}
        ringsAsset={themeAsset('boda-ed', 'aros-sf.avif')}
        textColor={P.papel}
      />

      {/* La fotografía de hojas, fija y detrás de todo. */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1 }}>
        <Image
          alt=""
          fill
          sizes="480px"
          src={themeAsset('boda-ed', 'fondo-verde-hojas.avif')}
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: P.veloHoja }} />
      </div>

      <ThemeColumn>
        {/* La mancheta. */}
        <div style={{ padding: '22px 24px', borderBottom: `1.5px solid ${P.oro}`, position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '-10px -6px',
              background: P.veloFuerte,
              filter: 'blur(10px)',
              zIndex: -1,
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 56, fontWeight: 200, letterSpacing: '0.04em', lineHeight: 0.95 }}>
              {hero?.eyebrow ?? ''}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 2 }}>{hero?.monogram ?? ''}</div>
            <div style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: '0.3em', marginTop: 8, fontWeight: 600 }}>
              {fechaLarga}
            </div>
          </div>
        </div>

        {/* La portada: el retrato enmarcado sobre las hojas. */}
        <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              top: 24,
              bottom: 76,
              width: '72%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderRadius: 10,
              border: `1.5px solid ${P.oro}`,
              overflow: 'hidden',
            }}
          >
            <PhotoSlot
              bg="transparent"
              border="none"
              color="rgba(245,239,224,0.5)"
              height="100%"
              label={portada?.label ?? themes.portraitPlaceholder}
              radius={0}
              src={
                portada?.imageId === undefined ? themeAsset('boda-ed', 'novios-verde.avif') : `/media/${portada.imageId}`
              }
              width="100%"
            />
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 140,
              background: `linear-gradient(180deg, transparent 0%, ${P.fondo} 90%)`,
            }}
          />
          <div style={{ position: 'absolute', bottom: 20, left: 32, right: 32 }}>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontStyle: 'italic',
                fontWeight: 200,
                fontSize: 64,
                color: P.crema,
                lineHeight: 0.9,
                letterSpacing: '-0.01em',
                margin: 0,
                textShadow: '0 2px 12px rgba(15,35,24,0.4)',
              }}
            >
              {hero?.nameA ?? ''}
              {hero?.nameB === undefined ? null : (
                <>
                  <br />
                  <span style={{ fontStyle: 'normal', fontWeight: 400 }}>{hero.nameB}</span>
                </>
              )}
            </h1>
            <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.oroPalido }}>
              {hero?.serial ?? ''}
            </div>
          </div>
        </div>

        <div style={{ padding: '32px 24px 0', position: 'relative' }}>
          {titular === '' ? null : (
            <Reveal>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 32,
                  fontWeight: 200,
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
                  padding: '0 24px',
                }}
              >
                {titular}
              </div>
              {firma === '' ? null : (
                <div
                  style={{
                    marginTop: 10,
                    padding: '0 24px',
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: '0.3em',
                    opacity: 0.7,
                  }}
                >
                  {firma}
                </div>
              )}
            </Reveal>
          )}

          {historia === '' ? null : (
            <Reveal>
              <div style={{ marginTop: 28, fontSize: 14, lineHeight: 1.65, color: P.papelSuave }}>
                <span
                  style={{
                    float: 'left',
                    fontFamily: DISPLAY,
                    fontSize: 64,
                    fontWeight: 200,
                    lineHeight: 0.85,
                    paddingRight: 8,
                    paddingTop: 4,
                    color: P.oro,
                  }}
                >
                  {capitular}
                </span>
                {cuerpo}
              </div>
            </Reveal>
          )}
        </div>

        {/* A quién va dirigida, compuesto como en la maqueta: la línea de invitación, el
            nombre en caligrafía, el rótulo, el número de pases y su palabra. Con la línea
            ya hecha de la ranura no se puede componer así, por eso llega como dato. */}
        <Reveal>
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            {invitacion?.text === undefined ? null : (
              <div style={{ fontFamily: DISPLAY, fontSize: 15, lineHeight: 1.8, maxWidth: '70%', margin: '0 auto' }}>
                {invitacion.text}
              </div>
            )}
            {guestInfo === undefined ? (
              slots.guest
            ) : (
              <>
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.oro, marginTop: 30 }}>
                  {guestInfo.label}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 14 }}>
                  {themes.reservedForYou}
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 56, color: P.papel, marginTop: 14, lineHeight: 1 }}>
                  {guestInfo.seats}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', marginTop: 8 }}>
                  {themes.passes}
                </div>
              </>
            )}
          </div>
        </Reveal>

        {hosts === undefined ? null : (
          <Reveal>
            <div
              style={{
                padding: '40px 24px',
                margin: '30px 0',
                borderTop: `2px solid ${P.oro}`,
                borderBottom: `2px solid ${P.oro}`,
              }}
            >
              {hosts.label === undefined ? null : (
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontStyle: 'italic',
                    fontSize: 26,
                    fontWeight: 200,
                    textAlign: 'center',
                    color: P.papel,
                  }}
                >
                  {hosts.label}
                </div>
              )}
              {/* Tres parejas y tres rótulos, en el orden del diseño: los nombres van en una
                  lista plana y quien los agrupa es la composición. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 32 }}>
                {[
                  { rotulo: themes.brideParents, nombres: anfitrionesBoda(hosts).novia },
                  { rotulo: themes.groomParents, nombres: anfitrionesBoda(hosts).novio },
                ].map((grupo) =>
                  grupo.nombres.length === 0 ? null : (
                    <div key={grupo.rotulo} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', color: P.oro }}>
                        {grupo.rotulo}
                      </div>
                      {grupo.nombres.map((nombre) => (
                        <div key={nombre} style={{ fontFamily: DISPLAY, fontSize: 16, marginTop: 10, lineHeight: 1.6 }}>
                          {nombre}
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
              {anfitrionesBoda(hosts).padrinos.length === 0 ? null : (
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', color: P.oro }}>
                    {themes.godparents}
                  </div>
                  {anfitrionesBoda(hosts).padrinos.map((nombre) => (
                    <div key={nombre} style={{ fontFamily: DISPLAY, fontSize: 16, marginTop: 10, lineHeight: 1.6 }}>
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
            <div style={{ padding: '36px 20px', display: 'flex', gap: 14, justifyContent: 'center' }}>
              {tarjetas.map((tarjeta) => (
                <div
                  key={tarjeta.icono}
                  style={{
                    flex: 1,
                    background: P.velo,
                    border: `1.5px solid ${P.oro}`,
                    borderRadius: 16,
                    padding: '28px 8px 22px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <Image
                    alt=""
                    height={64}
                    src={themeAsset('boda-ed', tarjeta.icono)}
                    style={{ width: '62%', height: 64, objectFit: 'contain' }}
                    width={64}
                  />
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro }}>{tarjeta.lugar?.label ?? ''}</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 30, color: P.papel }}>{tarjeta.lugar?.time ?? ''}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.15em', color: P.papel, opacity: 0.85 }}>
                    {(tarjeta.lugar?.place ?? '').toUpperCase()}
                  </div>
                  {map?.href === undefined ? null : (
                    <a
                      href={map.href}
                      rel="noopener noreferrer"
                      style={{
                        background: P.oro,
                        color: P.fondo,
                        fontFamily: MONO,
                        fontSize: 9,
                        letterSpacing: '0.15em',
                        fontWeight: 700,
                        padding: '10px 14px',
                        borderRadius: 20,
                        textDecoration: 'none',
                      }}
                      target="_blank"
                    >
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
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: '60%',
                transform: 'translateX(-50%)',
                background: P.veloSuave,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
            <Reveal>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 44,
                  fontWeight: 200,
                  lineHeight: 1,
                  marginTop: 8,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {themes.itinerary}
                <span style={{ fontStyle: 'italic' }}>.</span>
              </div>
            </Reveal>

            <Reveal>
              <div
                style={{
                  marginTop: 28,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  rowGap: 32,
                  columnGap: 10,
                  position: 'relative',
                }}
              >
                {itinerary.map((fila, indice) => {
                  const casilla = Number.parseInt(fila.imageId ?? '', 10)
                  const posicion = Number.isNaN(casilla) ? indice : casilla
                  const columna = posicion % 3
                  const renglon = Math.floor(posicion / 3) % 2

                  return (
                    <div
                      key={`${fila.time}-${fila.label}`}
                      style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                      <div aria-hidden style={{ width: 56, height: 56, overflow: 'hidden', position: 'relative' }}>
                        <Image
                          alt=""
                          height={112}
                          src={themeAsset('boda-ed', 'iconos-dorados-sf.avif')}
                          style={{
                            position: 'absolute',
                            width: '300%',
                            height: '200%',
                            left: `${-columna * 100}%`,
                            top: `${-renglon * 100}%`,
                            objectFit: 'contain',
                            filter: 'brightness(1.5) saturate(1.3) drop-shadow(0 1px 3px rgba(0,0,0,.5))',
                          }}
                          width={168}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: DISPLAY,
                          fontSize: 22,
                          color: P.hueso,
                          marginTop: 10,
                          textShadow: '0 1px 4px rgba(0,0,0,.4)',
                        }}
                      >
                        {fila.time}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 8.5,
                          letterSpacing: '0.12em',
                          color: P.papelClaro,
                          marginTop: 6,
                          lineHeight: 1.5,
                          textShadow: '0 1px 3px rgba(0,0,0,.4)',
                        }}
                      >
                        {fila.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Reveal>
          </div>
        )}

        {nosotros === undefined ? null : (
          <div style={{ padding: '44px 24px 0', textAlign: 'center' }}>
            <Reveal>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 46, color: P.oro }}>{nosotros.label}</div>
            </Reveal>
            <Reveal>
              <div
                style={{
                  marginTop: 24,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: `1.5px solid ${P.oro}`,
                  aspectRatio: '1024 / 894',
                }}
              >
                <PhotoSlot
                  bg="transparent"
                  border="none"
                  color="rgba(245,239,224,0.5)"
                  height="100%"
                  label={nosotros.label}
                  objectPosition="center bottom"
                  radius={0}
                  src={
                    nosotros.imageId === undefined
                      ? themeAsset('boda-ed', 'novios-fotos.avif')
                      : `/media/${nosotros.imageId}`
                  }
                  width="100%"
                />
              </div>
            </Reveal>
          </div>
        )}

        <div style={{ padding: '0 24px' }}>
          {dressCode === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 40 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.oro, textAlign: 'center' }}>
                  {dressCode.note ?? themes.dressCode}
                </div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 44,
                    fontWeight: 200,
                    lineHeight: 1,
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  {dressCode.title ?? ''}
                  <span style={{ fontStyle: 'italic' }}>.</span>
                </div>

                <Image
                  alt=""
                  height={260}
                  src={themeAsset('boda-ed', 'trajes-dorados-sf.avif')}
                  style={{ width: '70%', height: 'auto', display: 'block', margin: '26px auto' }}
                  width={260}
                />

                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, width: '58%', margin: '22px auto 0' }}>
                  {CARTA_DE_COLOR.map((muestra) => (
                    <div key={muestra.nombre} style={{ textAlign: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          background: muestra.color,
                          border: `1px solid ${P.fileteSuave}`,
                        }}
                      />
                      <div style={{ marginTop: 3, fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em' }}>
                        {muestra.nombre.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 12,
                    fontStyle: 'italic',
                    opacity: 0.75,
                    lineHeight: 1.5,
                    textAlign: 'center',
                  }}
                >
                  {dressCode.detail ?? ''}
                </div>
              </div>
            </Reveal>
          )}

          {schedule === undefined ? null : (
            <Reveal>
              <div
                style={{
                  marginTop: 40,
                  padding: '28px 0',
                  borderTop: `1.5px solid ${P.oro}`,
                  borderBottom: `1.5px solid ${P.oro}`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', textAlign: 'center', color: P.oro }}>
                  · {themes.countdownPrefix.toUpperCase()} ·
                </div>
                <Countdown
                  labels={{
                    days: themes.countdownDays,
                    hours: themes.countdownHoursLong,
                    mins: themes.countdownMins,
                    secs: themes.countdownSecs,
                  }}
                  labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.35em', opacity: 0.65, marginTop: 4 }}
                  rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 14 }}
                  targetISO={schedule.startsAt}
                  valueStyle={{ fontFamily: DISPLAY, fontSize: 52, fontWeight: 200, lineHeight: 1 }}
                />
              </div>
            </Reveal>
          )}

          {map === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 36 }}>
                <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 36, fontWeight: 200, marginTop: 8 }}>
                  {map.label ?? ''}
                </div>
                {lugar?.text === undefined ? null : (
                  <div style={{ fontSize: 13, marginTop: 6, opacity: 0.75 }}>{lugar.text}</div>
                )}
                {reception?.address === undefined ? null : (
                  <div style={{ fontSize: 12, marginTop: 10, fontFamily: MONO, letterSpacing: '0.2em' }}>
                    {reception.address}
                  </div>
                )}
                <div style={{ marginTop: 14 }}>
                  <MapPreview
                    accent={P.oro}
                    border={P.filete}
                    coords={map.coords ?? ''}
                    coordsColor={P.oro}
                    label={map.label ?? ''}
                    pinDot={P.papel}
                    pinRing={P.fondo}
                  />
                </div>
              </div>
            </Reveal>
          )}

          {soloAdultos === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 60, marginBottom: 20, textAlign: 'center' }}>
                <Image
                  alt=""
                  height={160}
                  src={themeAsset('boda-ed', 'taco-gato-sf.avif')}
                  style={{ width: 160, height: 'auto', display: 'block', margin: '0 auto' }}
                  width={160}
                />
                <div style={{ maxWidth: '78%', margin: '26px auto 0' }}>
                  {soloAdultos.text === undefined ? null : (
                    <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, lineHeight: 1.6 }}>
                      {soloAdultos.text}
                    </div>
                  )}
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.oro, marginTop: 16 }}>
                    {soloAdultos.title}
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          {/* La mesa de regalos: el dibujo y el rótulo son del diseño; la lista, nuestra. */}
          <Reveal>
            <div style={{ marginTop: 60, marginBottom: 20, textAlign: 'center' }}>
              <Image
                alt=""
                height={160}
                src={themeAsset('boda-ed', 'regalo-sf.avif')}
                style={{
                  width: 160,
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                  filter: 'brightness(1.15) saturate(1.15)',
                }}
                width={160}
              />
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro, marginTop: 32 }}>{themes.gifts}</div>
              <div style={{ marginTop: 18, textAlign: 'left' }}>
                {slots.registry}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div style={{ marginTop: 40 }}>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 30,
                  fontWeight: 200,
                  lineHeight: 1,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                {dictionary.title}
                <span style={{ fontStyle: 'italic' }}>.</span>
              </div>
              <div style={{ marginTop: 18 }}>
                {slots.rsvp}
              </div>
            </div>
          </Reveal>

          {fotos === undefined ? null : (
            <Reveal>
              <div
                style={{
                  marginTop: 50,
                  padding: '32px 24px',
                  borderTop: `1.5px solid ${P.oro}`,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <Image
                  alt=""
                  height={150}
                  src={themeAsset('boda-ed', 'camara-dorada-sf.avif')}
                  style={{
                    width: 150,
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                    filter: 'brightness(1.5) saturate(1.3) drop-shadow(0 1px 3px rgba(0,0,0,.5))',
                  }}
                  width={150}
                />
                <div
                  style={{
                    fontFamily: CALIGRAFIA,
                    fontSize: 34,
                    color: P.oroClaro,
                    marginTop: 20,
                    textShadow: '0 1px 4px rgba(0,0,0,.4)',
                  }}
                >
                  {fotos.title}
                </div>
                {fotos.text === undefined ? null : (
                  <div
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 15,
                      lineHeight: 1.7,
                      maxWidth: '72%',
                      margin: '18px auto 0',
                      color: P.papelClaro,
                    }}
                  >
                    {fotos.text}
                  </div>
                )}
                {/* El botón que la maqueta dibuja y que no llevaba a ninguna parte: ahora
                    abre la pantalla donde el invitado deja sus fotografías. */}
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
            <div
              style={{
                marginTop: 50,
                padding: '64px 24px',
                borderTop: `2px solid ${P.oro}`,
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div
                aria-hidden
                style={{ position: 'absolute', inset: '-6px 0', background: P.fondo, opacity: 0.75, zIndex: 0 }}
              />
              <div
                style={{
                  position: 'relative',
                  fontFamily: DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 28,
                  fontWeight: 200,
                  color: P.papel,
                }}
              >
                {closing?.text ?? ''}
              </div>
              <div
                style={{
                  position: 'relative',
                  marginTop: 20,
                  fontFamily: MONO,
                  fontSize: 15,
                  letterSpacing: '0.35em',
                  color: P.oroClaro,
                  fontWeight: 700,
                }}
              >
                {closing?.signature ?? ''}
              </div>
            </div>
          </Reveal>
        </div>
      </ThemeColumn>
    </article>
  )
}
