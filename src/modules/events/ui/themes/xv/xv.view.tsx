import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { BubblesRise } from '../kit/backgrounds/BubblesRise'
import { FloatingParticles } from '../kit/backgrounds/FloatingParticles'
import { MarBackground } from '../kit/backgrounds/MarBackground'
import { PremiumBubbles } from '../kit/backgrounds/PremiumBubbles'
import { SofiaCover } from './SofiaCover'
import { PALETA as P } from './xv.palette'

const MONO = 'var(--font-jetbrains-mono)'
const SANS = 'var(--font-dm-sans)'
const DISPLAY = 'var(--font-italiana)'
const CINZEL = 'var(--font-cinzel)'
const CALIGRAFIA = 'var(--font-great-vibes)'
const SERIF = 'var(--font-cormorant)'

/** El cristal esmerilado sobre el que se apoya cada bloque. Se repite doce veces. */
const CRISTAL = {
  background: P.vidrio,
  backdropFilter: 'blur(14px)',
  borderRadius: 16,
  border: `1px solid ${P.bordeVidrio}`,
  boxShadow: P.sombra,
} as const

/**
 * Los cuatro iconos del cronograma, por la clave que trae el itinerario.
 *
 * Tipados contra el manifiesto de imágenes: un nombre mal escrito aquí no compila, en vez
 * de dejar un hueco en el cronograma que solo se ve abriendo la invitación.
 */
type ArchivoXv = (typeof THEME_ASSETS)['xv'][number]

const ICONO_POR_DEFECTO: ArchivoXv = 'corona-icono1.avif'

const ICONOS_XV: Record<string, ArchivoXv> = {
  recepcion: 'invitacion-recepcion.avif',
  corona: 'corona-icono1.avif',
  fiesta: 'fiesta-icono.avif',
  despedida: 'despedida-icono.avif',
}

/**
 * «Bajo el Mar» — Sofía, de `invites-1.jsx:343`.
 *
 * Fondo fotográfico de mar con burbujas subiendo por delante y por detrás, y **todo el
 * texto sobre cristal esmerilado**: es lo único que lo deja legible sobre una fotografía
 * clara con lila encima.
 *
 * El cronograma va en dos columnas con una línea vertical en medio y un orden cruzado
 * —1, 3 a la izquierda; 2, 4 a la derecha— que es como la maqueta lo compone: se lee en
 * zigzag, no en columna.
 */
