import Image from 'next/image'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { BotanicalTimeline } from '../kit/flora/BotanicalTimeline'
import { FallingPetals } from '../kit/flora/FallingPetals'
import { FloralCorner, FloralSpray } from '../kit/flora/FloralArt'
import { PALETA as P } from './xv-isabelle.palette'

const SERIF = 'var(--font-cormorant)'
const CALIGRAFIA = 'var(--font-great-vibes)'
const CINZEL = 'var(--font-cinzel)'

/** El panel de mármol translúcido sobre el que se apoya cada bloque. */
const PANEL = {
  background: P.panel,
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  border: `1.5px solid ${P.bronce}`,
} as const

/**
 * «Palacio Griego» — Isabelle, de `wedding-variants.jsx:303`.
 *
 * Es el único XV que no comparte esqueleto con los otros siete: su composición es la de la
 * boda botánica —acuarelas florales, fecha de calendario, itinerario en columna— sobre un
 * fondo de mármol griego, con paneles translúcidos en vez de cristal oscuro.
 *
 * Duplicar la composición entre **dos** temas es aceptable; entre siete no lo era, y por
 * eso aquellos comparten piel y este no.
 */
export function XvIsabelleView({ content, event, dictionary, themes, slots, preview }: ThemeProps) {
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, music, dressCode, gallery, closing } =
    content
  const retrato = gallery?.[0]

  // La cita del diseño son tres piezas: la frase, los años y la historia que va bajo «mi
  // historia». Un solo bloque de contenido, como en la boda botánica.
  const [frase = '', anos = '', ...parrafos] = (quote?.text ?? '').split('\n\n')
  const historia = parrafos.join('\n\n')

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiquetaLocal = event.locale === 'en' ? 'en-US' : 'es-BO'
  const diaSemana = cuando === null ? '' : cuando.toLocaleDateString(etiquetaLocal, { weekday: 'long' })
  const mes = cuando === null ? '' : cuando.toLocaleDateString(etiquetaLocal, { month: 'long' })

  return (
    // El artículo va **sin fondo propio**, como en la maqueta: detrás hay un papel pintado
    // fijo —el palacio griego— en `zIndex: -2`, y un color opaco aquí lo tapaba por
    // completo. El diseño se quedaba en un campo crema y la fotografía que le da nombre no
    // se veía nunca, ni en un teléfono.
    <article style={{ position: 'relative', color: P.tinta, fontFamily: SERIF, minHeight: '100dvh', overflowX: 'clip' }}>
      {preview === true ? null : (
        <EnvelopeCover
          accent={P.oroClaro}
          bg={P.marfil}
          hint={themes.coverHint}
          label={hero?.eyebrow ?? themes.coverOpen}
          openLabel={themes.coverAria}
          textColor={P.tinta}
        />
      )}

      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -2,
          backgroundImage: `url("${themeAsset('xv-isabelle', 'estilo-griego-bg.avif')}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'rgba(70,60,45,.22)' }} />

      <div aria-hidden style={{ position: 'absolute', top: 620, left: -90, opacity: 0.22, zIndex: 0 }}>
        <FloralSpray rotate={-12} sway={false} tone="white" width={300} />
      </div>
      <div aria-hidden style={{ position: 'absolute', top: 1180, right: -110, opacity: 0.2, zIndex: 0 }}>
        <FloralSpray flipX rotate={14} sway={false} tone="white" width={320} />
      </div>
      <FallingPetals count={10} palette={[P.marfil, P.panelSuave, P.oroClaro]} seed={31} />

      {/* La portada va **dentro de la columna**, como todo lo demás. Suelta, en un
          portátil se estira a lo ancho de la pantalla: la fotografía es `object-fit:
          cover`, así que a 1900×540 lo que se ve de la pareja es el cielo que tenían
          detrás, y la invitación se abre en un campo vacío con los nombres flotando. El
          fondo ambiente sí ocupa la ventana entera; el contenido, nunca. */}
      <ThemeColumn>
        <div style={{ position: 'relative', height: 540 }}>
        <PhotoSlot
          bg="transparent"
          border="none"
          color="rgba(74,53,32,0.45)"
          height="100%"
          label={retrato?.label ?? themes.portraitPlaceholder}
          objectPosition="center top"
          radius={0}
          src={
            retrato?.imageId === undefined
              ? themeAsset('xv-isabelle', 'isabelle-cover.avif')
              : `/media/${retrato.imageId}`
          }
          width="100%"
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, transparent 50%, rgba(250,250,246,0.65) 80%, ${P.marfil} 100%)`,
          }}
        />
        <FallingPetals count={6} palette={[P.marfil, P.panelSuave]} seed={5} />

        <div aria-hidden style={{ position: 'absolute', bottom: -34, left: -46, zIndex: 3 }}>
          <FloralCorner flipY side="left" tone="white" width={260} />
        </div>
        <div aria-hidden style={{ position: 'absolute', bottom: -34, right: -46, zIndex: 3 }}>
          <FloralCorner flipY side="right" tone="white" width={260} />
        </div>

        <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center' }}>
          <h1 style={{ fontFamily: CALIGRAFIA, fontSize: 80, lineHeight: 1, color: P.tinta, fontWeight: 400, margin: 0 }}>
            {hero?.nameA ?? ''}
          </h1>
          <div style={{ marginTop: 14, fontSize: 14, letterSpacing: '0.5em', fontWeight: 500 }}>
            {hero?.eyebrow ?? themes.saveTheDate}
          </div>
        </div>
        </div>
      </ThemeColumn>

      <ThemeColumn style={{ padding: '0 30px 60px' }}>
        {cuando === null ? null : (
          <Reveal>
            <div style={{ textAlign: 'center', marginTop: 10, padding: '26px 20px', ...PANEL }}>
              <div
                style={{
                  fontFamily: CINZEL,
                  fontSize: 13,
                  letterSpacing: '0.25em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: P.tintaFuerte,
                }}
              >
                {diaSemana}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 12 }}>
                <div aria-hidden style={{ flex: 1, height: 1, background: P.bronce, opacity: 0.6 }} />
                <div
                  style={{
                    fontFamily: CINZEL,
                    fontSize: 12,
                    letterSpacing: '0.25em',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: P.tintaFuerte,
                  }}
                >
                  {mes}
                </div>
                <div aria-hidden style={{ flex: 1, height: 1, background: P.bronce, opacity: 0.6 }} />
              </div>
              <div style={{ fontWeight: 300, fontSize: 90, lineHeight: 1, color: P.oro, marginTop: 14 }}>
                {cuando.getDate()}
              </div>
              <div style={{ fontFamily: CINZEL, fontSize: 12, letterSpacing: '0.3em', color: P.arena, marginTop: 6 }}>
                {cuando.getFullYear()}
              </div>
            </div>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 36, padding: '22px 14px', ...PANEL, background: P.panelFuerte, boxShadow: '0 4px 18px rgba(90,70,45,.15)' }}>
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: CINZEL,
                  fontSize: 12,
                  letterSpacing: '0.3em',
                  fontWeight: 600,
                  color: P.tintaFuerte,
                  marginBottom: 14,
                }}
              >
                {themes.countdownPrefix.toUpperCase()}
              </div>
              <Countdown
                cellStyle={{ background: P.panelSuave, borderRadius: 12, padding: '10px 6px', flex: 1 }}
                labels={{
                  days: themes.countdownDays,
                  hours: themes.countdownHours,
                  mins: themes.countdownMins,
                  secs: themes.countdownSecs,
                }}
                labelStyle={{ fontSize: 10, letterSpacing: '0.4em', marginTop: 6, color: P.arena, fontWeight: 500 }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', gap: 6 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontSize: 40, fontWeight: 300, color: P.tinta, lineHeight: 1 }}
              />
            </div>
          </Reveal>
        )}

        {frase === '' ? null : (
          <Reveal>
            <div style={{ marginTop: 32, padding: '26px 22px', ...PANEL, textAlign: 'center' }}>
              <p style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.oro, lineHeight: 1.5, margin: 0 }}>{frase}</p>
            </div>
          </Reveal>
        )}

        {/* El busto de mármol con las esquinas florales colgando, como la boda botánica. */}
        <Reveal>
          <div style={{ marginTop: 40, position: 'relative' }}>
            <Image
              alt=""
              height={340}
              src={themeAsset('xv-isabelle', 'busto-marmol-optimized.avif')}
              style={{ width: '100%', height: 340, objectFit: 'contain', display: 'block' }}
              width={430}
            />
            <div aria-hidden style={{ position: 'absolute', top: -38, left: -38, zIndex: 3 }}>
              <FloralCorner side="left" tone="white" width={150} />
            </div>
            <div aria-hidden style={{ position: 'absolute', bottom: -38, right: -38, zIndex: 3 }}>
              <FloralCorner flipY side="right" tone="white" width={150} />
            </div>
          </div>
        </Reveal>

        {historia === '' ? null : (
          <Reveal>
            <div style={{ marginTop: 44, padding: '22px 20px', ...PANEL, textAlign: 'center' }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 38, color: P.tinta, lineHeight: 1 }}>
                {themes.myStory}
              </div>
              {anos === '' ? null : (
                <div style={{ fontSize: 11, letterSpacing: '0.4em', marginTop: 6, opacity: 0.6, fontWeight: 500 }}>
                  {anos}
                </div>
              )}
              <p style={{ fontSize: 16, fontStyle: 'italic', lineHeight: 1.6, marginTop: 18 }}>{historia}</p>
            </div>
          </Reveal>
        )}

        {hosts === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: '26px 22px', ...PANEL, textAlign: 'center' }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 28, color: P.oro }}>{hosts.label ?? ''}</div>
              {hosts.names.map((nombre) => (
                <div key={nombre} style={{ fontSize: 15, letterSpacing: '0.08em', marginTop: 10, fontWeight: 600 }}>
                  {nombre}
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {itinerary === undefined ? null : (
          <>
            <Reveal>
              <div style={{ marginTop: 44, textAlign: 'center' }}>
                <div style={{ fontFamily: CINZEL, fontSize: 13, letterSpacing: '0.4em', fontWeight: 600, marginBottom: 18 }}>
                  {themes.itinerary}
                </div>
              </div>
            </Reveal>
            <div style={{ padding: '10px 14px', ...PANEL }}>
              <BotanicalTimeline accent={P.tinta} discBg={P.marfil} items={itinerary} timeColor={P.oro} />
            </div>
          </>
        )}

        {/* El florero de mármol, antes del lugar. */}
        <Reveal>
          <div aria-hidden style={{ marginTop: 40 }}>
            <Image
              alt=""
              height={260}
              src={themeAsset('xv-isabelle', 'marmol-flores-optimized.avif')}
              style={{ width: '100%', height: 260, objectFit: 'contain', display: 'block' }}
              width={430}
            />
          </div>
        </Reveal>

        {ceremony === undefined && reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 22, padding: 28, ...PANEL, position: 'relative' }}>
              {[ceremony, reception].map((lugar, indice) =>
                lugar === undefined ? null : (
                  <div key={indice}>
                    {indice === 1 && ceremony !== undefined ? (
                      <div aria-hidden style={{ width: 40, height: 1, background: P.bronce, margin: '18px auto', opacity: 0.5 }} />
                    ) : null}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '0.3em', color: P.oro, fontWeight: 600 }}>
                        {lugar.label ?? (indice === 0 ? themes.ceremony : themes.reception)}
                      </div>
                      <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, marginTop: 4 }}>{lugar.place ?? ''}</div>
                      <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>{lugar.address ?? ''}</div>
                      <div style={{ fontSize: 13, marginTop: 4, color: P.oro }}>{lugar.time ?? ''}</div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Reveal>
        )}

        {map === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24, padding: 14, ...PANEL }}>
              <MapPreview
                accent={P.oro}
                border={P.filete}
                coords={map.coords ?? ''}
                label={map.label ?? ''}
                pinDot={P.marfil}
              />
            </div>
          </Reveal>
        )}

        {dressCode === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: '26px 20px', ...PANEL, textAlign: 'center' }}>
              <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '0.35em', fontWeight: 600, color: P.oro }}>
                {dressCode.note ?? themes.dressCode}
              </div>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 44, marginTop: 8 }}>{dressCode.title ?? ''}</div>
              <div style={{ fontSize: 13, marginTop: 6, fontStyle: 'italic', opacity: 0.75 }}>{dressCode.detail ?? ''}</div>
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <MusicPlayer
                accent={P.oro}
                artist={music.artist ?? ''}
                eyebrow={themes.songOfTheNight}
                playIconColor={P.marfil}
                textColor={P.tinta}
                track={music.track ?? ''}
              />
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 28, padding: '22px 20px', ...PANEL }}>
            <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '0.3em', color: P.oro, fontWeight: 600, marginBottom: 12 }}>
              {themes.gifts}
            </div>
            {slots.registry}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28, padding: '22px 20px', ...PANEL }}>
            <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '0.3em', color: P.oro, fontWeight: 600, marginBottom: 12 }}>
              {dictionary.title}
            </div>
            {slots.guest}
            {preview === true ? (
              <p style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7 }}>{themes.previewNotice}</p>
            ) : (
              slots.rsvp
            )}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28, padding: '22px 20px', ...PANEL }}>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.oro, textAlign: 'center', marginBottom: 12 }}>
              {themes.guestbook.toLowerCase()}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        <div style={{ marginTop: 28 }}>{slots.pass}</div>

        {closing === undefined ? null : (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 24, color: P.oro }}>{closing.text ?? ''}</div>
            {closing.signature === undefined ? null : (
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 40, marginTop: 4 }}>{closing.signature}</div>
            )}
          </div>
        )}

        <div aria-hidden style={{ position: 'relative', marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <Image
            alt=""
            height={220}
            src={themeAsset('xv-isabelle', 'piramide-hoja-optimized.avif')}
            style={{ width: 220, height: 'auto', display: 'block' }}
            width={220}
          />
        </div>
      </ThemeColumn>
    </article>
  )
}
