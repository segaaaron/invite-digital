import { HeroRings } from '../art/HeroRings'
import type { ThemeProps } from '../contract'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoCollage } from '../kit/PhotoCollage'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { FloatingParticles } from '../kit/backgrounds/FloatingParticles'
import { Starfield } from '../kit/backgrounds/Starfield'
import { WeddingMagicBg } from '../kit/backgrounds/WeddingMagicBg'
import { PALETA as P } from './boda.palette'

const MONO = 'var(--font-jetbrains-mono)'
const DISPLAY = 'var(--font-cormorant)'

/**
 * «Étoile» — la boda oscura elegante, portada de `invites-1.jsx:6`.
 *
 * Todo el color sale de `boda.palette.ts` y todo el texto de `content`; lo que la maqueta
 * traía escrito dentro es ahora el `defaultContent` del tema, así que el escaparate se ve
 * idéntico y una boda real se ve con lo suyo.
 *
 * Las tres piezas de la maqueta que solo hacían `useState` —su RSVP, su mesa de regalos y
 * su libro de firmas— están sustituidas por las ranuras, que son las nuestras y sí
 * guardan.
 */
/**
 * Cómo llama **este** diseño a sus secciones.
 *
 * No son traducciones —para eso está el diccionario—, son la voz del diseño, y por eso
 * viven con él. Lo que no esté aquí cae al diccionario.
 */
const ROTULOS = { guestbook: 'LIBRO DE FIRMAS DIGITAL' } as const


/**
 * El año en números romanos, que es como este diseño lo pinta en la barra de arriba.
 *
 * Se calcula del año del evento y no se escribe a mano: la maqueta tiene «MMXXVI» clavado,
 * y una boda de 2027 con «MMXXVI» impreso arriba es un error que nadie ve hasta que lo ve
 * un invitado.
 */
