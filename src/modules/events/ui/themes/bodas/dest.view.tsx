import { HeroOcean } from '../art/HeroOcean'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import type { ThemeProps } from '../contract'
import { variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { PhotoCollage } from '../kit/PhotoCollage'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { FallingRosePetals } from '../kit/flora/FallingRosePetals'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { PALETA as P } from './dest.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SERIF = 'var(--font-cormorant)'

/**
 * «Destino» — Alejandra & Pablo en Tulum, de `invites-3.jsx:303`.
 *
 * El fondo es un degradado de mar a arena que ocupa la pieza entera, con el sol puesto a
 * un tercio de la altura y la línea del horizonte a otro. Todos los bloques van sobre
 * cristal esmerilado, que es lo único que deja leer texto sobre ese fondo.
 *
 * El itinerario son **cuatro días, no cuatro horas**: en una boda de destino el invitado
 * reserva vuelo, y lo que necesita saber es qué pasa cada jornada.
 */
/**
 * Cómo llama **este** diseño a sus secciones: una boda de destino dura cuatro días, y su
 * itinerario lo dice. No es una traducción —para eso está el diccionario—, es la voz del
 * diseño.
 */
const ROTULOS = {
  itinerary: '· ITINERARIO · 4 DÍAS ·',
  apertura: '· DESTINATION · WEDDING ·',
  /** La portada de este diseño es un billete: «tu acceso» y la clase, como un embarque. */
  coverEyebrow: 'YOUR ACCESS',
  coverHeadline: 'VIP',
} as const

export function DestView({ content, dictionary, themes, slots }: ThemeProps) {
  const { hero, quote, schedule, reception, itinerary, dressCode, gallery, closing } = content
  const pareja = gallery?.[0]
  const mosaico = (gallery ?? []).slice(1, 6)

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras({
    // El acento y la tinta de este diseño son la arena y la espuma, que van sobre el azul
    // del principio. Las ranuras caen al final, ya sobre la arena, así que ahí se invierte,
    // como en la maqueta: tarjeta blanca al 92 % y tinta de mar profundo. Un formulario en
    // color espuma sobre arena no se lee.
    acento: P.mar,
    acentoHondo: P.marProfundo,
    campo: P.blanco,
    display: SERIF,
    hueco: 'rgba(6,40,61,0.12)',
    linea: 'rgba(6,40,61,0.22)',
    panel: P.veloFuerte,
    sobreAcento: P.espuma,
    tinta: P.marProfundo,
    tintaSuave: 'rgba(6,40,61,0.82)',
    tintaTenue: 'rgba(6,40,61,0.56)',
  })

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: `linear-gradient(180deg, ${P.marProfundo} 0%, ${P.mar} 60%, ${P.arena} 100%)`,
        color: P.tinta,
        fontFamily: SERIF,
        minHeight: 'var(--alto, 100dvh)',
        // `clip`, no `hidden`. Los dos recortan lo que sangra —las esquinas florales, los
        // ramos de fondo, los círculos que se salen del papel—, pero `hidden` convierte el
        // elemento en **contenedor de scroll**: `overflow-y` pasa a `auto` por
        // especificación y los fondos `sticky` se anclan a él en vez de a la ventana.
        // `clip` recorta sin crear ese contenedor, que es exactamente lo que hace falta.
        overflowX: 'clip',
      }}
    >
      <EnvelopeCover
        accent={P.arena}
        bg={P.marProfundo}
        eyebrow={ROTULOS.coverEyebrow}
        headline={ROTULOS.coverHeadline}
        hint={themes.coverHint}
        label={hero?.eyebrow ?? themes.coverOpen}
        openLabel={themes.coverAria}
        textColor={P.tinta}
        headlineFont="var(--font-space-grotesk)"
        variant="ticket"
      />

      <FallingRosePetals count={18} darkEdges={[P.naranja, P.mar]} palette={[P.arena, P.espuma, P.sol]} seed={88} />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${P.sol} 0%, ${P.naranja} 50%, transparent 75%)`,
          opacity: 0.8,
        }}
      />
      <div aria-hidden style={{ position: 'absolute', top: '62%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.4)' }} />

      <ThemeColumn style={{ padding: '44px 30px 60px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em' }}>
            {ROTULOS.apertura}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em' }}>
            {/* La apertura del cuerpo. El `eyebrow` es el rótulo de la portada y no se
                repite aquí: en la maqueta esta línea sale una sola vez. */}
            {ROTULOS.apertura}
          </div>
        </Reveal>

        <Reveal delay={150} y={28}>
          <div style={{ marginTop: 80, textAlign: 'center' }}>
            <h1 style={{ fontSize: 56, fontStyle: 'italic', fontWeight: 300, lineHeight: 1, margin: 0 }}>
              {hero?.nameA ?? ''}
              {hero?.nameB === undefined ? null : (
                <>
                  <br />&amp; {hero.nameB}
                </>
              )}
            </h1>
            <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 11, letterSpacing: '0.4em' }}>
              {hero?.monogram ?? ''}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>{hero?.serial ?? ''}</div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ margin: '24px -10px 0' }}>
            <HeroOcean accent={P.arena} />
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div
            style={{
              position: 'relative',
              margin: '24px auto 0',
              width: 260,
              height: 320,
              borderRadius: '50% 50% 6px 6px / 40% 40% 6px 6px',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.4)',
            }}
          >
            <PhotoSlot
              bg="rgba(255,255,255,0.05)"
              border="none"
              color="rgba(255,255,255,0.6)"
              height="100%"
              label={pareja?.label ?? themes.portraitPlaceholder}
              radius={0}
              src={pareja?.imageId === undefined ? undefined : `/media/${pareja.imageId}`}
              width="100%"
            />
          </div>
        </Reveal>

        {schedule === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 32,
                background: 'rgba(6,40,61,0.55)',
                backdropFilter: 'blur(8px)',
                padding: 18,
                borderRadius: 10,
              }}
            >
              <Countdown
                labels={{
                  days: themes.countdownDays,
                  hours: themes.countdownHours,
                  mins: themes.countdownMins,
                  secs: themes.countdownSecs,
                }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4, opacity: 0.7 }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontSize: 30, fontStyle: 'italic' }}
              />
            </div>
          </Reveal>
        )}

        {itinerary === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: 18, background: P.velo, borderRadius: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.arena }}>
                {ROTULOS.itinerary}
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itinerary.map((jornada) => (
                  <div
                    key={`${jornada.time}-${jornada.label}`}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'baseline',
                      borderBottom: '1px dotted rgba(255,255,255,0.18)',
                      paddingBottom: 6,
                    }}
                  >
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', color: P.arena, width: 60 }}>
                      {jornada.time}
                    </div>
                    <div style={{ fontSize: 14, fontStyle: 'italic' }}>{jornada.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {mosaico.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <PhotoCollage
                border="rgba(255,255,255,0.3)"
                photos={mosaico.map((casilla) => ({
                  label: casilla.label,
                  src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}`,
                }))}
                polaroidBg={P.blanco}
                polaroidSlotBg="rgba(6,40,61,0.08)"
                polaroidSlotColor="#a99"
                slotBg="rgba(255,255,255,0.08)"
                slotColor="rgba(255,255,255,0.5)"
                stripBg={P.marProfundo}
                variant="mosaic"
              />
            </div>
          </Reveal>
        )}

        {reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: 18, background: P.veloFuerte, color: P.marProfundo, borderRadius: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.mar }}>
                {reception.label ?? themes.reception}
              </div>
              <div style={{ marginTop: 10, fontSize: 16, fontStyle: 'italic' }}>{reception.place ?? ''}</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>{reception.address ?? ''}</div>
            </div>
          </Reveal>
        )}

        {quote === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24, padding: 18, background: P.velo, borderRadius: 10 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.arena }}>SAVE THE FLIGHT</div>
              <p style={{ marginTop: 10, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }}>{quote.text}</p>
            </div>
          </Reveal>
        )}

        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.marProfundo, marginBottom: 12 }}>
                {dressCode.title ?? themes.dressCode}
              </div>
              <div style={{ fontSize: 14, fontStyle: 'italic', opacity: 0.9 }}>{dressCode.detail ?? ''}</div>
              <PaletaDeColores borde="currentColor" colores={dressCode.colors} />
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 24, padding: 18, background: P.velo, borderRadius: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.marProfundo, marginBottom: 12 }}>
              {themes.gifts}
            </div>
            {slots.registry}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.marProfundo, marginBottom: 12 }}>
              {dictionary.title}
            </div>
            {slots.guest}
            {slots.rsvp}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.marProfundo, marginBottom: 12 }}>
              {themes.guestbook}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        <div style={{ marginTop: 24 }}>{slots.pass}</div>

        {closing === undefined ? null : (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontStyle: 'italic', opacity: 0.9 }}>{closing.text ?? ''}</div>
            {closing.signature === undefined ? null : (
              <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 11, letterSpacing: '0.4em', color: P.arena }}>
                {closing.signature}
              </div>
            )}
          </div>
        )}
      </ThemeColumn>
    </article>
  )
}
