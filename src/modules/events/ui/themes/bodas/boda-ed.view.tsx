import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { CapaFija } from '../kit/CapaFija'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { CuentaConAros } from './CuentaConAros'
import { ItinerarioOndulado } from './ItinerarioOndulado'
import { OvalFrameCover } from './OvalFrameCover'
import { CARTA_DE_COLOR, PALETA as P } from './boda-ed.palette'

const MONO = 'var(--font-jetbrains-mono)'
const DISPLAY = 'var(--font-spectral)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/**
 * «Editorial» — María & Alex, de `wedding-variants-4.jsx` (maqueta V3).
 *
 * Verde botánico con oro: la fotografía de hojas fija detrás de todo, hojas doradas cayendo,
 * la mancheta de revista, el retrato enmarcado, la cuenta atrás con aros bajo el reloj, la
 * cita con capitular, las dos tarjetas apiladas con su arte «botánica», el itinerario como
 * un camino punteado que serpentea, el muestrario de la vestimenta y las piezas doradas de
 * cada bloque.
 *
 * El fondo y las hojas van en `CapaFija` (sticky), no `fixed`: dentro del marco del teléfono
 * un `fixed` se iba con el desplazamiento y el cuerpo se quedaba sin fondo.
 */

/** Las hojas doradas que caen, con los números de la maqueta. */
const HOJAS = Array.from({ length: 16 }, (_, i) => ({
  izquierda: (i * 6.4) % 100,
  tamano: 10 + (i % 5) * 3,
  duracion: 8 + (i % 7) * 2,
  retraso: -(i * 0.9),
}))

