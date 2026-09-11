import type { ThemeProps } from '../contract'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoCollage } from '../kit/PhotoCollage'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { FloatingParticles } from '../kit/backgrounds/FloatingParticles'
import { WeddingMagicBg } from '../kit/backgrounds/WeddingMagicBg'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { PALETA as P } from './eng.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SERIF = 'var(--font-newsreader)'

/**
 * «Compromiso» — la pedida de mano, de `invites-3.jsx:206`.
 *
 * El titular va partido en dos tamaños —«Dijo» pequeño, «sí» enorme— y el retrato es
 * circular con un anillo dando vueltas alrededor. Es el único diseño de la colección cuyo
 * hito no es la boda sino el sí, así que la cuenta atrás apunta a la fiesta de compromiso.
 */
/**
 * La línea que abre el cuerpo, bajo la portada. Es copia del diseño y no del contenido: no
 * la escribe el atelier, la trae el modelo.
 */
const ROTULOS = { apertura: '· SHE SAID YES ·' } as const

export function EngView({ content, dictionary, themes, slots }: ThemeProps) {
  const { hero, hosts, quote, schedule, reception, map, music, gallery, closing } = content
  const propuesta = gallery?.[0]
  const collage = (gallery ?? []).slice(1, 5)

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.blanco, acento: P.rosa, display: SERIF, tinta: P.tinta }))

  return (
    <article style={{ ...RANURAS, position: 'relative', background: P.papel, color: P.tinta, fontFamily: SERIF, minHeight: '100dvh', overflowX: 'clip' }}>
      <EnvelopeCover
        accent={P.rosa}
        bg={P.papel}
        hint={themes.coverHint}
        label={hero?.eyebrow ?? themes.coverOpen}
        openLabel={themes.coverAria}
        textColor={P.tinta}
      />

      <WeddingMagicBg
        glowColors={[P.petalo, P.concha, P.blanco]}
        intensity={0.65}
        palette={[P.papel, P.rubor, P.nube, P.concha, P.papel]}
        petalColors={[P.blanco, P.rubor, P.petalo, P.rosa]}
        petalEdges={[P.rosa, P.tinta]}
        petals={24}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 30% 10%, ${P.rubor}, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, ${P.concha}, transparent 60%)`,
        }}
      />
      <FloatingParticles char="❤" color={P.rosa} count={14} seed={7} size={14} />

      <ThemeColumn style={{ padding: '48px 30px 60px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.rosa }}>
            {ROTULOS.apertura}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <h1 style={{ textAlign: 'center', marginTop: 28, margin: '28px 0 0' }}>
            <span style={{ display: 'block', fontSize: 72, fontStyle: 'italic', lineHeight: 1, fontWeight: 300 }}>
              {hero?.nameA ?? ''}
            </span>
            {hero?.nameB === undefined ? null : (
              <span
                style={{
                  display: 'block',
                  fontSize: 128,
                  fontStyle: 'italic',
                  lineHeight: 0.9,
                  fontWeight: 300,
                  color: P.rosa,
                  marginTop: 6,
                }}
              >
                “{hero.nameB}”
              </span>
            )}
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <div style={{ position: 'relative', margin: '32px auto 0', width: 230, height: 230 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                border: `2px solid ${P.blanco}`,
                boxShadow: '0 20px 50px rgba(212,86,108,0.25)',
              }}
            >
              <PhotoSlot
                bg="rgba(252,224,219,0.5)"
                border="none"
                color="rgba(212,86,108,0.7)"
                height="100%"
                label={propuesta?.label ?? themes.portraitPlaceholder}
                radius={0}
                src={propuesta?.imageId === undefined ? undefined : `/media/${propuesta.imageId}`}
                width="100%"
              />
            </div>
            {/* El anillo que gira alrededor del retrato, con su brillante. */}
            <div
              aria-hidden
              className="theme-art"
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                width: 60,
                height: 60,
                borderRadius: '50%',
                border: `3px solid ${P.rosa}`,
                animation: 'theme-spin 14s linear infinite',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  width: 14,
                  height: 14,
                  background: P.blanco,
                  border: `2px solid ${P.rosa}`,
                  transform: 'translateX(-50%) rotate(45deg)',
                }}
              />
            </div>
          </div>
        </Reveal>

        {hosts === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontStyle: 'italic' }}>{hosts.names.join(' · ')}</div>
              <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: P.rosa }}>
                {hosts.label ?? ''}
              </div>
            </div>
          </Reveal>
        )}

        {collage.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 32 }}>
              <PhotoCollage
                border={P.filete}
                photos={collage.map((casilla) => ({
                  label: casilla.label,
                  src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}`,
                }))}
                polaroidBg={P.blanco}
                polaroidSlotBg="rgba(212,86,108,0.08)"
                polaroidSlotColor="#a99"
                slotBg="rgba(212,86,108,0.05)"
                slotColor="rgba(255,255,255,0.5)"
                stripBg={P.tinta}
                variant="polaroid"
              />
            </div>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: '20px 0', borderTop: `1px solid ${P.filete}`, borderBottom: `1px solid ${P.filete}` }}>
              <Countdown
                labels={{
                  days: themes.countdownDays,
                  hours: themes.countdownHours,
                  mins: themes.countdownMins,
                  secs: themes.countdownSecs,
                }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4, opacity: 0.65 }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontSize: 32, fontStyle: 'italic', color: P.rosa }}
              />
              {closing?.text === undefined ? null : (
                <div
                  style={{ marginTop: 12, textAlign: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa }}
                >
                  {closing.text}
                </div>
              )}
            </div>
          </Reveal>
        )}

        {quote === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 28, textAlign: 'center', fontSize: 18, fontStyle: 'italic', lineHeight: 1.6 }}>
              “{quote.text}”
            </p>
          </Reveal>
        )}

        {reception === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 28,
                padding: 18,
                background: P.blanco,
                borderRadius: 14,
                boxShadow: '0 8px 28px rgba(212,86,108,0.12)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa }}>
                {reception.label ?? themes.reception}
              </div>
              <div style={{ marginTop: 10, fontSize: 22, fontStyle: 'italic' }}>{reception.place ?? ''}</div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>{reception.address ?? ''}</div>
            </div>
          </Reveal>
        )}

        {map === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <MapPreview
                accent={P.rosa}
                border="rgba(212,86,108,0.3)"
                coords={map.coords ?? ''}
                label={map.label ?? ''}
                pinDot={P.papel}
              />
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <MusicPlayer
                accent={P.rosa}
                artist={music.artist ?? ''}
                eyebrow={themes.songOfTheNight}
                playIconColor={P.blanco}
                textColor={P.tinta}
                track={music.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa, marginBottom: 12 }}>
              {themes.gifts}
            </div>
            {slots.registry}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa, marginBottom: 12 }}>
              {dictionary.title}
            </div>
            {slots.guest}
            {slots.rsvp}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.rosa, marginBottom: 12 }}>
              {themes.guestbook}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        <div style={{ marginTop: 24 }}>{slots.pass}</div>

        {closing?.signature === undefined ? null : (
          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 28, fontStyle: 'italic', color: P.rosa }}>
            {closing.signature}
          </div>
        )}
      </ThemeColumn>
    </article>
  )
}
