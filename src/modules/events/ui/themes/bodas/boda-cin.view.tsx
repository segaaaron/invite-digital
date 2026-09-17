import type { ThemeProps } from '../contract'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { WeddingMagicBg } from '../kit/backgrounds/WeddingMagicBg'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { PALETA as P } from './boda-cin.palette'

const MONO = 'var(--font-jetbrains-mono)'
const DISPLAY = 'var(--font-italiana)'
const SERIF = 'var(--font-cormorant)'

/**
 * El grano de película, en SVG embebido.
 *
 * Va como `data:` y no como archivo porque son cien bytes de ruido fractal generado por el
 * navegador: pedirle al servidor una imagen para esto sería una petición de red por una
 * textura que no existe como fotografía.
 */
const GRANO =
  "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\"/></filter><rect width=\"100\" height=\"100\" filter=\"url(%23n)\"/></svg>')"

/**
 * «Cinemática» — el póster de cine, de `wedding-variants.jsx:756`.
 *
 * El diseño lee la boda como un estreno: bandas negras arriba y abajo, grano de película,
 * el itinerario como desglose de escenas y el RSVP dentro de una entrada. Los rótulos en
 * inglés —CAST, SCENES, WARDROBE— son **parte del diseño**, no texto de interfaz: van en el
 * contenido, que el atelier puede cambiar, y no en el diccionario.
 */
/**
 * La copia del diseño para su portada: el telón de cine no dice «abrir invitación», dice
 * «estás invitado» y «algo inolvidable». No es del diccionario porque no es una
 * traducción: es el guion de este modelo.
 */
const ROTULOS = { coverEyebrow: 'ESTÁS INVITADO', coverHeadline: 'Algo inolvidable', cover: 'NOW · SHOWING' } as const

