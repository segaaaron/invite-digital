import type { ThemeProps } from '../contract'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { WeddingMagicBg } from '../kit/backgrounds/WeddingMagicBg'
import { EnvelopeCover } from '../kit/covers/EnvelopeCover'
import { CARTA_DE_COLOR, PALETA as P } from './boda-ed.palette'

const MONO = 'var(--font-jetbrains-mono)'
const DISPLAY = 'var(--font-spectral)'

/**
 * «Editorial» — la boda compuesta como un número de revista, de `wedding-variants.jsx:557`.
 *
 * La cabecera es una mancheta, la foto es una portada, el itinerario es un sumario y el
 * código de vestimenta es un muestrario de color con su hexadecimal a la vista.
 *
 * **El índice se compone de lo que la invitación trae de verdad**, no de una lista escrita
 * a mano. La maqueta lo tenía clavado, y un índice que anuncia «P.06 Dress code» en una
 * boda que no cargó código de vestimenta es una página que promete algo que no está.
 */
export function BodaEdView({ content, dictionary, themes, slots, preview }: ThemeProps) {
  const { hero, quote, schedule, reception, map, itinerary, dressCode, gallery, closing } = content
  const portada = gallery?.[0]
  const interior = gallery?.[1]

  // El primer párrafo es la cita destacada; el resto, la columna con capitular.
  const [destacada = '', ...parrafos] = (quote?.text ?? '').split('\n\n')
  const historia = parrafos.join('\n\n')
  const capitular = historia.slice(0, 1)
  const resto = historia.slice(1)

  const indice = [
    quote === undefined ? null : { pagina: 'P.02', titulo: themes.ourStory },
    itinerary === undefined ? null : { pagina: 'P.04', titulo: themes.itinerary },
    dressCode === undefined ? null : { pagina: 'P.06', titulo: themes.dressCode },
    reception === undefined ? null : { pagina: 'P.08', titulo: themes.reception },
    { pagina: 'P.10', titulo: dictionary.title },
  ].filter((fila): fila is { pagina: string; titulo: string } => fila !== null)

  return (
    <article style={{ position: 'relative', background: P.papel, color: P.tinta, fontFamily: DISPLAY, minHeight: '100dvh' }}>
      {preview === true ? null : (
        <EnvelopeCover
          accent={P.terra}
          bg={P.papel}
          hint={themes.coverHint}
          label={themes.coverOpen}
          openLabel={themes.coverAria}
          textColor={P.tinta}
        />
      )}

      <WeddingMagicBg
        glowColors={[P.durazno, P.terra, P.crema]}
        intensity={0.6}
        palette={[P.papel, P.arena, P.crema, P.arcilla, P.papel]}
        petalColors={[P.crema, P.durazno, P.terra]}
        petalEdges={[P.terra, P.arcilla]}
        petals={22}
      />

      <ThemeColumn>
        {/* La mancheta. */}
        <div style={{ padding: '28px 24px 12px', borderBottom: `1.5px solid ${P.tinta}` }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.3em',
            }}
          >
            <span>{hero?.monogram ?? ''}</span>
            <span>$ ROMANTIC</span>
          </div>
          <div style={{ marginTop: 4, textAlign: 'center' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 56, fontWeight: 200, letterSpacing: '0.04em', lineHeight: 0.95 }}>
              VOWS
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', marginTop: 2 }}>
              · THE EDITORIAL ISSUE ·
            </div>
          </div>
        </div>

        {/* La portada. */}
        <div style={{ position: 'relative', height: 460, background: P.tinta, overflow: 'hidden' }}>
          <PhotoSlot
            bg="linear-gradient(135deg, #3a3530 0%, #6a5e50 100%)"
            border="none"
            color="rgba(241,237,228,0.5)"
            height="100%"
            label={portada?.label ?? themes.photoPlaceholder}
            radius={0}
            src={portada?.imageId === undefined ? undefined : `/media/${portada.imageId}`}
            width="100%"
          />
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 18,
              color: P.papel,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.4em',
              padding: '4px 10px',
              border: `1px solid ${P.papel}`,
            }}
          >
            COVER STORY
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: 18, right: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', color: P.papel, opacity: 0.85 }}>
              {hero?.eyebrow ?? themes.saveTheDate}
            </div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontStyle: 'italic',
                fontWeight: 200,
                fontSize: 64,
                color: P.papel,
                lineHeight: 0.9,
                letterSpacing: '-0.01em',
                marginTop: 6,
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
            <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 10, letterSpacing: '0.35em', color: P.papel }}>
              {hero?.serial ?? ''}
            </div>
          </div>
        </div>

        {/* El sumario, compuesto de lo que la invitación trae de verdad. */}
        <Reveal>
          <div style={{ padding: '26px 24px', borderBottom: `1px solid ${P.fileteMedio}` }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.4em', marginBottom: 14, opacity: 0.7 }}>
              FEATURED IN THIS ISSUE
            </div>
            {indice.map((fila) => (
              <div
                key={fila.pagina}
                style={{ display: 'flex', gap: 14, padding: '8px 0', borderBottom: `1px dotted ${P.filete}` }}
              >
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, width: 38 }}>{fila.pagina}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{fila.titulo}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <div style={{ padding: '32px 24px 0', position: 'relative' }}>
          {destacada === '' ? null : (
            <Reveal>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.terra }}>
                P.02 — {themes.ourStory}
              </div>
              <p
                style={{
                  fontFamily: DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 40,
                  fontWeight: 200,
                  lineHeight: 1.05,
                  marginTop: 8,
                  letterSpacing: '-0.01em',
                }}
              >
                “{destacada}”
              </p>
            </Reveal>
          )}

          {historia === '' ? null : (
            <Reveal>
              <div style={{ marginTop: 28, fontSize: 14, lineHeight: 1.65, color: P.tinta }}>
                {/* La capitular, que es lo que hace que se lea como una revista. */}
                <span
                  style={{
                    float: 'left',
                    fontFamily: DISPLAY,
                    fontSize: 64,
                    fontWeight: 200,
                    lineHeight: 0.85,
                    paddingRight: 8,
                    paddingTop: 4,
                    color: P.terra,
                  }}
                >
                  {capitular}
                </span>
                {resto}
              </div>
            </Reveal>
          )}
        </div>

        {interior === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 32, padding: '0 24px' }}>
              <PhotoSlot
                bg="rgba(170,110,78,0.06)"
                border="none"
                color="rgba(170,110,78,0.5)"
                height={360}
                label={interior.label}
                radius={0}
                src={interior.imageId === undefined ? undefined : `/media/${interior.imageId}`}
                width="100%"
              />
              <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', opacity: 0.65 }}>
                {interior.label}
              </div>
            </div>
          </Reveal>
        )}

        <div style={{ padding: '0 24px' }}>
          {itinerary === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 40 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.terra }}>
                  P.04 — {themes.itinerary}
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 200, lineHeight: 1, marginTop: 8 }}>
                  The order of <span style={{ fontStyle: 'italic' }}>events.</span>
                </div>
                <div style={{ marginTop: 24 }}>
                  {itinerary.map((fila, indiceFila) => (
                    <div
                      key={`${fila.time}-${fila.label}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '56px 1fr',
                        gap: 16,
                        padding: '14px 0',
                        borderBottom: indiceFila < itinerary.length - 1 ? `1px solid ${P.filete}` : 'none',
                      }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500, color: P.terra }}>{fila.time}</div>
                      <div>
                        <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18 }}>{fila.label}</div>
                        {fila.note === undefined ? null : (
                          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{fila.note}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {dressCode === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 40 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.terra }}>
                  P.06 — {dressCode.note ?? themes.dressCode}
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 200, lineHeight: 1, marginTop: 8 }}>
                  {dressCode.title ?? ''}
                </div>

                <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {CARTA_DE_COLOR.map((muestra) => (
                    <div key={muestra.nombre} style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          background: muestra.color,
                          border: `1px solid ${P.filete}`,
                        }}
                      />
                      <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em' }}>
                        {muestra.nombre.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 8, opacity: 0.6 }}>{muestra.color}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 12, fontStyle: 'italic', opacity: 0.75, lineHeight: 1.5 }}>
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
                  borderTop: `1.5px solid ${P.tinta}`,
                  borderBottom: `1.5px solid ${P.tinta}`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.45em', textAlign: 'center', color: P.terra }}>
                  · TIME LEFT IN ISSUE ·
                </div>
                <Countdown
                  labels={{
                    days: themes.countdownDays,
                    hours: themes.countdownHours,
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

          {reception === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 36 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.terra }}>
                  P.08 — {reception.label ?? themes.reception}
                </div>
                <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 36, fontWeight: 200, marginTop: 8 }}>
                  {reception.place ?? ''}
                </div>
                {reception.time === undefined ? null : (
                  <div style={{ fontSize: 13, marginTop: 6, opacity: 0.75 }}>{reception.time}</div>
                )}
                <div style={{ fontSize: 12, marginTop: 10, fontFamily: MONO, letterSpacing: '0.2em' }}>
                  {reception.address ?? ''}
                </div>
                {map === undefined ? null : (
                  <div style={{ marginTop: 14 }}>
                    <MapPreview
                      accent={P.terra}
                      border="rgba(170,110,78,0.3)"
                      coords={map.coords ?? ''}
                      label={map.label ?? ''}
                      pinDot={P.papel}
                    />
                  </div>
                )}
              </div>
            </Reveal>
          )}

          <Reveal>
            <div style={{ marginTop: 40 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.terra }}>
                P.10 — {dictionary.title}
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 200, lineHeight: 1, marginTop: 8 }}>
                Reply, <span style={{ fontStyle: 'italic' }}>please.</span>
              </div>
              <div style={{ marginTop: 18 }}>
                {preview === true ? (
                  <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.7 }}>{themes.previewNotice}</p>
                ) : (
                  slots.rsvp
                )}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.terra, marginBottom: 12 }}>
                {themes.gifts}
              </div>
              {slots.registry}
            </div>
          </Reveal>

          <Reveal>
            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.5em', color: P.terra, marginBottom: 12 }}>
                {themes.guestbook}
              </div>
              {slots.guestbook}
            </div>
          </Reveal>

          <div style={{ marginTop: 32 }}>{slots.pass}</div>

          {closing === undefined ? null : (
            <Reveal>
              <div style={{ marginTop: 50, padding: '32px 0', borderTop: `2px solid ${P.tinta}`, textAlign: 'center' }}>
                <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 28, fontWeight: 200 }}>
                  {closing.text ?? ''}
                </div>
                {closing.signature === undefined ? null : (
                  <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 10, letterSpacing: '0.4em', opacity: 0.65 }}>
                    {closing.signature}
                  </div>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </ThemeColumn>
    </article>
  )
}