/** «Itinerario», «Confirma tu asistencia»: en minúsculas salvo la primera, como la maqueta. */
const enOracion = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()

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
  const regalos = notes?.[2]
  const fotos = notes?.[3]
  // La última línea del titular va en oro, como en la maqueta.
  const lineasTitular = titular.split('\n')

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
    { lugar: ceremony, icono: 'iglesia-botanica-sf.avif' as const },
    { lugar: reception, icono: 'copas-botanica-sf.avif' as const },
  ].filter((tarjeta) => tarjeta.lugar !== undefined)

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.fondo, acento: P.oro, acentoHondo: P.oroPalido, display: DISPLAY, tinta: P.papel }))

  return (
    <article style={{ ...RANURAS, position: 'relative', color: P.papel, fontFamily: DISPLAY, minHeight: 'var(--alto, 100dvh)', overflowX: 'clip' }}>
      <OvalFrameCover
        accent={P.oro}
        bg={P.fondo}
        bgAsset={themeAsset('boda-ed', 'fondo-verde.avif')}
        eyebrow={hero?.eyebrow ?? ''}
        hint={themes.coverEnterShared}
        initials={iniciales}
        names={`${hero?.nameA ?? ''} ${hero?.nameB ?? ''}`.trim()}
        openLabel={themes.coverAria}
        ringsAsset={themeAsset('boda-ed', 'aros-sf.avif')}
        textColor={P.papel}
      />

      {/* La fotografía de hojas, quieta y detrás de todo, con su velo verde. */}
      <CapaFija zIndex={-1}>
        <Image
          alt=""
          fill
          sizes="480px"
          src={themeAsset('boda-ed', 'fondo-verde-hojas.avif')}
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: P.veloHoja }} />
      </CapaFija>

      {/* Las hojas doradas que caen por encima. */}
      <CapaFija zIndex={5}>
        {HOJAS.map((hoja) => (
          <span
            className="theme-quieto-si-reduce"
            key={hoja.izquierda}
            style={{
              position: 'absolute',
              top: '-6%',
              left: `${hoja.izquierda}%`,
              width: hoja.tamano,
              height: hoja.tamano,
              opacity: 0.35,
              animation: `theme-petalFall ${hoja.duracion}s linear ${hoja.retraso}s infinite`,
            }}
          >
            <svg height="100%" viewBox="0 0 24 24" width="100%">
              <path d="M12 2 C20 8 20 18 12 22 C4 18 4 8 12 2 Z" fill="rgba(197,150,58,0.55)" />
              <line stroke="rgba(197,150,58,0.4)" strokeWidth="0.8" x1="12" x2="12" y1="4" y2="20" />
            </svg>
          </span>
        ))}
      </CapaFija>

      <ThemeColumn>
        {/* La mancheta. */}
        <div style={{ padding: '22px 24px', borderBottom: `1.5px solid ${P.oro}`, position: 'relative' }}>
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
          {/* La cuenta atrás: el reloj botánico y cuatro aros que se llenan. */}
          {schedule === undefined ? null : (
            <Reveal>
              <div style={{ padding: '28px 0', borderTop: `1.5px solid ${P.oro}`, borderBottom: `1.5px solid ${P.oro}`, textAlign: 'center' }}>
                <Image
                  alt=""
                  height={130}
                  src={themeAsset('boda-ed', 'reloj-botanica-sf.avif')}
                  style={{ width: 130, height: 'auto', display: 'block', margin: '0 auto 22px' }}
                  width={130}
                />
                <CuentaConAros
                  aro={P.aro}
                  aroFondo={P.aroFondo}
                  cifra={P.blanco}
                  labels={{
                    days: themes.countdownDays,
                    hours: themes.countdownHoursLong,
                    mins: themes.countdownMins,
                    secs: themes.countdownSecs,
                  }}
                  mono={MONO}
                  rotulo={P.papel}
                  rotuloEstilo={{ size: 9, tracking: '0.35em', opacidad: 0.65 }}
                  serif={DISPLAY}
                  targetISO={schedule.startsAt}
                />
              </div>
            </Reveal>
          )}

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
                  padding: '24px 24px 0',
                }}
              >
                {lineasTitular.map((linea, i) => (
                  <span key={`${i}-${linea}`} style={{ display: 'block', color: i === lineasTitular.length - 1 && i > 0 ? P.oro : undefined }}>
                    {linea}
                  </span>
                ))}
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
                      {grupo.nombres.map((nombre, i) => (
                        <div key={nombre} style={{ fontFamily: DISPLAY, fontSize: 16, marginTop: i === 0 ? 10 : 0, lineHeight: 1.6 }}>
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
                  {anfitrionesBoda(hosts).padrinos.map((nombre, i) => (
                    <div key={nombre} style={{ fontFamily: DISPLAY, fontSize: 16, marginTop: i === 0 ? 10 : 0, lineHeight: 1.6 }}>
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
            <div style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {tarjetas.map((tarjeta) => (
                <div
                  key={tarjeta.icono}
                  style={{
                    background: P.velo,
                    border: `1.5px solid ${P.oro}`,
                    borderRadius: 16,
                    padding: '28px 8px 22px',
                    textAlign: 'center',
                    display: 'grid',
                    gridTemplateRows: 'auto 20px auto 10px auto auto 1fr auto',
                    justifyItems: 'center',
                    rowGap: 6,
                  }}
                >
                  <Image
                    alt=""
                    height={120}
                    src={themeAsset('boda-ed', tarjeta.icono)}
                    style={{ width: '39%', height: 'auto', objectFit: 'contain' }}
                    width={120}
                  />
                  <div />
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro, whiteSpace: 'nowrap' }}>{tarjeta.lugar?.label ?? ''}</div>
                  <div />
                  <div style={{ fontFamily: DISPLAY, fontSize: 30, color: P.papel }}>{tarjeta.lugar?.time ?? ''}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.15em', color: P.papel, opacity: 0.85, whiteSpace: 'nowrap' }}>
                    {(tarjeta.lugar?.place ?? '').toUpperCase()}
                  </div>
                  <div />
                  {llegarA(tarjeta.lugar) === null ? (
                    <div />
                  ) : (
                    <a
                      href={llegarA(tarjeta.lugar) ?? ''}
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
                        whiteSpace: 'nowrap',
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
            <Reveal>
              <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 200, lineHeight: 1, marginTop: 8, textAlign: 'center' }}>
                {enOracion(themes.itinerary)}
                <span style={{ fontStyle: 'italic' }}>.</span>
              </div>
            </Reveal>
            <Reveal>
              <ItinerarioOndulado filas={itinerary} hora={P.hueso} mono={MONO} oro={P.camino} rotulo={P.papelClaro} serif={DISPLAY} />
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
                  <ConCursivaFinal texto={dressCode.title ?? ''} />
                </div>

                <Image
                  alt=""
                  height={320}
                  src={themeAsset('boda-ed', 'codigo-botanica-sf.avif')}
                  style={{ width: '90%', height: 'auto', display: 'block', margin: '26px auto' }}
                  width={320}
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
                <PaletaDeColores borde="currentColor" colores={dressCode.colors} />
              </div>
            </Reveal>
          )}

          {soloAdultos === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 60, marginBottom: 20, padding: '0 10px' }}>
                <div style={{ background: P.velo, border: `1.5px solid ${P.oro}`, borderRadius: 16, padding: '30px 20px', textAlign: 'center' }}>
                  <Image
                    alt=""
                    height={190}
                    src={themeAsset('boda-ed', 'taco-corbata-botanica-sf.avif')}
                    style={{ width: 190, height: 'auto', display: 'block', margin: '0 auto' }}
                    width={190}
                  />
                  <div style={{ maxWidth: '88%', margin: '16px auto 0' }}>
                    {soloAdultos.text === undefined ? null : (
                      <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, lineHeight: 1.6, color: P.papel }}>
                        {soloAdultos.text}
                      </div>
                    )}
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.oro, marginTop: 14 }}>
                      {soloAdultos.title}
                    </div>
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
                height={220}
                src={themeAsset('boda-ed', 'regalo-botanica-sf.avif')}
                style={{ width: 220, height: 'auto', display: 'block', margin: '0 auto' }}
                width={220}
              />
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.oro, marginTop: 32 }}>{regalos?.title ?? themes.gifts}</div>
              {regalos?.text === undefined ? null : (
                <div style={{ fontFamily: DISPLAY, fontSize: 15, lineHeight: 1.7, maxWidth: '72%', margin: '18px auto 0' }}>{regalos.text}</div>
              )}
              <div style={{ marginTop: 22 }}>{slots.registry}</div>
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
                <ConCursivaFinal texto={enOracion(dictionary.title)} />
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
                  height={220}
                  src={themeAsset('boda-ed', 'camara-botanica-sf.avif')}
                  style={{ width: 220, height: 'auto', display: 'block', margin: '0 auto' }}
                  width={220}
                />
                <div
                  style={{
                    fontFamily: CALIGRAFIA,
                    fontSize: 34,
                    color: P.oroClaro,
                    marginTop: 20,
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