export function BodaCinView({ content, dictionary, themes, slots, audioSrc }: ThemeProps) {
  const { hero, quote, hosts, schedule, reception, map, itinerary, music, dressCode, gallery, closing } = content
  const retrato = gallery?.[0]
  const reparto = (gallery ?? []).slice(1, 3)

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.fondo, acento: P.oro, acentoHondo: P.oroOscuro, display: DISPLAY, tinta: P.tinta }))

  return (
    <article style={{ ...RANURAS, position: 'relative', background: P.fondo, color: P.tinta, fontFamily: SERIF, minHeight: '100dvh', overflowX: 'clip' }}>
      <EnvelopeCover
        accent={P.oro}
        bg={P.fondo}
        eyebrow={ROTULOS.coverEyebrow}
        headline={ROTULOS.coverHeadline}
        hint={themes.coverHint}
        label={ROTULOS.cover}
        openLabel={themes.coverAria}
        textColor={P.tinta}
        variant="curtain"
      />

      <WeddingMagicBg
        dark
        glowColors={[P.oro, P.tinta, P.tabaco]}
        intensity={0.45}
        palette={[P.fondo, P.sepia, P.tabaco, P.sepia, P.fondo]}
        petalColors={[P.oro, P.tinta, P.claro, P.oroOscuro]}
        petalEdges={[P.oroOscuro, P.tabaco]}
        petals={24}
      />
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none', backgroundImage: GRANO }} />

      {/* La banda superior, con los datos de rodaje. Es lo que hace que se lea como cine.
          Va dentro de la columna: la ficha de rodaje es contenido, y suelta se repartía de
          un extremo a otro de la pantalla con la película en medio. */}
      <ThemeColumn>
      <div aria-hidden style={{ position: 'sticky', top: 0, height: 36, background: P.banda, zIndex: 5 }} />
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 18,
          right: 18,
          display: 'flex',
          justifyContent: 'space-between',
          zIndex: 6,
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: '0.3em',
          color: P.oro,
        }}
      >
        <span>{hero?.monogram ?? ''}</span>
        <span>35MM · 1.85:1</span>
        <span>120 MIN</span>
      </div>

      </ThemeColumn>

      {/* El cartel va **dentro de la columna**, como el resto. Suelto, en un portátil se
          estira a lo ancho de la pantalla mientras la ficha técnica de abajo se queda en
          su columna, y el diseño se parte en dos. El grano, la banda y el fondo sí ocupan
          la ventana entera: son ambiente, no contenido. */}
      <ThemeColumn>
        {/* El cartel: fotografía a sangre con el título encima. */}
        <div style={{ position: 'relative', height: 580 }}>
        <PhotoSlot
          bg={`linear-gradient(180deg, ${P.sepia} 0%, ${P.tabaco} 60%, ${P.fondo} 100%)`}
          border="none"
          color="rgba(184,148,90,0.5)"
          height="100%"
          label={retrato?.label ?? themes.photoPlaceholder}
          radius={0}
          src={retrato?.imageId === undefined ? undefined : `/media/${retrato.imageId}`}
          width="100%"
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 30%, rgba(10,8,5,0.85) 100%)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '20%',
            left: '15%',
            width: 2,
            height: '60%',
            background: 'linear-gradient(180deg, transparent, rgba(232,217,181,0.4), transparent)',
            animation: 'theme-filmBurn 8s linear infinite',
          }}
          className="theme-art"
        />

        <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', zIndex: 4 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', color: P.oro, marginBottom: 12 }}>
            {hero?.eyebrow ?? themes.saveTheDate}
          </div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontSize: 76,
              lineHeight: 0.9,
              letterSpacing: '0.04em',
              color: P.claro,
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
              margin: 0,
            }}
          >
            {hero?.nameA ?? ''}
          </h1>
          {hero?.nameB === undefined ? null : (
            <>
              <div aria-hidden style={{ fontFamily: DISPLAY, fontSize: 20, color: P.oro, margin: '8px 0', letterSpacing: '0.3em' }}>
                · &amp; ·
              </div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 76,
                  lineHeight: 0.9,
                  letterSpacing: '0.04em',
                  color: P.claro,
                  textShadow: '0 4px 24px rgba(0,0,0,0.6)',
                }}
              >
                {hero.nameB}
              </div>
            </>
          )}
          <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.oro }}>
            {hero?.serial ?? ''}
          </div>
        </div>
        </div>
      </ThemeColumn>

      <ThemeColumn style={{ padding: '30px 26px 60px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', padding: '14px 0', borderTop: `1px solid ${P.oro}`, borderBottom: `1px solid ${P.oro}` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', color: P.oro }}>
              · COMING SOON · ONLY ONCE · ONLY HERE ·
            </div>
          </div>
        </Reveal>

        {schedule === undefined ? null : (
          <>
            <Reveal>
              <div style={{ marginTop: 36, textAlign: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', color: P.oro }}>PREMIERE DATE</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 110, lineHeight: 0.9, marginTop: 14, color: P.claro, letterSpacing: '-0.01em' }}>
                  {schedule.startsAt.slice(8, 10)}.{schedule.startsAt.slice(5, 7)}
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, color: P.oro, letterSpacing: '0.5em', marginTop: 4 }}>
                  · {schedule.startsAt.slice(0, 4)} ·
                </div>
                {reception?.time === undefined ? null : (
                  <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', opacity: 0.8 }}>
                    {reception.time}
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal>
              <div style={{ marginTop: 44 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', textAlign: 'center', color: P.oro, marginBottom: 14 }}>
                  · COUNTDOWN TO PREMIERE ·
                </div>
                <Countdown
                  cellStyle={{ position: 'relative', padding: '16px 6px', border: `1px solid ${P.oro}`, textAlign: 'center' }}
                  labels={{
                    days: themes.countdownDays,
                    hours: themes.countdownHours,
                    mins: themes.countdownMins,
                    secs: themes.countdownSecs,
                  }}
                  labelStyle={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.4em', color: P.oro, marginTop: 6 }}
                  rowStyle={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}
                  targetISO={schedule.startsAt}
                  valueStyle={{ fontFamily: DISPLAY, fontSize: 42, lineHeight: 1, color: P.claro }}
                />
              </div>
            </Reveal>
          </>
        )}

        {quote === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 44, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro }}>{'// SYNOPSIS'}</div>
              <p style={{ marginTop: 16, fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.65, color: P.tinta, opacity: 0.92 }}>
                {quote.text}
              </p>
            </div>
          </Reveal>
        )}

        {reparto.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro, textAlign: 'center' }}>· CAST ·</div>
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {reparto.map((papel, indice) => (
                  <div key={papel.label} style={{ textAlign: 'center' }}>
                    <PhotoSlot
                      bg="rgba(184,148,90,0.06)"
                      border="1px solid rgba(184,148,90,0.35)"
                      color="rgba(184,148,90,0.55)"
                      height={180}
                      label={papel.label}
                      radius={0}
                      src={papel.imageId === undefined ? undefined : `/media/${papel.imageId}`}
                      width="100%"
                    />
                    <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 9, letterSpacing: '0.35em', color: P.oro }}>
                      {papel.label}
                    </div>
                    <div style={{ marginTop: 4, fontFamily: DISPLAY, fontSize: 18 }}>
                      {indice === 0 ? (hero?.nameA ?? '') : (hero?.nameB ?? '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {hosts === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro, textAlign: 'center', marginBottom: 14 }}>
                {hosts.label ?? ''}
              </div>
              <div style={{ fontFamily: SERIF, textAlign: 'center', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
                {/* La última línea del reparto es la firma del director, y la maqueta la
                    pinta en monoespaciada pequeña y en oro, no como un nombre más. */}
                {hosts.names.map((nombre, indice) => (
                  <span
                    key={nombre}
                    style={
                      indice === hosts.names.length - 1
                        ? {
                            display: 'block',
                            marginTop: 8,
                            fontFamily: MONO,
                            fontStyle: 'normal',
                            fontSize: 9,
                            letterSpacing: '0.3em',
                            color: P.oro,
                          }
                        : { display: 'block' }
                    }
                  >
                    {nombre}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {itinerary === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro, textAlign: 'center' }}>· SCENES ·</div>
              <div style={{ marginTop: 16 }}>
                {itinerary.map((escena) => (
                  <div
                    key={`${escena.time}-${escena.label}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: `1px solid ${P.filete}`,
                    }}
                  >
                    <div style={{ fontFamily: MONO, fontSize: 11, color: P.oro, fontWeight: 500 }}>{escena.time}</div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.15em', color: P.claro }}>{escena.label}</div>
                      {escena.note === undefined ? null : (
                        <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 2, opacity: 0.7 }}>{escena.note}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro, textAlign: 'center' }}>
                {reception.label ?? themes.reception}
              </div>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 36 }}>{reception.place ?? ''}</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>{reception.address ?? ''}</div>
              </div>
              {map === undefined ? null : (
                <div style={{ marginTop: 18 }}>
                  <MapPreview
                    accent={P.oro}
                    border="rgba(184,148,90,0.3)"
                    coords={map.coords ?? ''}
                    directionsLabel={themes.viewLocation}
                    href={map.href}
                    respaldo={[reception?.place, reception?.address].filter(Boolean).join(', ')}
                    label={map.label ?? ''}
                    pinDot={P.fondo}
                  />
                </div>
              )}
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro, textAlign: 'center', marginBottom: 14 }}>
                · ORIGINAL SOUNDTRACK ·
              </div>
              <MusicPlayer
                accent={P.oro}
                artist={music.artist ?? ''}
                audioSrc={audioSrc ?? (music.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)}
                eyebrow={themes.songOfTheNight}
                playIconColor={P.fondo}
                textColor={P.tinta}
                track={music.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: 22, border: `1px solid ${P.fileteFuerte}` }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro }}>
                {dressCode.note ?? themes.dressCode}
              </div>
              <div style={{ marginTop: 10, fontFamily: DISPLAY, fontSize: 30 }}>{dressCode.title ?? ''}</div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>{dressCode.detail ?? ''}</div>
              <PaletaDeColores borde="currentColor" colores={dressCode.colors} />
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 36 }}>
            {/* La entrada de cine, con el pase real dentro: en la maqueta ese código QR era
                un dibujo. Aquí es el que la puerta escanea. */}
            <div style={{ padding: 20, border: `2px solid ${P.oro}`, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: -10,
                  left: 16,
                  padding: '0 10px',
                  background: P.fondo,
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: '0.4em',
                  color: P.oro,
                }}
              >
                · YOUR TICKET ·
              </div>
              <div style={{ marginTop: 4 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro }}>ADMIT ONE</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 24, marginTop: 4 }}>
                  {hero?.nameA ?? ''} &amp; {hero?.nameB ?? ''}
                </div>
                <div style={{ marginTop: 12 }}>{slots.pass}</div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em', color: P.oro, marginBottom: 12 }}>
                {dictionary.title}
              </div>
              {slots.guest}
              {slots.rsvp}
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 32 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro, marginBottom: 12 }}>
              {themes.gifts}
            </div>
            {slots.registry}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 32 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.oro, marginBottom: 12 }}>
              {themes.guestbook}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        {closing === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 44, padding: '24px 0', borderTop: `1px solid ${P.fileteFuerte}`, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.45em', color: P.oro }}>· END CREDITS ·</div>
              {closing.text === undefined ? null : (
                <div style={{ marginTop: 16, fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, lineHeight: 1.8, opacity: 0.8 }}>
                  {/* La última línea de los créditos —«Best Picture · this one.»— la
                      maqueta la destaca: un punto más grande, en el claro del diseño y
                      separada del resto. */}
                  {closing.text.split('\n').map((linea, indice, todas) => (
                    <span
                      key={linea}
                      style={
                        indice === todas.length - 1
                          ? { display: 'block', marginTop: 14, fontSize: 14, color: P.claro }
                          : { display: 'block' }
                      }
                    >
                      {linea}
                    </span>
                  ))}
                </div>
              )}
              {closing.signature === undefined ? null : (
                <div style={{ marginTop: 32, fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 22, color: P.oro }}>
                  {closing.signature}
                </div>
              )}
            </div>
          </Reveal>
        )}

      </ThemeColumn>

      <div aria-hidden style={{ height: 36, background: P.banda }} />
    </article>
  )
}
