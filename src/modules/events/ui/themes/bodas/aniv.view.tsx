import { HeroAnniversary } from '../art/HeroAnniversary'
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
import { Starfield } from '../kit/backgrounds/Starfield'
import { WeddingMagicBg } from '../kit/backgrounds/WeddingMagicBg'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { PALETA as P } from './aniv.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SERIF = 'var(--font-cormorant)'

/**
 * «Bodas de Oro» — el aniversario, de `invites-3.jsx:97`.
 *
 * El sol dorado de rayos girando preside la pieza, y la tira de cuatro fotos con sus años
 * —1976, 1986, 2006, 2026— es lo que cuenta la historia sin una línea de texto.
 *
 * Los años que se celebran salen del contenido, no del dibujo: no toda boda de oro son
 * cincuenta, y hay quien celebra las de plata con este mismo diseño.
 */
/**
 * Cómo llama **este** diseño a sus secciones.
 *
 * No son traducciones —para eso está el diccionario—, son la voz del diseño, y por eso
 * viven con él. Lo que no esté aquí cae al diccionario.
 */
const ROTULOS = {
  /**
   * La portada es un **telón**, no un sobre: la maqueta abre estas bodas de oro con la
   * cortina y su titular, y el sobre es de las otras cuatro.
   */
  cover: '50 AÑOS DE AMOR',
  coverEyebrow: 'ESTÁS INVITADO',
  coverHeadline: 'Algo inolvidable',
  gifts: 'NUESTRO MEJOR REGALO',
  guestbook: 'DEDÍCALES UNAS PALABRAS',
} as const

export function AnivView({ content, dictionary, themes, slots }: ThemeProps) {
  const { hero, hosts, quote, schedule, reception, map, music, gallery, notes, closing } = content
  const original = gallery?.[0]
  const tira = (gallery ?? []).slice(1, 5)

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.fondo, acento: P.oro, acentoHondo: P.oroOscuro, display: SERIF, tinta: P.tinta }))

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
        glowColors={[P.oro, P.tinta, P.oroOscuro]}
        intensity={0.4}
        palette={[P.fondo, P.tabaco, P.cuero, P.tabaco, P.fondo]}
        petalColors={[P.oro, P.tinta, P.oroSuave]}
        petalEdges={[P.oroOscuro, P.cuero]}
        petals={22}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(224,184,90,0.18), transparent 60%)',
        }}
      />
      <Starfield color={P.oro} count={30} seed={50} />
      <FloatingParticles char="✦" color={P.oro} count={12} seed={50} size={10} />

      <ThemeColumn style={{ padding: '44px 30px 60px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.5em', color: P.oro }}>
            {hero?.eyebrow ?? themes.saveTheDate}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div style={{ margin: '30px -10px 0' }}>
            <HeroAnniversary accent={P.oro} years={hero?.monogram ?? ''} />
          </div>
        </Reveal>

        <Reveal>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            {hosts?.label === undefined ? null : (
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: P.oro, opacity: 0.8 }}>
                {hosts.label}
              </div>
            )}
            <h1 style={{ marginTop: 10, fontSize: 44, fontStyle: 'italic', fontWeight: 300, lineHeight: 1.1 }}>
              {hero?.nameA ?? ''}
              {hero?.nameB === undefined ? null : (
                <>
                  <br />&amp; {hero.nameB}
                </>
              )}
            </h1>
            {hero?.serial === undefined ? null : (
              <div style={{ marginTop: 8, fontSize: 14, opacity: 0.6, fontStyle: 'italic' }}>{hero.serial}</div>
            )}
          </div>
        </Reveal>

        {original === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36 }}>
              <PhotoSlot
                bg="rgba(224,184,90,0.05)"
                border={`1px solid ${P.filete}`}
                color="rgba(224,184,90,0.6)"
                height={200}
                label={original.label}
                radius={6}
                src={original.imageId === undefined ? undefined : `/media/${original.imageId}`}
                width="100%"
              />
            </div>
          </Reveal>
        )}

        {tira.length === 0 ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <PhotoCollage
                border={P.filete}
                photos={tira.map((casilla) => ({
                  label: casilla.label,
                  src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}`,
                }))}
                polaroidBg={P.tinta}
                polaroidSlotBg="rgba(26,18,8,0.1)"
                polaroidSlotColor="#a99"
                // La tira va sobre oro, así que sus casillas y sus años son blancos: en
                // dorado sobre dorado no se lee ni la casilla ni el año, que es lo que
                // pasaba —una barra amarilla lisa donde el diseño pone cuatro fotos—.
                slotBg="rgba(255,255,255,0.05)"
                slotColor="rgba(255,255,255,0.5)"
                stripBg={P.oro}
                variant="strip"
              />
              {closing?.text === undefined ? null : (
                <div style={{ marginTop: 8, textAlign: 'center', fontStyle: 'italic', fontSize: 14, opacity: 0.7 }}>
                  {closing.text}
                </div>
              )}
            </div>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, borderTop: `1px solid ${P.filete}`, borderBottom: `1px solid ${P.filete}`, padding: '20px 0' }}>
              <Countdown
                labels={{
                  days: themes.countdownDays,
                  hours: themes.countdownHours,
                  mins: themes.countdownMins,
                  secs: themes.countdownSecs,
                }}
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', marginTop: 4, opacity: 0.55 }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontSize: 32, fontStyle: 'italic', color: P.oro }}
              />
            </div>
          </Reveal>
        )}

        {quote === undefined ? null : (
          <Reveal>
            <p style={{ marginTop: 28, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic', textAlign: 'center', opacity: 0.85 }}>
              {quote.text.split('\n').map((linea) => (
                <span key={linea} style={{ display: 'block' }}>
                  {linea}
                </span>
              ))}
            </p>
          </Reveal>
        )}

        {reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: 20, border: `1px solid ${P.filete}`, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.35em', color: P.oro }}>
                {reception.label ?? themes.reception}
              </div>
              <div style={{ marginTop: 14, fontSize: 24, fontStyle: 'italic' }}>{reception.place ?? ''}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>{reception.address ?? ''}</div>
            </div>
          </Reveal>
        )}

        {map === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <MapPreview
                accent={P.oro}
                border={P.filete}
                coords={map.coords ?? ''}
                label={map.label ?? ''}
                pinDot={P.fondo}
              />
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <MusicPlayer
                accent={P.oro}
                artist={music.artist ?? ''}
                audioMediaId={music.audioMediaId}
                eyebrow={themes.songOfTheNight}
                playIconColor={P.fondo}
                textColor={P.tinta}
                track={music.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 24, padding: 18, background: 'rgba(224,184,90,0.06)', borderRadius: 6 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro }}>{ROTULOS.gifts}</div>
            {notes?.[0]?.text === undefined ? null : (
              <p style={{ marginTop: 8, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }}>{notes[0].text}</p>
            )}
            <div style={{ marginTop: 12 }}>{slots.registry}</div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro, marginBottom: 10 }}>
              {dictionary.title}
            </div>
            {slots.guest}
            {slots.rsvp}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.oro, marginBottom: 10 }}>
              {ROTULOS.guestbook}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        <div style={{ marginTop: 24 }}>{slots.pass}</div>

        {closing?.signature === undefined ? null : (
          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 28, fontStyle: 'italic', color: P.oro }}>
            {closing.signature}
          </div>
        )}
      </ThemeColumn>
    </article>
  )
}
