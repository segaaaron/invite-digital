import Image from '@/shared/design/ui/ImagenQueAparece'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import { MarcoQr } from '../kit/MarcoQr'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { WeddingMagicBg } from '../kit/backgrounds/WeddingMagicBg'
import { BotanicaCover } from './BotanicaCover'
import { BotanicalTimeline } from '../kit/flora/BotanicalTimeline'
import { FallingPetals } from '../kit/flora/FallingPetals'
import { FloralCorner, FloralDivider, FloralSpray } from '../kit/flora/FloralArt'
import { TIMELINE_ICONS } from '../kit/flora/TimelineIcons'
import { CARTA_DE_COLOR, PALETA as P } from './boda-bot.palette'

/** Las tres del collage, en el orden en que las pone la maqueta. */
const COLLAGE = ['boda-03-anillos.avif', 'boda-02-arreglo.avif', 'boda-04-pastel.avif'] as const

const SERIF = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'

export function BodaBotView({ content, event, dictionary, themes, slots, guestInfo, audioSrc, respondida = false }: ThemeProps) {
  const ROTULOS = themes.designs['boda-bot']
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, music, dressCode, gallery, notes, closing } =
    content
  // La fecha límite, en el idioma del evento: la maqueta la pinta bajo el rótulo.
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

  // La cita del diseño son tres piezas: la frase, los años y la historia. Es un solo bloque
  // porque en la maqueta es un solo texto, y partirlo en tres campos sería inventar una
  // estructura que el diseño no tiene.
  const [frase = '', anos = '', ...parrafos] = (quote?.text ?? '').split('\n\n')
  const historia = parrafos.join('\n\n')

  // Los tres textos que el diseño lleva escritos, en el orden en que los pinta.
  const invitacion = notes?.[0]
  const soloAdultos = notes?.[1]
  const fotos = notes?.[2]

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const diaSemana = cuando === null ? '' : cuando.toLocaleDateString(etiquetaLocal, { weekday: 'long' })
  const mes = cuando === null ? '' : cuando.toLocaleDateString(etiquetaLocal, { month: 'long' })

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.papel, acento: P.salvia, display: SERIF, tinta: P.tinta }))

  return (
    <article style={{ ...RANURAS, position: 'relative', background: P.papel, color: P.tinta, fontFamily: SERIF, minHeight: 'var(--alto, 100dvh)', overflowX: 'clip' }}>
      {/* Su portada es la de la maqueta: el sobre lacrado sobre las rosas, con los nombres
          de la pareja escritos encima. Antes salía el sobre **dibujado** del kit. */}
      <BotanicaCover
        bgAsset={themeAsset('boda-bot', 'portada-rosas.avif')}
        bg={P.papel}
        hint={themes.coverHint}
        line1={themes.coverBigDay}
        line2={themes.coverWeMarry}
        names={[hero?.nameA, hero?.nameB].filter((nombre) => nombre !== undefined && nombre !== '').join(' &\n')}
        openLabel={themes.coverAria}
        textColor={P.salvia}
      />

      <WeddingMagicBg
        glowColors={[P.oliva, P.arena, P.papel]}
        intensity={0.55}
        palette={[P.papel, P.menta, P.lino, P.hoja, P.papel]}
        petalColors={[P.arena, P.oliva, P.durazno]}
        petalEdges={[P.salvia, P.tinta]}
        petals={20}
      />

      {/* Las acuarelas de fondo, muy tenues y desbordando por los lados. */}
      <div aria-hidden style={{ position: 'absolute', top: 620, left: -90, opacity: 0.22, zIndex: 0 }}>
        <FloralSpray rotate={-12} sway={false} tone="white" width={300} />
      </div>
      <div aria-hidden style={{ position: 'absolute', top: 1180, right: -110, opacity: 0.2, zIndex: 0 }}>
        <FloralSpray flipX rotate={14} sway={false} tone="white" width={320} />
      </div>

      {/* La portada va **dentro de la columna**, como todo lo demás. Suelta, en un
          portátil se estira a lo ancho de la pantalla: la fotografía es `object-fit:
          cover`, así que a 1900×540 lo que se ve de la pareja es el cielo que tenían
          detrás, y la invitación se abre en un campo vacío con los nombres flotando. El
          fondo ambiente sí ocupa la ventana entera; el contenido, nunca. */}
      <ThemeColumn>
        {/* La portada: fotografía a sangre con los nombres encima. */}
        <div style={{ position: 'relative', height: 540 }}>
        <PhotoSlot
          bg="transparent"
          border="none"
          color="rgba(42,42,38,0.45)"
          height="100%"
          label={retrato?.label ?? themes.portraitPlaceholder}
          objectPosition="center top"
          radius={0}
          src={
            retrato?.imageId === undefined ? themeAsset('boda-bot', 'wedding-couple.avif') : `/media/${retrato.imageId}`
          }
          width="100%"
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, transparent 50%, rgba(250,250,246,0.65) 80%, ${P.papel} 100%)`,
          }}
        />
        {/* El velo oscuro sobre el que caen los nombres. Sin él, un retrato claro se come
            la caligrafía color crema, y con la fotografía de una boda de verdad ese riesgo
            es la norma, no la excepción. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '34%',
            height: '44%',
            background:
              'linear-gradient(180deg, transparent 0%, rgba(20,18,14,0.62) 30%, rgba(20,18,14,0.62) 78%, transparent 100%)',
          }}
        />

        <FallingPetals count={6} palette={[P.arena, P.oliva, P.durazno]} seed={5} />

        <div aria-hidden style={{ position: 'absolute', bottom: -34, left: -46, zIndex: 3 }}>
          <FloralCorner flipY side="left" tone="white" width={260} />
        </div>
        <div aria-hidden style={{ position: 'absolute', bottom: -34, right: -46, zIndex: 3 }}>
          <FloralCorner flipY side="right" tone="white" width={260} />
        </div>

        {/* El antetítulo va **arriba del todo**, sobre la fotografía y no bajo los nombres:
            es lo primero que se lee al abrir. */}
        <div
          style={{
            position: 'absolute',
            top: 34,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 15,
            letterSpacing: '0.5em',
            fontWeight: 500,
            color: P.crema,
            textShadow: '0 1px 10px rgba(20,18,14,0.55)',
          }}
        >
          {hero?.eyebrow ?? themes.saveTheDate}
        </div>

        {/* Los nombres caen sobre el velo, en crema: es lo que los sostiene sobre una
            fotografía cualquiera, clara u oscura. */}
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: 0,
            right: 0,
            textAlign: 'center',
            textShadow: '0 2px 14px rgba(20,18,14,0.5)',
          }}
        >
          <h1 style={{ fontFamily: CALIGRAFIA, fontSize: 64, lineHeight: 1, color: P.crema, fontWeight: 400, margin: 0 }}>
            {hero?.nameA ?? ''}
          </h1>
          {hero?.nameB === undefined ? null : (
            <>
              <div aria-hidden style={{ fontFamily: CALIGRAFIA, fontSize: 32, color: P.crema, margin: '-4px 0' }}>
                &amp;
              </div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 64, lineHeight: 1, color: P.crema, fontWeight: 400 }}>
                {hero.nameB}
              </div>
            </>
          )}
          </div>
        </div>
      </ThemeColumn>

      <ThemeColumn style={{ padding: '0 30px 60px' }}>
        {cuando === null ? null : (
          <Reveal>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <div style={{ fontSize: 13, letterSpacing: '0.5em', fontWeight: 500, textTransform: 'uppercase' }}>
                {diaSemana}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 12 }}>
                <div aria-hidden style={{ flex: 1, height: 1, background: P.salvia, opacity: 0.6 }} />
                <div style={{ fontSize: 12, letterSpacing: '0.4em', fontWeight: 500, textTransform: 'uppercase' }}>{mes}</div>
                <div aria-hidden style={{ flex: 1, height: 1, background: P.salvia, opacity: 0.6 }} />
              </div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 90, lineHeight: 1, color: P.salvia, marginTop: 14 }}>
                {cuando.getDate()}
              </div>
              <div style={{ fontSize: 12, letterSpacing: '0.4em', fontWeight: 500, marginTop: 6 }}>
                {cuando.getFullYear()}
              </div>
            </div>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: '22px 0', borderTop: `1px solid ${P.filete}`, borderBottom: `1px solid ${P.filete}` }}>
              <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.4em', color: P.salvia, marginBottom: 14 }}>
                · {themes.countdownPrefix.toUpperCase()} ·
              </div>
              <Countdown
                labels={{
                  days: themes.countdownDays,
                  // Este diseño no abrevia: «HORAS», como en la invitación de referencia.
                  hours: themes.countdownHoursLong,
                  mins: themes.countdownMins,
                  secs: themes.countdownSecs,
                }}
                labelStyle={{ fontSize: 10, letterSpacing: '0.4em', marginTop: 6, opacity: 0.6, fontWeight: 500 }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontSize: 40, fontWeight: 300, color: P.tinta, lineHeight: 1 }}
              />
            </div>
          </Reveal>
        )}

        {quote === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 34, marginBottom: 6 }}>
              <FloralDivider line={P.fileteSuave} tone="white" width={150} />
            </div>
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 26, color: P.salvia, lineHeight: 1.5, margin: 0 }}>
                {frase.split('\n').map((linea) => (
                  <span key={linea} style={{ display: 'block' }}>
                    {linea}
                  </span>
                ))}
              </p>
            </div>
          </Reveal>
        )}

        {momento === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40, position: 'relative' }}>
              <PhotoSlot
                bg="rgba(90,112,92,0.05)"
                border="none"
                color="rgba(90,112,92,0.5)"
                height={340}
                label={momento.label}
                radius={4}
                src={
                  momento.imageId === undefined
                    ? themeAsset('boda-bot', 'boda-01-pareja.avif')
                    : `/media/${momento.imageId}`
                }
                width="100%"
              />
              <div aria-hidden style={{ position: 'absolute', top: -38, left: -38, zIndex: 3 }}>
                <FloralCorner side="left" tone="white" width={150} />
              </div>
              <div aria-hidden style={{ position: 'absolute', bottom: -38, right: -38, zIndex: 3 }}>
                <FloralCorner flipY side="right" tone="white" width={150} />
              </div>
            </div>
          </Reveal>
        )}

        {historia === '' ? null : (
          <Reveal>
            <div style={{ marginTop: 44, textAlign: 'center' }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 40, color: P.salvia, lineHeight: 1 }}>
                {themes.ourStory.toLowerCase()}
              </div>
              {anos === '' ? null : (
                <div style={{ fontSize: 11, letterSpacing: '0.4em', marginTop: 6, opacity: 0.6, fontWeight: 500 }}>
                  {anos}
                </div>
              )}
              <p
                style={{
                  fontSize: 15,
                  fontStyle: 'italic',
                  lineHeight: 1.7,
                  marginTop: 18,
                  color: P.tinta,
                  opacity: 0.85,
                }}
              >
                {historia}
              </p>
            </div>
          </Reveal>
        )}

        {trio.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {trio.map((foto, indice) => (
                <PhotoSlot
                  bg="rgba(90,112,92,0.05)"
                  border="none"
                  color="rgba(90,112,92,0.5)"
                  height={120}
                  key={foto.label}
                  label={foto.label}
                  radius={4}
                  // Sin fotografía propia se ve la del diseño, no una casilla vacía: la
                  // maqueta enseña las tres desde el primer día, y un collage de tres huecos
                  // grises es lo que hace que un modelo parezca sin terminar.
                  src={foto.imageId === undefined ? themeAsset('boda-bot', COLLAGE[indice] ?? COLLAGE[0]) : `/media/${foto.imageId}`}
                />
              ))}
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 48, textAlign: 'center' }}>
            {invitacion?.text === undefined ? null : (
              <p style={{ fontSize: 15, lineHeight: 1.8, margin: '0 auto', maxWidth: '78%' }}>{invitacion.text}</p>
            )}
            {guestInfo === undefined ? (
              <div style={{ marginTop: 18 }}>{slots.guest}</div>
            ) : (
              <>
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 44, color: P.salvia, marginTop: 22 }}>
                  {guestInfo.label}
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', marginTop: 12, fontWeight: 500 }}>
                  {themes.reservedForYou}
                </div>
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 52, color: P.tinta, marginTop: 8, lineHeight: 1 }}>
                  {guestInfo.seats}
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', marginTop: 6, fontWeight: 500 }}>
                  {themes.passes}
                </div>
              </>
            )}
          </div>
        </Reveal>

        {hosts === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 44, textAlign: 'center' }}>
              {hosts.label === undefined ? null : (
                <p style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.salvia, margin: 0 }}>{hosts.label}</p>
              )}
              {/* Tres parejas y tres rótulos, en el orden del diseño: los nombres van en una
                  papeles (`roles`); lo guardado antes, por posición. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 26 }}>
                {[
                  { rotulo: themes.brideParents, nombres: anfitrionesBoda(hosts).novia },
                  { rotulo: themes.groomParents, nombres: anfitrionesBoda(hosts).novio },
                ].map((grupo) =>
                  grupo.nombres.length === 0 ? null : (
                    <div key={grupo.rotulo}>
                      <div style={{ fontSize: 10, letterSpacing: '0.3em', color: P.salvia, fontWeight: 500 }}>
                        {grupo.rotulo}
                      </div>
                      {grupo.nombres.map((nombre) => (
                        <div key={nombre} style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                          {nombre}
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
              {anfitrionesBoda(hosts).padrinos.length === 0 ? null : (
                <div style={{ marginTop: 26 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.3em', color: P.salvia, fontWeight: 500 }}>
                    {themes.godparents}
                  </div>
                  {anfitrionesBoda(hosts).padrinos.map((nombre) => (
                    <div key={nombre} style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                      {nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* Las dos tarjetas con su icono y su enlace al mapa. */}
        {ceremony === undefined && reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40, display: 'flex', gap: 14, justifyContent: 'center' }}>
              {[
                { lugar: ceremony, Icono: TIMELINE_ICONS.church },
                { lugar: reception, Icono: TIMELINE_ICONS.flutes },
              ]
                .filter((tarjeta) => tarjeta.lugar !== undefined)
                .map((tarjeta, indice) => (
                  <div
                    key={indice}
                    style={{
                      flex: 1,
                      // Sin esto, un rótulo largo empuja la tarjeta fuera de la columna: el
                      // ancho mínimo de una caja flexible es el de su contenido.
                      minWidth: 0,
                      border: `1px solid ${P.fileteSuave}`,
                      borderRadius: 14,
                      padding: '24px 10px 20px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                      background: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <tarjeta.Icono color={P.salvia} size={34} />
                    <div style={{ fontFamily: CALIGRAFIA, fontSize: 21, color: P.salvia, lineHeight: 1.15 }}>
                      {tarjeta.lugar?.label ?? ''}
                    </div>
                    <div style={{ fontSize: 26 }}>{tarjeta.lugar?.time ?? ''}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', opacity: 0.75 }}>
                      {(tarjeta.lugar?.place ?? '').toUpperCase()}
                    </div>
                    {map?.href === undefined ? null : (
                      <a
                        href={map.href}
                        rel="noopener noreferrer"
                        style={{
                          marginTop: 4,
                          border: `1px solid ${P.salvia}`,
                          borderRadius: 20,
                          padding: '9px 14px',
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          color: P.salvia,
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
          <>
            <Reveal>
              <div style={{ marginTop: 50, textAlign: 'center' }}>
                <div style={{ fontSize: 14, letterSpacing: '0.5em', fontWeight: 600, marginBottom: 20 }}>
                  {themes.itinerary}
                </div>
              </div>
            </Reveal>
            <BotanicalTimeline accent={P.tinta} discBg={P.papel} items={itinerary} />
          </>
        )}

        {/* El florero de mármol que la maqueta pone entre el itinerario y el lugar. */}
        <Reveal>
          <div aria-hidden style={{ marginTop: 40, position: 'relative' }}>
            <Image
              alt=""
              height={858}
              src={themeAsset('boda-bot', 'marmol-flores-optimized.avif')}
              style={{ width: '100%', height: 260, objectFit: 'contain', display: 'block' }}
              width={700}
            />
          </div>
        </Reveal>

        {ceremony === undefined && reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 22, padding: 28, border: `1px solid ${P.fileteSuave}`, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: -16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '0 14px',
                  background: P.papel,
                  fontSize: 11,
                  letterSpacing: '0.4em',
                  color: P.salvia,
                }}
              >
                · {themes.venue} ·
              </div>
              {[ceremony, reception].map((lugar, indice) =>
                lugar === undefined ? null : (
                  <div key={indice}>
                    {indice === 1 && ceremony !== undefined ? (
                      <div aria-hidden style={{ width: 40, height: 1, background: P.salvia, margin: '18px auto', opacity: 0.5 }} />
                    ) : null}
                    <div style={{ textAlign: 'center' }}>
                      {/* En el bloque del lugar manda el rótulo del diccionario —CEREMONIA,
                          RECEPCIÓN—; el nombre largo del acto va en su tarjeta, arriba. */}
                      <div style={{ fontSize: 11, letterSpacing: '0.35em', color: P.salvia, fontWeight: 500 }}>
                        {indice === 0 ? themes.ceremony : themes.reception}
                      </div>
                      <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, marginTop: 4 }}>{lugar.place ?? ''}</div>
                      <div style={{ fontSize: 12, marginTop: 4, opacity: 0.65 }}>{lugar.address ?? ''}</div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Reveal>
        )}

        {map === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <MapPreview
                accent={P.salvia}
                border="rgba(90,112,92,0.3)"
                coords={map.coords ?? ''}
                directionsLabel={themes.viewLocation}
                href={map.href}
                respaldo={[reception?.place, reception?.address].filter(Boolean).join(', ')}
                label={map.label ?? ''}
                pinDot={P.papel}
              />
            </div>
          </Reveal>
        )}

        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.4em', fontWeight: 500, color: P.salvia }}>
                {dressCode.note ?? themes.dressCode}
              </div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 44, marginTop: 8, color: P.tinta }}>
                {dressCode.title ?? ''}
              </div>
              {/* El dibujo de la maqueta, no uno redibujado: es su fichero, teñido con el
                  verde del diseño por máscara —el original viene en oro—. */}
              <div
                aria-hidden
                style={{
                  marginTop: 20,
                  height: 96,
                  background: P.salvia,
                  maskImage: `url("${themeAsset('boda-bot', 'trajes-dorados-sf.avif')}")`,
                  maskSize: 'contain',
                  maskPosition: 'center',
                  maskRepeat: 'no-repeat',
                }}
              />

              <div style={{ fontSize: 13, marginTop: 16, fontStyle: 'italic', opacity: 0.7 }}>{dressCode.detail ?? ''}</div>
              <PaletaDeColores etiqueta={themes.suggestedColors} borde="currentColor" colores={dressCode.colors} />

              <div aria-hidden style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
                {CARTA_DE_COLOR.map((color) => (
                  <div
                    key={color}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: color,
                      border: '1px solid rgba(42,42,38,0.2)',
                    }}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {soloAdultos === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 34,
                padding: '30px 24px',
                border: `1px solid ${P.fileteSuave}`,
                borderRadius: 14,
                textAlign: 'center',
                background: 'rgba(255,255,255,0.35)',
              }}
            >
              {/* El dibujo de la maqueta, teñido con el verde del diseño. */}
              <div
                aria-hidden
                style={{
                  height: 78,
                  background: P.salvia,
                  maskImage: `url("${themeAsset('boda-bot', 'taco-gato-sf.avif')}")`,
                  maskSize: 'contain',
                  maskPosition: 'center',
                  maskRepeat: 'no-repeat',
                }}
              />
              {soloAdultos.text === undefined ? null : (
                <p style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.7, marginTop: 20, opacity: 0.85 }}>
                  {soloAdultos.text}
                </p>
              )}
              <div style={{ fontSize: 10, letterSpacing: '0.3em', color: P.salvia, marginTop: 16, fontWeight: 500 }}>
                {soloAdultos.title}
              </div>
            </div>
          </Reveal>
        )}

        {/* En una invitación de verdad (`slots.regalos`) la tarjeta solo sale si hay algo que ofrecer,
            y el código es el QR del banco del cliente o ninguno: el de adorno invitaría a pagar a la nada. */}
        {slots.regalos !== undefined && !slots.regalos.sobres && slots.regalos.qr === null && slots.regalos.resto === null ? null : (
        <Reveal>
          <div style={{ marginTop: 40, padding: 22, background: 'rgba(90,112,92,0.04)', border: `1px solid ${P.fileteSuave}` }}>
            {/* Texto a la izquierda y el código a la derecha, como en la maqueta: el titular
                en caligrafía y la línea pequeña debajo, no un solo párrafo. */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.35em', fontWeight: 500, color: P.salvia }}>{themes.gifts}</div>
                <div style={{ marginTop: 10, fontFamily: CALIGRAFIA, fontSize: 24, color: P.tinta }}>
                  {ROTULOS.giftsTitle}
                </div>
                <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, opacity: 0.75 }}>{ROTULOS.giftsNote}</p>
              </div>
              {slots.regalos === undefined ? <MarcoQr bg={P.papel} fg={P.tinta} size={88} /> : null}
            </div>
            {/* El bloque completo: sobres, y la transferencia con su QR dentro. */}
            <div style={{ marginTop: 12 }}>{slots.registry}</div>
          </div>
        </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MusicPlayer
                accent={P.salvia}
                artist={music.artist ?? ''}
                audioSrc={audioSrc ?? (music.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)}
                eyebrow={themes.songOfTheNight}
                playIconColor={P.papel}
                textColor={P.tinta}
                track={music.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 40 }}>
            {/* Dos piezas, como la maqueta: el rótulo en versalitas y el plazo en
                caligrafía debajo. */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.4em',
                  fontWeight: 500,
                  color: P.salvia,
                  textTransform: 'uppercase',
                }}
              >
                {dictionary.title}
              </div>
              {plazo === null ? null : (
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 26, marginTop: 4, color: P.tinta }}>{plazo}</div>
              )}
            </div>
            {slots.rsvp}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 36 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.salvia }}>{ROTULOS.guestbook}</div>
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        {fotos === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 36,
                padding: '30px 24px',
                border: `1px solid ${P.fileteSuave}`,
                borderRadius: 14,
                textAlign: 'center',
                background: 'rgba(255,255,255,0.35)',
              }}
            >
              <div aria-hidden style={{ display: 'flex', justifyContent: 'center' }}>
                <TIMELINE_ICONS.camera color={P.salvia} size={46} />
              </div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.salvia, marginTop: 14 }}>{fotos.title}</div>
              {fotos.text === undefined ? null : (
                <p style={{ fontSize: 14, lineHeight: 1.7, marginTop: 12, opacity: 0.85 }}>{fotos.text}</p>
              )}
              {/* El botón que la maqueta dibuja y que no llevaba a ninguna parte. */}
              <div style={{ marginTop: 20 }}>{slots.photos}</div>
            </div>
          </Reveal>
        )}

        <div style={{ marginTop: 32 }}>{slots.pass}</div>

        {closing === undefined ? null : (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.salvia }}>{closing.text ?? ''}</div>
            {closing.signature === undefined ? null : (
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 36, color: P.tinta, marginTop: 4 }}>{closing.signature}</div>
            )}
          </div>
        )}

        <div aria-hidden style={{ position: 'relative', marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <FloralSpray tone="white" width={280} />
        </div>
      </ThemeColumn>
    </article>
  )
}
