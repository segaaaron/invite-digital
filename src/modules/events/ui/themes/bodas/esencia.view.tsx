import Image from '@/shared/design/ui/ImagenQueAparece'
import { BRAND } from '@/shared/config/brand'
import { enlaceDeGoogle } from '@/shared/calendario/ics'
import { themeAsset } from '../assets'
import type { ThemeProps } from '../contract'
import { anfitrionesBoda } from '../../../domain/invitation-content'
import { comoLlegar } from '../../../domain/ubicacion'
import { pielDeRanuras, variablesDeRanuras } from '../kit/slot-skin'
import { CapaFija } from '../kit/CapaFija'
import { Countdown } from '../kit/Countdown'
import { MusicaFlotante } from '../kit/MusicaFlotante'
import { Reveal } from '../kit/Reveal'
import { EsenciaSobre } from './EsenciaSobre'
import { ParalajeDeEsencia } from './ParalajeDeEsencia'
import { FileteDeEsencia, IconoDeEsencia, RamaDeOlivo, RamitaDeOlivo, type ClaveDeIcono } from './esencia-ornamentos'
import { alfaDe, CARTA_DE_COLOR, PALETA as P } from './esencia.palette'

const SANS = 'var(--font-outfit)'
const SERIF = 'var(--font-cormorant)'

/**
 * Las cinco fotografías del diseño, en el orden de la maqueta: la del arco de «Nuestra historia»,
 * las cuatro cuadradas de debajo (la tercera es también la del paralaje) y la última, la del
 * mensaje. Las dos primeras van recortadas a rectángulo: el arco lo dibuja el CSS.
 */
const GALERIA = ['pareja-1-rect.avif', 'pareja-2-rect.avif', 'pareja-3.avif', 'pareja-4.avif', 'pareja-5.avif'] as const

/** El icono que acompaña a cada hora del itinerario, por su orden. */
const ICONOS: readonly ClaveDeIcono[] = ['church', 'glasses', 'glasses', 'plate', 'note', 'bouquet', 'star']

/**
 * «Esencia» — Valentina & Mateo, de `esencia.jsx` (`EsenciaWedding`, maqueta V4).
 *
 * Minimalista cálido: lino, tinta parda y oro viejo, con ramas de olivo dibujadas a línea. Se
 * abre con un sobre lacrado; debajo, la portada de siempre (el retrato redondo y los nombres) es
 * ya el primer bloque, y luego el mensaje, una fotografía en paralaje, los dos lugares, los padres
 * y padrinos, el itinerario, la cuenta atrás con «Agregar al calendario», la vestimenta, «Nuestra
 * historia» —hitos con su año y las fotos bajo un arco—, la confirmación con el libro de firmas,
 * la mesa de regalos y el cierre. La canción va en el botón flotante.
 *
 * Los avisos (`notes`) son dos cosas, por su orden: el primero es la línea de «solo adultos»
 * (con el pase del invitado al lado) y los demás, los hitos de «Nuestra historia», con el año de
 * título.
 */
/** La cuenta de muestra de la maqueta (`esencia.jsx`): solo en el escaparate y la vista previa. */
const CUENTA_DE_MUESTRA = (r: { banco: string; titular: string; cuenta: string }) =>
  [
    [r.banco, 'Banco Nacional'],
    [r.titular, 'Valentina Salinas'],
    [r.cuenta, '0123 4567 8901 2345'],
  ] as const