export function XvView({ content, dictionary, themes, slots, preview }: ThemeProps) {
  const { hero, quote, hosts, schedule, reception, map, itinerary, music, dressCode, notes, gallery, closing } = content
  const retrato = gallery?.[0]

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const dia = cuando === null ? '' : String(cuando.getDate())
  const mes = cuando === null ? '' : cuando.toLocaleDateString('es-BO', { month: 'long' })
  const horaEvento =
    cuando === null ? '' : `${String(cuando.getHours()).padStart(2, '0')}:${String(cuando.getMinutes()).padStart(2, '0')}`

  return (
    <article
      style={{
        position: 'relative',
        background: `linear-gradient(160deg, ${P.cielo} 0%, ${P.lavanda} 45%, ${P.rosa} 100%)`,
        color: P.tinta,
        fontFamily: SANS,
        minHeight: '100dvh',
      }}
    >
      {preview === true ? null : (
        <SofiaCover
          bgAsset={themeAsset('xv', 'bajo-el-mar1.avif')}
          crownAsset={themeAsset('xv', 'mar-corona-purple.avif')}
          eyebrow={hero?.eyebrow ?? ''}
          name={hero?.nameA ?? ''}
          openLabel={themes.coverAria}
          title={hero?.monogram ?? 'XV'}
        />
      )}

      <MarBackground opacity={1} theme="xv" variant="b" />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(252,250,255,.45)',
          backdropFilter: 'blur(3px) saturate(0.8)',
          pointerEvents: 'none',
        }}
      />
      <BubblesRise color="rgba(180,220,255,0.5)" count={24} seed={11} />
      <PremiumBubbles count={8} />
      <FloatingParticles char="✦" color={P.orquidea} count={18} seed={11} size={15} />

      <ThemeColumn style={{ padding: '44px 30px 60px' }}>
        <Reveal>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: MONO,
              fontSize: 13,
              letterSpacing: '0.3em',
              opacity: 0.85,
              color: P.orquidea,
              fontWeight: 700,
            }}
          >
            <span>{hero?.eyebrow ?? ''}</span>
            <span>{hero?.serial ?? ''}</span>
          </div>
        </Reveal>

        <Reveal delay={150} scale={0.9}>
          <div style={{ position: 'relative', marginTop: 30, textAlign: 'center', padding: '10px 0' }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: '-30px -20px',
                background: 'radial-gradient(ellipse 65% 60% at 50% 40%, rgba(255,252,248,.5) 0%, transparent 75%)',
                zIndex: -1,
              }}
            />
            <div
              style={{
                fontFamily: CINZEL,
                fontWeight: 500,
                fontSize: 92,
                lineHeight: 0.85,
                letterSpacing: '4px',
                color: P.uva,
                filter: 'drop-shadow(0 3px 12px rgba(74,26,110,.18))',
              }}
            >
              {hero?.monogram ?? 'XV'}
            </div>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 26,
                marginTop: 2,
                color: P.amatista,
                textTransform: 'uppercase',
                letterSpacing: '9px',
              }}
            >
              AÑOS
            </div>
            <h1
              style={{
                fontFamily: CALIGRAFIA,
                fontSize: 75,
                lineHeight: 1.45,
                marginTop: 2,
                color: P.violeta,
                textShadow: '0 2px 10px rgba(255,255,255,.7)',
                margin: 0,
              }}
            >
              {hero?.nameA ?? ''}
            </h1>
          </div>
        </Reveal>

        {quote === undefined ? null : (
          <Reveal>
            <div style={{ margin: '70px -10px 0' }}>
              <p
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  letterSpacing: '0.18em',
                  marginBottom: 40,
                  textTransform: 'uppercase',
                  color: P.uva,
                  fontWeight: 900,
                  opacity: 0.78,
                  textShadow: '0 2px 10px rgba(255,255,255,0.95), 0 1px 2px rgba(255,255,255,0.9)',
                }}
              >
                {quote.text}
              </p>
              <div style={{ position: 'relative' }}>
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: -20,
                    background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(90,70,130,.25) 0%, transparent 75%)',
                    zIndex: -1,
                  }}
                />
                <Image
                  alt=""
                  aria-hidden
                  height={300}
                  src={themeAsset('xv', 'mar-corona.avif')}
                  style={{
                    width: '78%',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                    filter: 'saturate(1.15) contrast(1.1) drop-shadow(0 8px 30px rgba(80,50,120,.35))',
                  }}
                  width={400}
                />
              </div>
            </div>
          </Reveal>
        )}

        <Reveal delay={150}>
          <div style={{ position: 'relative', margin: '-30px auto 0', width: 190, height: 300 }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50% 50% 20px 20px / 40% 40% 20px 20px',
                background: 'linear-gradient(160deg, #f8d7c8, #e8b3d0, #c98ad0)',
                filter: 'blur(1px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50% 50% 16px 16px / 38% 38% 16px 16px',
                overflow: 'hidden',
                background: P.blanco,
              }}
            >
              <PhotoSlot
                bg="transparent"
                border="none"
                color="rgba(74,26,110,0.45)"
                height="100%"
                label={retrato?.label ?? themes.portraitPlaceholder}
                objectPosition="center 6%"
                radius={0}
                src={retrato?.imageId === undefined ? themeAsset('xv', 'xv3.avif') : `/media/${retrato.imageId}`}
                width="100%"
              />
            </div>
          </div>

          {hosts === undefined ? null : (
            <div style={{ textAlign: 'center', marginTop: 46, padding: '26px 22px', ...CRISTAL }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.uva }}>{hosts.label ?? ''}</div>
              {hosts.names.map((nombre) => (
                <div
                  key={nombre}
                  style={{ fontSize: 15, letterSpacing: '0.08em', marginTop: 10, color: P.violetaHondo, fontWeight: 700 }}
                >
                  {nombre}
                </div>
              ))}
            </div>
          )}
        </Reveal>

        {cuando === null ? null : (
          <Reveal>
            <div style={{ marginTop: 60, textAlign: 'center', padding: '20px', ...CRISTAL, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 18 }}>
                <div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 56, lineHeight: 1, color: P.violetaHondo, fontWeight: 700 }}>
                    {dia}
                  </div>
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, marginTop: 4, color: P.uva, textTransform: 'capitalize' }}>
                    {mes}
                  </div>
                </div>
                <div aria-hidden style={{ fontFamily: DISPLAY, fontSize: 42, opacity: 0.5, color: P.violetaHondo }}>
                  ·
                </div>
                <div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 56, lineHeight: 1, color: P.violetaHondo, fontWeight: 700 }}>
                    {horaEvento}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: '0.3em', marginTop: 4, color: P.bruma, fontWeight: 700 }}>
                    {themes.countdownHours}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
              <Image
                alt=""
                aria-hidden
                height={220}
                src={themeAsset('xv', 'vestido-solo.avif')}
                style={{ width: 160, height: 'auto', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.6))' }}
                width={160}
              />
            </div>
            <div style={{ marginTop: 20, textAlign: 'center', fontFamily: CALIGRAFIA, fontSize: 40, color: P.uva }}>
              {themes.countdownPrefix}
            </div>
            <Countdown
              cellStyle={{
                textAlign: 'center',
                padding: '14px 4px',
                background: P.vidrioFuerte,
                backdropFilter: 'blur(10px)',
                borderRadius: 12,
                border: `1.5px solid ${P.lila}`,
                boxShadow: '0 2px 12px rgba(74,26,110,.15)',
              }}
              labels={{
                days: themes.countdownDays,
                hours: themes.countdownHours,
                mins: themes.countdownMins,
                secs: themes.countdownSecs,
              }}
              labelStyle={{
                fontSize: 9,
                marginTop: 6,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: P.bruma,
                fontWeight: 700,
              }}
              rowStyle={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}
              targetISO={schedule.startsAt}
              valueStyle={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1, color: P.violetaHondo, fontWeight: 700 }}
            />
          </Reveal>
        )}

        <Reveal>
          <div
            style={{
              marginTop: 32,
              textAlign: 'center',
              padding: '26px 20px',
              ...CRISTAL,
              borderRadius: 12,
              border: `1.5px solid ${P.lila}`,
            }}
          >
            {slots.guest}
          </div>
        </Reveal>

        {reception === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 32,
                padding: '22px 20px',
                ...CRISTAL,
                background: P.vidrioFuerte,
                border: `1.5px solid ${P.lila}`,
                boxShadow: P.sombraFuerte,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div
                  style={{
                    fontFamily: CALIGRAFIA,
                    fontSize: 30,
                    color: P.violetaHondo,
                    fontWeight: 700,
                    textShadow: '0 1px 3px rgba(255,255,255,.9)',
                  }}
                >
                  {reception.label ?? themes.reception}
                </div>
                <Image
                  alt=""
                  aria-hidden
                  height={48}
                  src={themeAsset('xv', 'castillo-purpura.avif')}
                  style={{ width: 48, height: 'auto', flexShrink: 0 }}
                  width={48}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 8,
                  fontSize: 13,
                  color: P.malva,
                  fontWeight: 700,
                }}
              >
                <span>{reception.place ?? ''}</span>
                <span style={{ fontFamily: MONO, color: P.uva }}>{reception.time ?? ''}</span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: P.malva, fontWeight: 600 }}>{reception.address ?? ''}</div>
            </div>
          </Reveal>
        )}

        {map === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 20,
                padding: 14,
                ...CRISTAL,
                background: P.vidrioFuerte,
                border: `1.5px solid ${P.lila}`,
                boxShadow: P.sombraFuerte,
              }}
            >
              <MapPreview
                accent={P.violetaHondo}
                border={P.amatista}
                coords={map.coords ?? ''}
                label={map.label ?? ''}
                pinDot={P.blanco}
                pinRing={P.blanco}
                roadWidth={1.5}
              />
            </div>
          </Reveal>
        )}

        {itinerary === undefined ? null : (
          <Reveal>
            <div
              style={{
                fontFamily: CALIGRAFIA,
                fontSize: 40,
                textAlign: 'center',
                color: P.violetaHondo,
                marginTop: 28,
                marginBottom: 10,
              }}
            >
              {themes.itinerary}
            </div>
            <div
              style={{
                padding: '30px 22px',
                borderRadius: 20,
                background: P.vidrioFuerte,
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${P.lila}`,
                boxShadow: P.sombraFuerte,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>
                <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1.5, background: P.lilaFuerte }} />
                {itinerary.map((fila, indice) => (
                  <div
                    key={`${fila.time}-${fila.label}`}
                    style={{
                      textAlign: 'center',
                      padding: '18px 14px',
                      // El orden cruzado de la maqueta: se lee en zigzag, no en columna.
                      order: indice < 2 ? indice * 2 : (indice - 2) * 2 + 1,
                    }}
                  >
                    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,.85)',
                          border: `1.5px solid ${P.lila}`,
                          boxShadow: '0 2px 10px rgba(74,26,110,.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Image
                          alt=""
                          aria-hidden
                          height={48}
                          src={themeAsset('xv', ICONOS_XV[fila.imageId ?? ''] ?? ICONO_POR_DEFECTO)}
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                          width={48}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: P.violetaHondo,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        marginTop: 10,
                        paddingBottom: 10,
                        borderBottom: `1.5px solid ${P.lilaFuerte}`,
                      }}
                    >
                      {fila.label}
                    </div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 22, marginTop: 10, color: P.uva, fontWeight: 700 }}>
                      {fila.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {music === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  borderRadius: 999,
                  background: P.vidrioFuerte,
                  backdropFilter: 'blur(12px)',
                  boxShadow: `inset 0 0 0 1.5px ${P.lila}, ${P.sombraFuerte}`,
                }}
              >
                <MusicPlayer
                  accent={P.uva}
                  artist={music.artist ?? ''}
                  artistColor={P.malva}
                  eyebrow={themes.songOfTheNight}
                  playBg={P.uva}
                  playIconColor={P.blanco}
                  textColor={P.tinta}
                  track={music.track ?? ''}
                  trackColor={P.violetaHondo}
                />
              </div>
            </div>
          </Reveal>
        )}

        {dressCode === undefined ? null : (
          <Reveal>
            <div
              style={{
                marginTop: 28,
                textAlign: 'center',
                padding: '26px 18px',
                ...CRISTAL,
                background: P.vidrioFuerte,
                border: `1.5px solid ${P.lila}`,
                boxShadow: P.sombraFuerte,
              }}
            >
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.uva }}>
                {dressCode.title ?? themes.dressCode}
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.35em', opacity: 0.85, marginTop: 6, color: P.uva, fontWeight: 700 }}>
                {dressCode.note ?? ''}
              </div>
              <Image
                alt=""
                aria-hidden
                height={220}
                src={themeAsset('xv', 'icono-vestimenta.avif')}
                style={{
                  width: '70%',
                  maxWidth: 220,
                  height: 'auto',
                  marginTop: 14,
                  filter: 'contrast(1.12) drop-shadow(0 10px 28px rgba(74,26,110,.28))',
                }}
                width={220}
              />
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 10, color: P.uva, fontWeight: 600 }}>
                {dressCode.detail ?? ''}
              </div>
            </div>
          </Reveal>
        )}

        {(notes ?? []).map((aviso) => (
          <Reveal key={aviso.title}>
            <div
              style={{
                marginTop: 28,
                textAlign: 'center',
                padding: '34px 24px',
                ...CRISTAL,
                background: P.vidrioFuerte,
                border: `1.5px solid ${P.lila}`,
                boxShadow: P.sombraFuerte,
              }}
            >
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: P.violetaHondo }}>{aviso.title}</div>
              {aviso.text === undefined ? null : (
                <p
                  style={{
                    marginTop: 20,
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    fontSize: 16,
                    lineHeight: 1.8,
                    color: P.violeta,
                    maxWidth: '78%',
                    marginInline: 'auto',
                  }}
                >
                  {aviso.text}
                </p>
              )}
            </div>
          </Reveal>
        ))}

        <Reveal>
          <div style={{ marginTop: 28, padding: '22px 20px', ...CRISTAL, border: `1.5px solid ${P.lila}` }}>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.uva, textAlign: 'center', marginBottom: 12 }}>
              {themes.gifts}
            </div>
            {slots.registry}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28, padding: '22px 20px', ...CRISTAL, border: `1.5px solid ${P.lila}` }}>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.uva, textAlign: 'center', marginBottom: 12 }}>
              {dictionary.title}
            </div>
            {preview === true ? (
              <p style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7, textAlign: 'center' }}>{themes.previewNotice}</p>
            ) : (
              slots.rsvp
            )}
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 28, padding: '22px 20px', ...CRISTAL, border: `1.5px solid ${P.lila}` }}>
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.uva, textAlign: 'center', marginBottom: 12 }}>
              {themes.guestbook}
            </div>
            {slots.guestbook}
          </div>
        </Reveal>

        <div style={{ marginTop: 28 }}>{slots.pass}</div>

        <Reveal>
          <div style={{ marginTop: 20, textAlign: 'center', padding: '20px 10px 40px' }}>
            <div
              aria-hidden
              style={{
                width: '40%',
                height: 1.5,
                background: `linear-gradient(90deg, transparent, ${P.lilaFuerte}, transparent)`,
                margin: '0 auto 34px',
              }}
            />
            <div style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: P.uva, marginTop: 36 }}>
              {hero?.eyebrow ?? ''}
            </div>
            {closing?.signature === undefined ? null : (
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 56, color: P.violetaHondo, marginTop: 10 }}>
                {closing.signature}
              </div>
            )}
            <div style={{ width: '65%', margin: '36px auto 28px' }}>
              <Image
                alt=""
                aria-hidden
                height={300}
                src={themeAsset('xv', 'concha-recortada.avif')}
                style={{ width: '100%', height: 'auto', display: 'block', filter: 'drop-shadow(0 10px 30px rgba(74,26,110,.28))' }}
                width={400}
              />
            </div>
            {closing?.text === undefined ? null : (
              <p
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 21,
                  lineHeight: 1.8,
                  color: P.violeta,
                  textShadow: '0 2px 8px rgba(255,255,255,.9)',
                }}
              >
                {closing.text}
              </p>
            )}
            <div aria-hidden style={{ marginTop: 26, fontSize: 20, color: P.amatista, opacity: 0.7 }}>
              ◆
            </div>
          </div>
        </Reveal>
      </ThemeColumn>
    </article>
  )
}