function aRomano(anio: number): string {
  const tabla: readonly (readonly [number, string])[] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let resto = anio
  let salida = ''
  for (const [valor, letra] of tabla) {
    while (resto >= valor) {
      salida += letra
      resto -= valor
    }
  }
  return salida
}
export function BodaView({ content, event, dictionary, themes, slots, preview }: ThemeProps) {
  const romano = aRomano(new Date(`${event.eventDate}T00:00:00`).getFullYear())
  const { hero, schedule, ceremony, reception, map, itinerary, music, dressCode, gallery, closing , notes } = content

  return (
    <article
      style={{
        position: 'relative',
        background: P.fondo,
        color: P.tinta,
        fontFamily: 'var(--font-space-grotesk)',
        minHeight: '100dvh',
        // `clip`, no `hidden`. Los dos recortan lo que sangra —las esquinas florales, los
        // ramos de fondo, los círculos que se salen del papel—, pero `hidden` convierte el
        // elemento en **contenedor de scroll**: `overflow-y` pasa a `auto` por
        // especificación y los fondos `sticky` se anclan a él en vez de a la ventana.
        // `clip` recorta sin crear ese contenedor, que es exactamente lo que hace falta.
        overflowX: 'clip',
        // Sin `overflow-x: hidden` aquí a propósito: ponerlo hace que `overflow-y` pase a
        // `auto` por especificación, el `<article>` se convierte en contenedor de scroll y
        // los fondos `sticky` se anclan a él en vez de a la ventana. El recorte horizontal
        // ya lo hace `body`, que es donde vive desde siempre.
      }}
    >
      <EnvelopeCover
        accent={P.oro}
        bg={P.fondo}
        hint={themes.coverHint}
        label={themes.coverOpen}
        openLabel={themes.coverAria}
        textColor={P.tinta}
      />

      <WeddingMagicBg
        dark
        glowColors={[P.fondo, P.oro, P.oroApagado]}
        intensity={0.4}
        palette={[P.fondo, P.cafe, P.tostado, P.cafe, P.fondo]}
        petalColors={[P.oro, P.tinta, P.oroApagado]}
        petalEdges={[P.tostado, P.cafe]}
        petals={20}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 90% 60% at 25% 15%, rgba(212,180,131,0.20), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 85%, rgba(160,120,180,0.14), transparent 60%)',
        }}
      />
      <Starfield color="rgba(245,230,200,0.85)" count={45} seed={9} />
      <FloatingParticles char="✦" color={P.oro} count={10} seed={3} size={10} />

      <ThemeColumn style={{ padding: '44px 30px 60px' }}>
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.35em', opacity: 0.6 }}>
              · {romano} ·
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.35em', opacity: 0.6 }}>
              {hero?.serial ?? ''}
            </div>
          </div>
        </Reveal>

        <Reveal delay={120} y={32}>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', opacity: 0.7 }}>
              {hero?.eyebrow ?? themes.saveTheDate}
            </div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 56,
                lineHeight: 1,
                marginTop: 28,
                letterSpacing: '-0.02em',
              }}
            >
              {hero?.nameA ?? ''}
            </h1>
            {hero?.nameB === undefined ? null : (
              <>
                <div
                  aria-hidden
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    margin: '14px 0',
                    color: P.oro,
                  }}
                >
                  <div style={{ height: 1, width: 40, background: 'currentColor', opacity: 0.5 }} />
                  <div style={{ fontFamily: DISPLAY, fontSize: 22, fontStyle: 'italic' }}>&amp;</div>
                  <div style={{ height: 1, width: 40, background: 'currentColor', opacity: 0.5 }} />
                </div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: 56,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {hero.nameB}
                </div>
              </>
            )}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ margin: '24px -10px 0' }}>
            <HeroRings accent={P.oro} />
          </div>
        </Reveal>

        <Reveal delay={200} scale={0.94}>
          <div style={{ position: 'relative', width: 240, height: 300, margin: '24px auto 0' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50% 50% 14px 14px / 36% 36% 14px 14px',
                overflow: 'hidden',
                border: `1px solid ${P.fileteFuerte}`,
              }}
            >
              <PhotoSlot
                bg="transparent"
                border="none"
                color="rgba(212,180,131,0.55)"
                height="100%"
                label={themes.portraitPlaceholder}
                radius={0}
                src={hero?.portraitImageId === undefined ? undefined : `/media/${hero.portraitImageId}`}
                width="100%"
              />
            </div>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50% 50% 18px 18px / 36% 36% 18px 18px',
                border: `1px solid ${P.filete}`,
                boxShadow: '0 0 60px rgba(212,180,131,0.18)',
              }}
            />
          </div>
        </Reveal>

        {schedule === undefined ? null : (
          <Reveal delay={120}>
            <div
              style={{
                marginTop: 56,
                borderTop: `1px solid ${P.filete}`,
                borderBottom: `1px solid ${P.filete}`,
                padding: '22px 0',
              }}
            >
              <Countdown
                cellStyle={{ textAlign: 'center' }}
                labels={{
                  days: themes.countdownDays,
                  hours: themes.countdownHours,
                  mins: themes.countdownMins,
                  secs: themes.countdownSecs,
                }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 6, opacity: 0.55 }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 300, color: P.oro, lineHeight: 1 }}
              />
            </div>
          </Reveal>
        )}

        {gallery === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro, marginBottom: 12 }}>
                {themes.ourStory}
              </div>
              <PhotoCollage
                border={P.fileteFuerte}
                photos={gallery.map((casilla) => ({
                  label: casilla.label,
                  src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}`,
                }))}
                polaroidBg={P.tinta}
                polaroidSlotBg="rgba(58,36,16,0.10)"
                polaroidSlotColor="rgba(58,36,16,0.55)"
                slotBg="rgba(212,180,131,0.04)"
                slotColor="rgba(212,180,131,0.5)"
                stripBg={P.fondo}
                variant="polaroid"
              />
            </div>
          </Reveal>
        )}

        {ceremony === undefined && reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {[ceremony, reception].map((lugar, indice) =>
                lugar === undefined ? null : (
                  <div key={indice}>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro }}>
                      {lugar.label ?? (indice === 0 ? themes.ceremony : themes.reception)}
                    </div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 26, marginTop: 8, fontStyle: 'italic' }}>
                      {lugar.time ?? ''}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 6, opacity: 0.85 }}>{lugar.place ?? ''}</div>
                    <div style={{ fontSize: 11, marginTop: 4, opacity: 0.55 }}>{lugar.address ?? ''}</div>
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
                accent={P.oro}
                border="rgba(212,180,131,0.3)"
                coords={map.coords ?? ''}
                label={map.label ?? ''}
                pinDot={P.fondo}
              />
            </div>
          </Reveal>
        )}

        {itinerary === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro }}>
                {themes.itinerary}
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itinerary.map((fila) => (
                  <div
                    key={`${fila.time}-${fila.label}`}
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'baseline',
                      borderBottom: `1px dotted ${P.filete}`,
                      paddingBottom: 6,
                    }}
                  >
                    <div style={{ fontFamily: MONO, fontSize: 11, color: P.oro, width: 50 }}>{fila.time}</div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 16, fontStyle: 'italic' }}>{fila.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <MusicPlayer
                accent={P.oro}
                artist={music.artist ?? ''}
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
            <div
              style={{
                marginTop: 28,
                textAlign: 'center',
                padding: 18,
                border: '1px solid rgba(212,180,131,0.22)',
                borderRadius: 6,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.35em', opacity: 0.6 }}>
                {themes.dressCode}
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, fontStyle: 'italic', marginTop: 8, color: P.oro }}>
                {dressCode.title ?? ''}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>{dressCode.note ?? ''}</div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro, marginBottom: 12 }}>
              {themes.gifts}
            </div>
            {slots.registry}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro, marginBottom: 12 }}>
              {dictionary.title}
            </div>
            {slots.guest}
            {preview === true ? (
              <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.7 }}>{themes.previewNotice}</p>
            ) : (
              slots.rsvp
            )}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro, marginBottom: 12 }}>
              {ROTULOS.guestbook}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        {closing?.text === undefined ? null : (
          <div
            style={{
              marginTop: 36,
              textAlign: 'center',
              fontFamily: DISPLAY,
              fontStyle: 'italic',
              fontSize: 13,
              opacity: 0.55,
            }}
          >
            “ {closing.text} ”
          </div>
        )}

        <div style={{ marginTop: 28 }}>{slots.pass}</div>
        {notes?.[0]?.text === undefined ? null : (
          <div
            style={{ marginTop: 36, textAlign: 'center', fontStyle: 'italic', fontSize: 13, opacity: 0.55 }}
          >
            {notes[0].text}
          </div>
        )}

      </ThemeColumn>
    </article>
  )
}