export function EsenciaView({ content, event, themes, slots, audioSrc, respondida, guestInfo, calendario }: ThemeProps) {
  const ROTULOS = themes.designs['esencia']
  const { hero, quote, hosts, schedule, ceremony, reception, map, itinerary, dressCode, gallery, notes, music, closing } = content
  // «#ValentinaYMateo2027»: los dos nombres y el año, sin espacios.
  const anioDeLaBoda = schedule === undefined ? '' : schedule.startsAt.slice(0, 4)
  const hashtag =
    hero?.nameA === undefined || hero.nameB === undefined || anioDeLaBoda === ''
      ? null
      : `#${[hero.nameA, 'Y', hero.nameB, anioDeLaBoda].join('').replace(/\s+/g, '')}`

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const etiqueta = event.locale === 'en' ? 'en-US' : 'es-BO'
  const fechaLarga =
    cuando === null || Number.isNaN(cuando.getTime())
      ? ''
      : cuando.toLocaleDateString(etiqueta, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
  // «20 · 12 · 2027», la del sobre: se lee del texto, sin pasar por la zona del servidor.
  const [anio = '', mes = '', dia = ''] = (schedule?.startsAt.slice(0, 10) ?? '').split('-')
  const fechaCorta = dia === '' ? '' : `${Number(dia)} · ${mes} · ${anio}`

  const llegarA = (lugar: { readonly place?: string; readonly address?: string } | undefined): string | null =>
    comoLlegar({ href: map?.href, coords: map?.coords }, [lugar?.place, lugar?.address].filter(Boolean).join(', '))

  const foto = (indice: number) =>
    gallery?.[indice]?.imageId === undefined ? themeAsset('esencia', GALERIA[indice] ?? 'pareja-1-rect.avif') : `/media/${gallery[indice].imageId}`

  const papeles = hosts === undefined ? null : anfitrionesBoda(hosts)
  const [soloAdultos, ...hitos] = notes ?? []
  const pase = guestInfo === undefined ? null : guestInfo.seats === 1 ? ROTULOS.paseUno : ROTULOS.paseVarios.replace('{n}', String(guestInfo.seats))

  // «Agregar al calendario»: el `.ics` del invitado, o Google Calendar en el escaparate.
  const alCalendario =
    calendario ??
    (schedule === undefined
      ? null
      : enlaceDeGoogle({
          uid: `esencia-${event.id}`,
          inicio: schedule.startsAt.slice(0, 16),
          minutos: 300,
          titulo: [hero?.nameA, hero?.nameB].filter(Boolean).join(' & ') || event.title,
          lugar: [reception?.place, reception?.address].filter(Boolean).join(', ') || null,
        }))

  // Las cuatro piezas que no dibuja este diseño heredan su paleta por variables CSS, en vez
  // de entrar marfiles. El «sí» del RSVP va en oro con la tinta parda encima (V4).
  const RANURAS = variablesDeRanuras(pielDeRanuras({ acento: P.oro, sobreAcento: P.tinta, tinta: P.tinta, display: SERIF, radio: 10 }))

  const cancion = audioSrc ?? (music?.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)

  return (
    <article
      style={{
        ...RANURAS,
        // Las píldoras de «Asistiré / No puedo» y el libro de firmas, en Outfit como la maqueta V4.
        ['--font-mono' as string]: SANS,
        ['--rsvp-fs' as string]: '14px',
        ['--rsvp-py' as string]: '14px',
        ['--libro-radio' as string]: '10px',
        ['--libro-fs' as string]: '14px',
        ['--libro-tracking' as string]: '0.12em',
        ['--libro-letra' as string]: SANS,
        position: 'relative',
        background: P.papel,
        color: P.tinta,
        fontFamily: SANS,
        lineHeight: 'normal',
        minHeight: 'var(--alto, 100dvh)',
        overflowX: 'clip',
      }}
    >
      <MusicaFlotante artist={music?.artist} audioSrc={cancion} track={music?.track} />
      <EsenciaSobre
        bgAsset={themeAsset('esencia', 'portada-lino.avif')}
        fecha={fechaCorta}
        hint={ROTULOS.tocaParaAbrir}
        monogram={hero?.monogram ?? ''}
        nameA={hero?.nameA}
        nameB={hero?.nameB}
        openLabel={themes.coverAria}
        rotulo={ROTULOS.nosCasamos}
      />

      {/* El lino, quieto detrás de todo y velado (V4). */}
      <CapaFija
        style={{
          backgroundImage: `url(${themeAsset('esencia', 'portada-lino.avif')})`,
          backgroundSize: 'auto 135%',
          backgroundPosition: 'center',
          opacity: 0.55,
        }}
        zIndex={0}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── 1 · La portada de siempre, ya como primer bloque ── */}
        <section
          style={{
            position: 'relative',
            minHeight: 'var(--alto, 100dvh)',
            maxWidth: 430,
            margin: '0 auto',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '32px 32px 40px',
          }}
        >
          <span aria-hidden style={{ position: 'absolute', top: 18, right: 0 }}>
            <RamaDeOlivo ancho={140} giro={15} opacidad={0.4} />
          </span>
          <span aria-hidden style={{ position: 'absolute', bottom: 10, left: 0 }}>
            <RamaDeOlivo ancho={140} espejo giro={20} opacidad={0.4} />
          </span>
          <span style={{ display: 'block', width: 130, height: 130, borderRadius: '50%', padding: 3, border: `2px solid ${P.oro}`, boxSizing: 'border-box', flexShrink: 0 }}>
            <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
              <Image
                alt=""
                aria-hidden
                fill
                sizes="130px"
                src={hero?.portraitImageId === undefined ? themeAsset('esencia', 'pareja-1.avif') : `/media/${hero.portraitImageId}`}
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
            </span>
          </span>
          {hero?.monogram === undefined ? null : (
            <p style={{ marginTop: 14, fontFamily: SERIF, fontSize: 21, letterSpacing: '0.1em', color: P.oro }}>{hero.monogram}</p>
          )}
          {hero?.eyebrow === undefined ? null : (
            <p style={{ marginTop: 14, fontWeight: 300, fontSize: 12, letterSpacing: '0.22em', color: P.gris, textTransform: 'uppercase' }}>{hero.eyebrow}</p>
          )}
          <h1 style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontWeight: 300 }}>
            <span style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 51, lineHeight: 1.05, color: P.tinta }}>{hero?.nameA}</span>
            {hero?.nameB === undefined ? null : (
              <>
                <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: P.oro }}>&amp;</span>
                <span style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 51, lineHeight: 1.05, color: P.tinta }}>{hero.nameB}</span>
              </>
            )}
          </h1>
          <FileteDeEsencia />
          {fechaLarga === '' ? null : <p style={{ fontWeight: 300, fontSize: 13, letterSpacing: '0.18em', color: P.gris }}>{fechaLarga}</p>}
          <span aria-hidden style={{ display: 'block', width: 1, height: 40, marginTop: 14, background: `linear-gradient(${P.oroClaro}, transparent)` }} />
          <p
            className="theme-quieto-si-reduce"
            style={{ marginTop: 10, fontSize: 11, letterSpacing: '0.2em', color: P.oro, animation: 'theme-esenciaFloat 2.5s ease-in-out infinite' }}
          >
            {themes.coverScroll}
          </p>
        </section>

        {/* ── 2 · El mensaje ── */}
        {quote === undefined ? null : (
          <Bloque abajo={24}>
            <RamitaDeOlivo style={{ top: 20, left: -15, transform: 'rotate(-10deg)' }} />
            <Reveal>
              <Rotulo>{ROTULOS.mensaje}</Rotulo>
              <FileteDeEsencia />
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: 22, lineHeight: 1.8, maxWidth: 300, margin: '0 auto' }}>{quote.text}</p>
              {hero?.nameA === undefined ? null : (
                <p style={{ marginTop: 20, fontSize: 11, color: P.tintaSuave }}>— {[hero.nameA, hero.nameB].filter(Boolean).join(' & ')}</p>
              )}
              <span style={{ display: 'block', width: 160, height: 220, position: 'relative', margin: '28px auto 0', borderRadius: 8, overflow: 'hidden' }}>
                <Image alt="" aria-hidden fill sizes="160px" src={foto(4)} style={{ objectFit: 'cover' }} />
              </span>
            </Reveal>
          </Bloque>
        )}

        {/* ── 2b · La fotografía en paralaje ── */}
        <ParalajeDeEsencia frase={ROTULOS.paralaje} src={foto(2)} />

        {/* ── 3 y 4 · Ceremonia y recepción ── */}
        {ceremony === undefined ? null : (
          <Bloque arriba={24} abajo={24}>
            <Lugar icono="church" llegar={llegarA(ceremony)} lugar={ceremony} rotulo={ROTULOS.ceremonia} verUbicacion={ROTULOS.verUbicacion} />
          </Bloque>
        )}
        {reception === undefined ? null : (
          <Bloque arriba={24} abajo={24}>
            <RamitaDeOlivo style={{ bottom: 30, right: -20, transform: 'rotate(30deg)' }} />
            <Lugar icono="glasses" llegar={llegarA(reception)} lugar={reception} rotulo={ROTULOS.recepcion} verUbicacion={ROTULOS.verUbicacion} />
          </Bloque>
        )}

        {/* ── 4b · Los padres y los padrinos ── */}
        {papeles === null || (papeles.novia.length === 0 && papeles.novio.length === 0 && papeles.padrinos.length === 0) ? null : (
          <Bloque arriba={24} abajo={24}>
            <Reveal>
              <Rotulo>{hosts?.label ?? ROTULOS.padres}</Rotulo>
              <FileteDeEsencia />
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, width: '100%' }}>
                {[
                  { titulo: themes.brideParents, nombres: papeles.novia },
                  { titulo: themes.groomParents, nombres: papeles.novio },
                ].map((grupo) => (
                  <div key={grupo.titulo}>
                    <p style={{ fontSize: 9.3, letterSpacing: '0.2em', color: P.oro, textTransform: 'uppercase' }}>{grupo.titulo}</p>
                    {grupo.nombres.map((nombre) => (
                      <p key={nombre} style={{ marginTop: 8, fontFamily: SERIF, fontSize: 18.4, lineHeight: 1.3 }}>
                        {nombre}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              {papeles.padrinos.length === 0 ? null : (
                <>
                  <span aria-hidden style={{ display: 'block', width: 40, height: 1, background: P.filete, margin: '26px auto 0' }} />
                  <p style={{ marginTop: 22, fontSize: 9.3, letterSpacing: '0.2em', color: P.oro, textTransform: 'uppercase' }}>{themes.godparents}</p>
                  <div style={{ marginTop: 4 }}>
                    {papeles.padrinos.map((nombre) => (
                      <p key={nombre} style={{ marginTop: 8, fontFamily: SERIF, fontSize: 18.4 }}>
                        {nombre}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </Reveal>
          </Bloque>
        )}

        {/* ── 5 · El itinerario: cada hora con su aro, su icono y lo que pasa ── */}
        {itinerary === undefined || itinerary.length === 0 ? null : (
          <Bloque arriba={24} abajo={24} lados={16}>
            <p style={{ fontWeight: 300, fontSize: 13, letterSpacing: '0.22em', color: P.tintaSuave, textTransform: 'uppercase' }}>{ROTULOS.itinerario}</p>
            <FileteDeEsencia grande margen="18px 0" />
            <div style={{ position: 'relative', marginTop: 10, width: 'fit-content', maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
              <span aria-hidden style={{ position: 'absolute', left: 13, top: 24, bottom: 24, width: 1, background: P.oroClaro }} />
              {itinerary.map((fila, indice) => (
                <Reveal delay={indice * 100} key={`${fila.time}-${fila.label}`}>
                  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '26px 46px 24px auto', alignItems: 'center', columnGap: 8, padding: '11px 0' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: P.papel,
                        border: `1px solid ${P.oroClaro}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span style={{ display: 'block', width: 10, height: 10, borderRadius: '50%', background: P.oro }} />
                    </span>
                    <span style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 19, lineHeight: 1, color: P.tinta, whiteSpace: 'nowrap' }}>{fila.time}</span>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <IconoDeEsencia grosor={1.25} nombre={ICONOS[indice % ICONOS.length] ?? 'star'} opacidad={1} tamano={24} />
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.3, color: P.tintaItinerario, whiteSpace: 'nowrap' }}>{fila.label}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </Bloque>
        )}

        {/* ── 6 · La cuenta atrás, en cuatro cajas de papel cálido, y el calendario ── */}
        {schedule === undefined ? null : (
          <Bloque arriba={24} abajo={24}>
            <Reveal>
              <Rotulo>{ROTULOS.faltan}</Rotulo>
              <FileteDeEsencia />
              <Countdown
                cellStyle={{
                  background: P.calido,
                  border: `1px solid ${alfaDe('oroBorde', 0.15)}`,
                  borderRadius: 4,
                  padding: '16px 13px',
                  minWidth: 65,
                }}
                labelStyle={{ fontSize: 8, letterSpacing: '0.15em', color: P.tintaSuave, marginTop: 2 }}
                labels={{ days: themes.countdownDays, hours: themes.countdownHours, mins: themes.countdownMins, secs: themes.countdownSecs }}
                rowStyle={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}
                targetISO={schedule.startsAt}
                valueStyle={{ fontFamily: SERIF, fontWeight: 400, fontSize: 32 }}
              />
              {alCalendario === null ? null : (
                <a href={alCalendario} rel="noopener noreferrer" style={{ ...BOTON_HUECO, marginTop: 22 }} target={calendario === undefined ? '_blank' : undefined}>
                  {ROTULOS.calendario}
                </a>
              )}
            </Reveal>
          </Bloque>
        )}

        {/* ── 7 · El código de vestimenta, con sus discos de color ── */}
        {dressCode === undefined ? null : (
          <Bloque arriba={24} abajo={24}>
            <Reveal>
              <Rotulo>{ROTULOS.vestimenta}</Rotulo>
              <FileteDeEsencia />
              {dressCode.title === undefined ? null : <p style={{ fontFamily: SERIF, fontSize: 21 }}>{dressCode.title}</p>}
              <span style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 18 }}>
                {(dressCode.colors ?? CARTA_DE_COLOR.map((c) => c.color)).map((color) => (
                  <span
                    key={color}
                    style={{
                      display: 'block',
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: color,
                      border: `1.5px solid ${color.toLowerCase() === '#f0eae0' ? '#d0c8bc' : P.filete}`,
                    }}
                    title={CARTA_DE_COLOR.find((c) => c.color === color)?.nombre ?? color}
                  />
                ))}
              </span>
              {dressCode.note === undefined ? null : (
                <p style={{ marginTop: 16, fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: P.tintaSuave }}>{dressCode.note}</p>
              )}
            </Reveal>
          </Bloque>
        )}

        {/* ── 8 · Nuestra historia: los hitos con su año, y las fotos bajo un arco ── */}
        <Bloque arriba={24} abajo={24}>
          <RamitaDeOlivo style={{ top: 15, right: -10, transform: 'rotate(15deg) scaleY(-1)' }} />
          <Reveal>
            <Rotulo>{ROTULOS.galeria}</Rotulo>
            <FileteDeEsencia />
            {hitos.length === 0 ? null : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {hitos.map((hito, indice) => (
                  <div key={`${hito.title ?? ''}-${hito.text ?? ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {indice === 0 ? null : <span aria-hidden style={{ display: 'block', width: 1, height: 22, background: P.oroClaro, margin: '10px 0' }} />}
                    {hito.title === undefined ? null : <p style={{ fontSize: 10, letterSpacing: '0.22em', color: P.oro }}>{hito.title}</p>}
                    {hito.text === undefined ? null : <p style={{ marginTop: 4, fontFamily: SERIF, fontSize: 21, lineHeight: 1.3 }}>{hito.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </Reveal>
          <div style={{ marginTop: 30, width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '4 / 4.6', borderRadius: '999px 999px 12px 12px', overflow: 'hidden', background: P.calido }}>
              <Image alt="" aria-hidden fill sizes="(max-width: 480px) 100vw, 430px" src={foto(0)} style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
              {[1, 2, 3, 4].map((indice) => (
                <span key={indice} style={{ position: 'relative', display: 'block', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: P.calido }}>
                  <Image alt="" aria-hidden fill sizes="(max-width: 480px) 50vw, 215px" src={foto(indice)} style={{ objectFit: 'cover' }} />
                </span>
              ))}
            </div>
          </div>
          {/* Design no lo tiene (PDF 9 oct): fuera de la muestra; en una invitación, si el plan trae las fotos. */}
          {slots.regalos === undefined ? null : <div style={{ marginTop: 18 }}>{slots.photos}</div>}
        </Bloque>

        {/* ── 9 · La confirmación, y debajo el libro de firmas ── */}
        <section style={{ maxWidth: 430, margin: '0 auto', padding: '24px 24px', boxSizing: 'border-box', textAlign: 'center' }}>
          <Reveal>
            <Rotulo>{ROTULOS.confirmaAntes}</Rotulo>
            <FileteDeEsencia />
            {respondida || event.rsvpDeadline === null ? null : (
              <p style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 21, color: P.tinta, margin: '0 0 22px' }}>
                {`${themes.rsvpBefore} ${new Intl.DateTimeFormat(etiqueta, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${event.rsvpDeadline}T00:00:00Z`))}`}
              </p>
            )}
            <div style={{ width: '100%', textAlign: 'left' }}>{slots.rsvp}</div>
            {slots.guestbook === null ? null : (
              <>
                <p style={{ marginTop: 30, fontFamily: SERIF, fontWeight: 400, fontSize: 18.4, color: P.tinta }}>{ROTULOS.firmas}</p>
                <div style={{ marginTop: 14, width: '100%' }}>{slots.guestbook}</div>
              </>
            )}
          </Reveal>
        </section>

        {/* ── 10 · La mesa de regalos ── */}
        <Bloque arriba={24} abajo={24}>
          <RamitaDeOlivo style={{ top: 20, right: -15, transform: 'rotate(25deg)' }} />
          <Rotulo>{ROTULOS.regalos}</Rotulo>
          <FileteDeEsencia />
          <span
            aria-hidden
            style={{ display: 'flex', width: 55, height: 55, borderRadius: '50%', border: `1.5px solid ${P.oroBorde}`, margin: '0 auto', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconoDeEsencia nombre="heart" opacidad={1} tamano={24} />
          </span>
          <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.8, color: P.tinta, maxWidth: 280, margin: '16px auto 0' }}>{ROTULOS.regalosTexto}</p>
          {/* En la muestra, el código y la tarjeta de la cuenta de la maqueta; en una invitación, lo que el
              cliente cargó (su QR, su cuenta con «Copiar» y la lista). */}
          {slots.regalos !== undefined ? (
            <div style={{ marginTop: 18, width: '100%' }}>{slots.registry}</div>
          ) : (
            <>
              <div style={{ width: 100, height: 100, margin: '18px auto 0', background: P.calido, border: `1.5px solid ${P.filete}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9.6, color: P.tintaSuave }}>{ROTULOS.codigoQr}</span>
              </div>
              <div style={{ marginTop: 18, width: '100%', maxWidth: 300, boxSizing: 'border-box', border: `1px solid ${P.filete}`, borderRadius: 10, padding: '18px 18px 16px', background: 'rgba(250,247,242,0.6)', textAlign: 'left', marginInline: 'auto' }}>
                {CUENTA_DE_MUESTRA(ROTULOS).map(([rotulo, valor], i) => (
                  <div key={rotulo} style={{ marginTop: i === 0 ? 0 : 12 }}>
                    <div style={{ fontSize: 8.8, letterSpacing: '0.2em', color: P.tintaSuave, textTransform: 'uppercase' }}>{rotulo}</div>
                    <div style={{ marginTop: 3, fontFamily: SERIF, fontSize: 18.4, color: P.tinta }}>{valor}</div>
                  </div>
                ))}
                <span style={{ display: 'inline-block', marginTop: 14, padding: '8px 16px', border: `1px solid ${P.filete}`, borderRadius: 30, fontSize: 9.9, letterSpacing: '0.15em', textTransform: 'uppercase', color: P.tinta }}>{ROTULOS.copiarCuenta}</span>
              </div>
            </>
          )}
        </Bloque>

        {/* ── 11 · Solo adultos, con los lugares del pase ── */}
        {soloAdultos === undefined && pase === null ? null : (
          <Bloque arriba={16} abajo={8}>
            <Reveal>
              <Rotulo>{[soloAdultos?.title, soloAdultos?.text, pase].filter(Boolean).join(' · ')}</Rotulo>
            </Reveal>
          </Bloque>
        )}

        {/* ── 12 · El cierre ── */}
        {closing === undefined ? null : (
          <Bloque arriba={24} abajo={32}>
            <RamitaDeOlivo ancho={200} opacidad={0.3} style={{ bottom: 60, left: '50%', transform: 'translateX(-50%)' }} />
            <Reveal>
              {closing.text === undefined ? null : <p style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 27, lineHeight: 1.35 }}>{closing.text}</p>}
              <FileteDeEsencia />
              {closing.signature === undefined ? null : <p style={{ fontSize: 12, color: P.tintaSuave }}>{closing.signature}</p>}
              {hashtag === null ? null : <p style={{ marginTop: 8, fontSize: 11, letterSpacing: '0.15em', color: P.oro }}>{hashtag}</p>}
            </Reveal>
          </Bloque>
        )}

        {/* A quién va dirigida y su pase, al final: es lo nuestro, y va donde no parte el
            diseño en dos. */}
        {/* Sin la línea «Pedro Zárate · Cupos reservados: 2» (PDF 9 oct): los lugares ya los dice «Solo adultos». */}
        <Bloque>
          <div style={{ width: '100%' }}>{slots.pass}</div>
        </Bloque>

        {/* La franja del pie: en la maqueta, «Invitación digital — tu marca». */}
        <div style={{ background: P.calido, borderTop: `1px solid ${P.filete}`, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 8, letterSpacing: '0.18em', color: P.tintaSuave }}>{`${ROTULOS.pie} — ${BRAND.siteName.toUpperCase()}`}</p>
        </div>
      </div>
    </article>
  )
}

/** El botón hueco de la maqueta (`outBtn`): «Ver ubicación ↗», «Agregar al calendario». */
const BOTON_HUECO: React.CSSProperties = {
  display: 'inline-block',
  padding: '11px 24px',
  border: `1px solid ${P.filete}`,
  borderRadius: 2,
  fontFamily: SANS,
  fontSize: 11,
  letterSpacing: '0.1em',
  color: P.tinta,
  textDecoration: 'none',
}

/** Una sección del diseño: columna centrada de 430 px con el aire de la maqueta. */
function Bloque({
  children,
  arriba = 40,
  abajo = 40,
  lados = 32,
}: {
  readonly children: React.ReactNode
  readonly arriba?: number
  readonly abajo?: number
  readonly lados?: number
}) {
  return (
    <section
      style={{
        position: 'relative',
        maxWidth: 430,
        margin: '0 auto',
        padding: `${arriba}px ${lados}px ${abajo}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {children}
    </section>
  )
}

/** El rótulo pequeño en versales que abre cada bloque. */
function Rotulo({ children }: { readonly children: React.ReactNode }) {
  return <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', color: P.tintaSuave, textTransform: 'uppercase' }}>{children}</p>
}

/** Ceremonia y recepción: el mismo bloque con su icono, su lugar, su hora y su botón. */
function Lugar({
  rotulo,
  verUbicacion,
  icono,
  lugar,
  llegar,
}: {
  readonly rotulo: string
  readonly icono: ClaveDeIcono
  readonly verUbicacion: string
  readonly lugar: { readonly label?: string; readonly place?: string; readonly time?: string }
  readonly llegar: string | null
}) {
  return (
    <Reveal>
      <Rotulo>{rotulo}</Rotulo>
      <FileteDeEsencia />
      <span style={{ display: 'flex', justifyContent: 'center' }}>
        <IconoDeEsencia nombre={icono} />
      </span>
      {lugar.label === undefined ? null : <p style={{ marginTop: 8, fontSize: 9, letterSpacing: '0.2em', color: P.oro, textTransform: 'uppercase' }}>{lugar.label}</p>}
      {lugar.place === undefined ? null : <p style={{ marginTop: 14, fontFamily: SERIF, fontSize: 24 }}>{lugar.place}</p>}
      {lugar.time === undefined ? null : (
        <span style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span aria-hidden style={{ display: 'block', width: 20, height: 1, background: P.filete }} />
          <span style={{ fontFamily: SERIF, fontSize: 18 }}>{lugar.time}</span>
          <span aria-hidden style={{ display: 'block', width: 20, height: 1, background: P.filete }} />
        </span>
      )}
      {llegar === null ? null : (
        <a href={llegar} rel="noreferrer" style={{ ...BOTON_HUECO, marginTop: 20 }} target="_blank">
          {verUbicacion}
        </a>
      )}
    </Reveal>
  )
}
