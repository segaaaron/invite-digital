import { HeroSeal } from '../art/HeroSeal'
import type { ThemeProps } from '../contract'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { PhotoCollage } from '../kit/PhotoCollage'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { WeddingMagicBg } from '../kit/backgrounds/WeddingMagicBg'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { PALETA as P } from './civil.palette'

const MONO = 'var(--font-jetbrains-mono)'
const DISPLAY = 'var(--font-spectral)'

/**
 * «Civil» — Lucía & Andrés, de `invites-3.jsx:7`.
 *
 * La boda civil leída como un acta: sello de lacre, dos círculos enormes de trazo fino
 * saliéndose por los bordes, y los testigos de ley en su propio bloque.
 *
 * Es el único diseño de la colección con dos lugares de peso igual —el registro y el
 * brindis—, así que la ceremonia y la recepción van en dos columnas y no una debajo de la
 * otra.
 */
/**
 * Cómo llama **este** diseño a sus secciones.
 *
 * No son traducciones —para eso está el diccionario—, son la voz del diseño, y por eso
 * viven con él. Lo que no esté aquí cae al diccionario.
 */
const ROTULOS = { gifts: 'REGALO DE BODA', seal: '· UNIDOS ·', cover: 'UNIÓN CIVIL' } as const

export function CivilView({ content, dictionary, themes, slots }: ThemeProps) {
  const { hero, hosts, schedule, ceremony, reception, map, gallery, closing } = content

  // Los cuatro bloques que no dibuja este diseño —RSVP, mesa de regalos, respuesta del
  // libro de firmas y pase— heredan su paleta por variables CSS, en vez de entrar marfiles.
  const RANURAS = variablesDeRanuras(pielDeRanuras({ sobreAcento: P.blanco, acento: P.violeta, display: DISPLAY, tinta: P.tinta }))

  return (
    <article style={{ ...RANURAS, position: 'relative', background: P.papel, color: P.tinta, fontFamily: DISPLAY, minHeight: '100dvh', overflowX: 'clip' }}>
      <EnvelopeCover
        accent={P.violeta}
        bg={P.papel}
        hint={themes.coverHint}
        label={ROTULOS.cover}
        openLabel={themes.coverAria}
        textColor={P.tinta}
      />

      <WeddingMagicBg
        glowColors={[P.lavanda, P.lila, P.blanco]}
        intensity={0.7}
        palette={[P.papel, P.lila, P.blanco, P.hielo, P.papel]}
        petalColors={[P.blanco, P.lila, P.lavanda]}
        petalEdges={[P.violeta, P.lavanda]}
        petals={20}
      />

      {/* Los dos círculos que se salen del papel: es lo que da el aire arquitectónico. */}
      <div
        aria-hidden
        style={{ position: 'absolute', left: -60, top: -60, width: 380, height: 380, borderRadius: '50%', border: `1px solid ${P.filete}` }}
      />
      <div
        aria-hidden
        style={{ position: 'absolute', right: -100, top: 200, width: 480, height: 480, borderRadius: '50%', border: `1px solid ${P.fileteSuave}` }}
      />

      <ThemeColumn style={{ padding: '44px 30px 60px' }}>
        <Reveal>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em', color: P.violeta }}>
            {hero?.eyebrow ?? themes.saveTheDate}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <h1 style={{ marginTop: 70, fontSize: 84, fontWeight: 200, lineHeight: 0.9, letterSpacing: '-0.03em' }}>
            {hero?.nameA ?? ''}
            {hero?.nameB === undefined ? null : (
              <>
                <br />
                <span style={{ fontStyle: 'italic', color: P.violeta }}>{hero.monogram ?? '&'}</span> {hero.nameB}
              </>
            )}
          </h1>
          <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em' }}>{hero?.serial ?? ''}</div>
        </Reveal>

        <Reveal>
          <div style={{ margin: '24px -10px 0' }}>
            {/* El sello lleva «UNIDOS», no el rótulo de la cabecera: repetirlo lo pinta dos
                veces en la misma pantalla, y en la maqueta no está. */}
            <HeroSeal accent={P.violeta} label={ROTULOS.seal} monogram={hero?.monogram ?? '&'} />
          </div>
        </Reveal>

        {gallery === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              <PhotoCollage
                border={P.filete}
                photos={gallery.map((casilla) => ({
                  label: casilla.label,
                  src: casilla.imageId === undefined ? undefined : `/media/${casilla.imageId}`,
                }))}
                polaroidBg={P.blanco}
                polaroidSlotBg="rgba(29,29,31,0.06)"
                polaroidSlotColor="#a99"
                slotBg="rgba(124,92,255,0.05)"
                slotColor="rgba(255,255,255,0.5)"
                stripBg={P.tinta}
                variant="asymmetric"
              />
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
                labelStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.violeta, marginTop: 4 }}
                rowStyle={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontSize: 34, fontWeight: 300 }}
              />
            </div>
          </Reveal>
        )}

        {ceremony === undefined && reception === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {[ceremony, reception].map((lugar, indice) =>
                lugar === undefined ? null : (
                  <div key={indice}>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.violeta }}>
                      {lugar.label ?? (indice === 0 ? themes.ceremony : themes.reception)}
                    </div>
                    <div style={{ fontSize: 26, marginTop: 8, fontStyle: 'italic' }}>{lugar.time ?? ''}</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>{lugar.place ?? ''}</div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{lugar.address ?? ''}</div>
                  </div>
                ),
              )}
            </div>
          </Reveal>
        )}

        {map === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <MapPreview
                accent={P.violeta}
                border="rgba(124,92,255,0.3)"
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

        {hosts === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: '18px 0', borderTop: `1px solid ${P.fileteSuave}` }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.violeta }}>
                {hosts.label ?? ''}
              </div>
              <div style={{ marginTop: 12, fontStyle: 'italic', fontSize: 18, lineHeight: 1.4 }}>
                {hosts.names.map((nombre) => (
                  <span key={nombre} style={{ display: 'block' }}>
                    {nombre}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div style={{ marginTop: 28, padding: 20, background: 'rgba(124,92,255,0.05)', border: `1px solid ${P.filete}` }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.violeta, marginBottom: 12 }}>
              {ROTULOS.gifts}
            </div>
            {slots.registry}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.violeta, marginBottom: 12 }}>
              {dictionary.title}
            </div>
            {slots.guest}
            {slots.rsvp}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: P.violeta, marginBottom: 12 }}>
              {themes.guestbook}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        <div style={{ marginTop: 28 }}>{slots.pass}</div>

        {closing === undefined ? null : (
          <div style={{ marginTop: 36, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontStyle: 'italic', opacity: 0.75 }}>{closing.text ?? ''}</div>
            {closing.signature === undefined ? null : (
              <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.violeta }}>
                {closing.signature}
              </div>
            )}
          </div>
        )}
      </ThemeColumn>
    </article>
  )
}
