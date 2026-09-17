import Image from 'next/image'
import type { ThemeProps } from '../contract'
import { anfitrionesXv } from '../../../domain/invitation-content'
import { variablesDeRanuras } from '../kit/slot-skin'
import { Countdown } from '../kit/Countdown'
import { MapPreview } from '../kit/MapPreview'
import { PaletaDeColores } from '../kit/PaletaDeColores'
import { MarcoQr } from '../kit/MarcoQr'
import { MusicPlayer } from '../kit/MusicPlayer'
import { PhotoSlot } from '../kit/PhotoSlot'
import { Reveal } from '../kit/Reveal'
import { ThemeColumn } from '../kit/ThemeColumn'
import { FloatingParticles } from '../kit/backgrounds/FloatingParticles'
import { PremiumBubbles } from '../kit/backgrounds/PremiumBubbles'
import { DividerOrnamental } from './DividerOrnamental'
import { FileteDegradado, SobreDeLinea } from './PiezasXv'
import type { PielXv } from './piel-xv'
import { PIEL_XV } from './xv.skin'

const MONO = 'var(--font-jetbrains-mono)'
const SANS = 'var(--font-dm-sans)'
const DISPLAY = 'var(--font-italiana)'
const CINZEL = 'var(--font-cinzel)'
const CALIGRAFIA = 'var(--font-great-vibes)'
const SERIF = 'var(--font-cormorant)'

/**
 * El esqueleto que comparten los dos diseños marinos, «Bajo el Mar» y «Encanto Marino».
 *
 * Son la **misma composición con dos pieles**: uno en pasteles sobre fotografía de mar,
 * otro en dorado sobre negro con partitura de fondo. Copiarlo dos veces serían seiscientas
 * líneas duplicadas donde un arreglo hay que hacerlo dos veces y se hace una.
 *
 * Todo lo que cambia —colores, imágenes, portada— entra por `piel`. Todo lo que cambia por
 * evento entra por `content`. Lo que queda aquí es la composición, que es lo mismo en los
 * dos: cabecera, titular, dedicatoria, retrato, padres, fecha destacada, cuenta atrás,
 * saludo, recepción, mapa, cronograma en zigzag, música, vestimenta, avisos y cierre.
 *
 * Todo el texto va sobre cristal esmerilado: es lo único que lo deja legible sobre una
 * fotografía a sangre, sea clara con lila o negra con oro.
 */
export function XvSharedView({
  content,
  event,
  dictionary,
  themes,
  slots,
  guestInfo,
  audioSrc,
  respondida = false,
  piel,
}: ThemeProps & { piel: PielXv }) {
  const P = piel.paleta
  const CRISTAL = piel.cristal
  const { hero, quote, hosts, schedule, reception, map, itinerary, music, dressCode, notes, gallery, closing } = content
  const retrato = gallery?.[0]

  // El primer aviso es el de los sobres, y va **dentro** de la tarjeta de regalos con su
  // sobre de línea; los demás llevan tarjeta propia entre ornamentos. Es la composición de
  // la maqueta, y el orden de `notes` lo fija el diseño, igual que «Editorial» indexa el
  // suyo para la tarjeta de fotografías.
  const [avisoDeSobres, ...avisosSueltos] = notes ?? []

  // El texto del aviso puede traer dos párrafos: el primero es la intro de la tarjeta —«Que
  // estés ahí, celebrando conmigo…»— y el segundo, la nota corta bajo el sobre. Con uno
  // solo, todo es intro y el sobre se queda sin pie. Es el mismo reparto por línea en
  // blanco que ya usa la cita de «Editorial».
  const [introDeRegalos, notaDeSobres] = (avisoDeSobres?.text ?? '').split('\n\n')

  // El cierre son dos textos, como en la maqueta: la despedida —arriba, sobre la firma— y
  // la bendición del final, tras la concha. Van en un solo campo separados por una línea en
  // blanco; con uno solo, es la despedida y no hay bendición.
  const [despedida, bendicion] = (closing?.text ?? '').split('\n\n')

  // El morado con el que la maqueta escribe la cita de portada y el código de vestimenta,
  // más hondo que el de los demás rótulos. Los diseños que no lo distinguen caen en `uva`.
  const UVA_HONDA = P.uvaHonda ?? P.uva

  // El color de cada pieza: el del diseño si lo declara, y si no el de «Bajo el Mar», que
  // es de quien salió este esqueleto.
  const Z = piel.piezas ?? {}
  const SERIAL = Z.serial ?? P.orquidea
  const MONOGRAMA = Z.monograma ?? P.uva
  const ANIOS = Z.anios ?? P.amatista
  const NOMBRE = Z.nombre ?? P.violeta
  const FECHA = Z.fecha ?? P.violetaHondo
  const ROTULO_TENUE = Z.rotuloTenue ?? P.bruma
  const FALTAN = Z.faltan ?? P.uva
  const TITULO = Z.tituloSeccion ?? P.violetaHondo
  const LUGAR_NOMBRE = Z.lugarNombre ?? P.malva
  const LUGAR_DIRECCION = Z.lugarDireccion ?? P.malva
  const LUGAR_HORA = Z.lugarHora ?? P.uva
  const MAPA = Z.mapa ?? P.violetaHondo
  const ITIN_ROTULO = Z.itinerarioRotulo ?? P.violetaHondo
  const ITIN_HORA = Z.itinerarioHora ?? P.uva
  const INVITADO_TITULO = Z.invitadoTitulo ?? P.violetaHondo

  // La fecha límite, en el idioma del evento. Sin plazo, la línea no se pinta: prometer
  // «confírmame antes del …» sin fecha detrás es peor que no decir nada.
  const plazo =
    respondida || event.rsvpDeadline === null
      ? null
      : new Intl.DateTimeFormat(event.locale === 'en' ? 'en-GB' : 'es-BO', {
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }).format(new Date(`${event.rsvpDeadline}T00:00:00Z`))

  const cuando = schedule === undefined ? null : new Date(schedule.startsAt)
  const dia = cuando === null ? '' : String(cuando.getDate())
  const mes = cuando === null ? '' : cuando.toLocaleDateString('es-BO', { month: 'long' })
  const horaEvento =
    cuando === null ? '' : `${String(cuando.getHours()).padStart(2, '0')}:${String(cuando.getMinutes()).padStart(2, '0')}`

  // Los cuatro bloques que no dibuja el diseño —RSVP, mesa de regalos, respuesta del libro
  // de firmas y pase— heredan su paleta por variables CSS. Aquí no hace falta el velo que
  // se calcula para las bodas: estas pieles ya traen su vidrio esmerilado.
  const RANURAS = variablesDeRanuras({
    // El «ENVIAR» de la maqueta es morado macizo, no del lila de los filetes.
    boton: P.violeta,
    sobreBoton: Z.botonTinta ?? P.blanco,
    etiqueta: P.uva,
    caligrafia: CALIGRAFIA,
    sobreAcento: P.blanco,
    acento: P.lila,
    acentoHondo: P.lilaFuerte,
    campo: P.vidrioFuerte,
    hueco: P.vidrioFuerte,
    linea: P.bordeVidrio,
    panel: P.vidrio,
    // La tinta de los campos del formulario es la fuerte del diseño, que es la que la
    // maqueta usa ahí; `tinta` a secas es la del cuerpo, más clara.
    tinta: P.violetaHondo,
    tintaSuave: P.malva,
    tintaTenue: P.bruma,
  })

  return (
    <article
      style={{
        ...RANURAS,
        position: 'relative',
        background: piel.fondoBase,
        color: P.tinta,
        fontFamily: SANS,
        minHeight: '100dvh',
        // `clip`, no `hidden`. Los dos recortan lo que sangra —las esquinas florales, los
        // ramos de fondo, los círculos que se salen del papel—, pero `hidden` convierte el
        // elemento en **contenedor de scroll**: `overflow-y` pasa a `auto` por
        // especificación y los fondos `sticky` se anclan a él en vez de a la ventana.
        // `clip` recorta sin crear ese contenedor, que es exactamente lo que hace falta.
        overflowX: 'clip',
      }}
    >
      {piel.portada({
        eyebrow: hero?.eyebrow ?? '',
        name: hero?.nameA ?? '',
        title: hero?.monogram ?? 'XV',
        foto: hero?.coverImageId === undefined ? undefined : `/media/${hero.coverImageId}`,
        openLabel: themes.coverAria,
        line1: themes.coverInviteLine1,
        line2: themes.coverInviteLine2,
        enter: themes.coverEnter,
      })}

      {/*
        La fotografía de fondo cubre **la invitación entera**, no la primera pantalla.
        Se acortó una vez a una pantalla, tras renderizar la maqueta en un armazón propio
        donde el fondo se iba con el scroll; la invitación de referencia que enseña el
        usuario la lleva de arriba abajo —al final se ven los peces y los corales del pie de
        la fotografía—, y cuando las dos fuentes no coinciden manda la que se ve. El velo la
        acompaña: es lo que deja legible el texto sobre ella.
      */}
      {/*
        El fondo que acompaña al scroll va **`sticky`**, no `fixed`.
        
        `fixed` se ancla al elemento con `transform` más cercano, y el marco de teléfono
        lleva `translateZ(0)`: dentro de él el fondo se desplazaba con el contenido y
        desaparecía a la segunda pantalla, dejando la invitación negra. `sticky` con
        `height: 100dvh` y `margin-bottom: -100dvh` se queda pegado arriba y no ocupa
        espacio, que es el mismo truco que ya usan los fondos de las bodas.
      */}
      {piel.fondoFijo === true ? (
        <div
          aria-hidden
          style={{ position: 'sticky', top: 0, height: '100dvh', marginBottom: '-100dvh', overflow: 'hidden' }}
        >
          {piel.fondo}
        </div>
      ) : (
        piel.fondo
      )}
      <div
        aria-hidden
        style={{
          position: piel.fondoFijo === true ? 'sticky' : 'absolute',
          ...(piel.fondoFijo === true
            ? { top: 0, height: '100dvh', marginBottom: '-100dvh' }
            : { inset: 0 }),
          background: piel.velo,
          // Sin desenfoque cuando el fondo va fijo: sobre una partitura dorada, el velo
          // borroso apaga el oro y deja el texto sin contraste por los dos lados.
          backdropFilter: piel.fondoFijo === true ? undefined : 'blur(3px) saturate(0.8)',
          pointerEvents: 'none',
        }}
      />
      {piel.veloInferior === undefined ? null : (
        <div
          aria-hidden
          style={
            piel.fondoFijo === true
              ? {
                  position: 'sticky',
                  top: 0,
                  height: '100dvh',
                  marginBottom: '-100dvh',
                  background: `linear-gradient(180deg, transparent 55%, ${piel.veloInferior})`,
                  pointerEvents: 'none',
                }
              : {
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(180deg, transparent 55%, ${piel.veloInferior})`,
                  pointerEvents: 'none',
                }
          }
        />
      )}
      {piel.burbujas}

      {/* Lo que el diseño abre a sangre, antes de la barra. */}
      {piel.apertura}
      {/*
        Las burbujas **solo las trae «Bajo el Mar»**, que es el diseño del fondo del mar.
        En la maqueta aparecen una vez, en `QuinceInvite` (`invites-1.jsx:351-352`), y en
        ninguno de los otros seis.

        Estaban **encendidas por defecto** y apagadas solo por Natalia, así que Mascarada,
        Jardín Encantado, Fantasía, Gala Real y Noche Estrellada soltaban burbujas de mar
        en mitad de un bosque, un salón y una máscara veneciana. Ahora se piden: quien no
        lo declare no las pinta, y el olvido cae del lado que no inventa nada.
      */}
      {piel.burbujasPremium === true ? <PremiumBubbles count={8} /> : null}
      {/*
        Las partículas se reparten por **la pantalla**, no por los seis mil píxeles de la
        invitación entera: `FloatingParticles` las coloca en porcentajes de su contenedor, y
        con el artículo completo detrás salían dieciocho chispas repartidas por todo el
        scroll —dos o tres por pantalla, prácticamente invisibles—. En la maqueta su
        contenedor es la ventana, y por eso se ven. Va `sticky` y sin ocupar sitio, como el
        fondo: dentro del marco de teléfono, un `fixed` se ancla al marco y no a la ventana.
      */}
      {/*
        Y las chispas **solo las traen dos**: «Bajo el Mar» con 18 lilas
        (`invites-1.jsx:353`) y «Encanto Marino» con 14 notas doradas (`:598`). Los otros
        cinco no llevan ninguna en la maqueta.

        Esto estaba con los valores de la marina por defecto —`'✦'`, `P.orquidea`, 18—, así
        que quien no declarara nada heredaba las chispas lilas de una invitación del fondo
        del mar. Sin defectos: el que no las declara no las pinta.
      */}
      {piel.particulas === undefined ? null : (
        <div
          aria-hidden
          style={{ position: 'sticky', top: 0, height: '100dvh', marginBottom: '-100dvh', overflow: 'hidden', pointerEvents: 'none' }}
        >
          <FloatingParticles
            char={piel.particulas.char}
            color={piel.particulas.color}
            count={piel.particulas.count}
            seed={11}
            size={15}
          />
        </div>
      )}

      <ThemeColumn style={{ padding: '44px 30px 60px' }}>
        {/*
          El encabezado. Seis diseños usan el compartido —barra, «XV», «AÑOS» y nombre—; el
          que trae `piel.encabezado` pinta el suyo y no ve ninguno de los dos bloques de
          abajo. Es el caso de «Jardín Encantado», cuya maqueta no escribe ni el monograma
          ni el año.
        */}
        {piel.encabezado === undefined ? null : (
          <Reveal delay={150} scale={0.9}>
            {piel.encabezado({
              eyebrow: hero?.eyebrow ?? '',
              name: hero?.nameA ?? '',
              serial: hero?.serial ?? '',
            })}
          </Reveal>
        )}

        {piel.encabezado !== undefined ? null : (
        <Reveal>
          {/* «Encanto Marino» pone un velo oscuro difuminado bajo esta barra: sobre las notas
              doradas del fondo, el oro de la barra se perdía. */}
          <div style={{ position: 'relative' }}>
            {Z.veloTexto === undefined ? null : (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: '-10px -18px',
                  background: Z.veloTexto,
                  filter: 'blur(14px)',
                  borderRadius: 20,
                  zIndex: -1,
                }}
              />
            )}
            {/* Alto fijo: vacía, la barra se encogía y el titular subía hasta el borde. */}
            <div
              data-testid="xv-barra-superior"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                minHeight: '1.6em',
                fontFamily: MONO,
                fontSize: 13,
                letterSpacing: '0.3em',
                opacity: 0.85,
                color: SERIAL,
                fontWeight: 700,
              }}
            >
              <span>{hero?.eyebrow ?? ''}</span>
              <span>{hero?.serial ?? ''}</span>
            </div>
          </div>
        </Reveal>
        )}

        {piel.encabezado !== undefined ? null : (
        <Reveal delay={150} scale={0.9}>
          <div style={{ position: 'relative', marginTop: 30, textAlign: 'center', padding: '10px 0' }}>
            {/* El halo del titular: blanco en la marina, negro en la partitura, ninguno donde
                el diseño escribe con sombra. */}
            {Z.haloTitular === 'none' ? null : (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: '-30px -20px',
                  background:
                    Z.haloTitular ?? 'radial-gradient(ellipse 65% 60% at 50% 40%, rgba(255,252,248,.5) 0%, transparent 75%)',
                  filter: Z.haloTitularFiltro,
                  zIndex: -1,
                }}
              />
            )}
            <div
              style={{
                fontFamily: CINZEL,
                fontWeight: 500,
                fontSize: 92,
                lineHeight: 0.85,
                letterSpacing: '4px',
                color: MONOGRAMA,
                ...(Z.monogramaDegradado === undefined
                  ? {}
                  : {
                      background: Z.monogramaDegradado,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }),
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
                color: ANIOS,
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
                color: NOMBRE,
                textShadow: Z.sombraNombre ?? Z.sombraTexto ?? '0 2px 10px rgba(255,255,255,.7)',
                margin: 0,
              }}
            >
              {hero?.nameA ?? ''}
            </h1>
          </div>
        </Reveal>
        )}

        {quote === undefined || piel.citaMarco === undefined ? null : (
          <Reveal>
            <div style={{ marginTop: 50 }}>
              {piel.citaMarco(
                <p
                  style={{
                    textAlign: 'center',
                    fontFamily: Z.cita?.fuente ?? SANS,
                    fontSize: Z.cita?.size ?? 13,
                    letterSpacing: Z.cita?.espaciado ?? '0.18em',
                    lineHeight: Z.cita?.interlineado,
                    textTransform: Z.cita?.mayusculas === false ? undefined : 'uppercase',
                    color: Z.cita?.color ?? UVA_HONDA,
                    fontWeight: Z.cita?.weight ?? 900,
                    textShadow: Z.cita?.sombra,
                    margin: 0,
                  }}
                >
                  {quote.text}
                </p>,
              )}
            </div>
          </Reveal>
        )}

        {quote === undefined || piel.citaMarco !== undefined ? null : (
          <Reveal>
            {/*
              La cita va suelta sobre el fondo en la marina y **dentro de un panel** en
              «Mascarada», donde es texto claro sobre una fotografía: ahí no lleva ni la
              opacidad ni la sombra blanca, que son de un fondo claro.
            */}
            <div
              style={
                Z.cita?.panel === true
                  ? {
                      marginTop: 50,
                      padding: Z.cita.relleno ?? '26px 22px',
                      maxWidth: Z.cita.maxAncho,
                      marginInline: Z.cita.maxAncho === undefined ? undefined : 'auto',
                      ...CRISTAL,
                    }
                  : { margin: '70px -10px 0', position: 'relative' }
              }
            >
              {Z.veloTexto === undefined ? null : (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: '-14px -10px',
                    background: Z.veloTexto,
                    filter: 'blur(16px)',
                    borderRadius: 24,
                    zIndex: -1,
                  }}
                />
              )}
              <p
                style={{
                  textAlign: 'center',
                  fontFamily: Z.cita?.fuente ?? SANS,
                  fontStyle: Z.cita?.cursiva === true ? 'italic' : undefined,
                  fontSize: Z.cita?.size ?? 13,
                  letterSpacing: Z.cita?.espaciado ?? '0.18em',
                  lineHeight: Z.cita?.interlineado,
                  marginBottom: piel.corona === undefined ? 0 : 40,
                  textTransform: Z.cita?.mayusculas === false ? undefined : 'uppercase',
                  color: Z.cita?.color ?? UVA_HONDA,
                  fontWeight: Z.cita?.weight ?? 900,
                  opacity: Z.cita?.opacidad ?? 0.78,
                  textShadow:
                    Z.cita?.sombra ?? '0 2px 10px rgba(255,255,255,0.95), 0 1px 2px rgba(255,255,255,0.9)',
                }}
              >
                {quote.text}
              </p>
              {/* La pieza va **fuera** del panel: los tres diseños de gala la ponen suelta
                  entre la cita y los padres, no dentro del recuadro. */}
              {piel.corona === undefined || Z.cita?.panel === true ? null : (
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
                    src={piel.corona}
                    style={{
                      width: piel.arte?.coronaWidth ?? '78%',
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto',
                      filter:
                        piel.arte?.coronaFiltro ??
                        'saturate(1.15) contrast(1.1) drop-shadow(0 8px 30px rgba(80,50,120,.35))',
                    }}
                    width={400}
                  />
                </div>
              )}
            </div>
            {piel.corona === undefined || Z.cita?.panel !== true ? null : (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '40px auto 0' }}>
                <Image
                  alt=""
                  aria-hidden
                  height={300}
                  src={piel.corona}
                  style={{
                    width: piel.arte?.coronaWidth ?? 260,
                    height: 'auto',
                    filter: piel.arte?.coronaFiltro ?? 'drop-shadow(0 10px 24px rgba(0,0,0,.5))',
                  }}
                  width={400}
                />
              </div>
            )}
          </Reveal>
        )}

        {/*
          El marco del retrato solo existe donde el diseño lo pone. «Encanto Marino»,
          «Noche Estrellada» y «Encanto Musical» no lo tienen en la maqueta, y pintarlo
          vacío dejaba un arco blanco con borde rosa —el de la marina— en mitad de una
          invitación dorada o de plata.
        */}
        <Reveal delay={150}>
          {/* El arco sube bajo la corona donde la hay; sin ella, la maqueta lo baja 40. */}
          {piel.retrato === undefined && retrato?.imageId === undefined ? null : (
          // El retrato sube a encajar bajo la corona **solo si la corona se pinta**, y se pinta
          // con la frase: sin frase subía igual y pisaba el nombre.
          <div data-retrato style={{ position: 'relative', margin: piel.corona === undefined || quote === undefined ? '40px auto 0' : '-30px auto 0', width: 190, height: 300 }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50% 50% 20px 20px / 40% 40% 20px 20px',
                background: piel.arte?.marcoRetrato ?? 'linear-gradient(160deg, #f8d7c8, #e8b3d0, #c98ad0)',
                filter: piel.arte?.marcoRetratoFiltro ?? (piel.arte?.marcoRetrato === undefined ? 'blur(1px)' : undefined),
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
                src={retrato?.imageId === undefined ? piel.retrato : `/media/${retrato.imageId}`}
                width="100%"
              />
            </div>
          </div>
          )}

          {hosts === undefined ? null : (
            <div style={{ textAlign: 'center', marginTop: 46, padding: '26px 22px', ...CRISTAL }}>
              <div style={{ fontFamily: Z.anfitriones?.font ?? CALIGRAFIA, fontSize: Z.anfitriones?.size ?? 30, fontWeight: Z.anfitriones?.weight ?? 400, color: Z.anfitriones?.color ?? P.uva }}>{hosts.label ?? ''}</div>
              {anfitrionesXv(hosts).padres.map((nombre) => (
                <div
                  key={nombre}
                  style={{ fontSize: 15, letterSpacing: '0.08em', marginTop: 10, color: Z.anfitrionesNombres ?? P.violetaHondo, fontWeight: 700 }}
                >
                  {nombre}
                </div>
              ))}
              {/* Los padrinos, aparte y con su rótulo: antes iban mezclados con los padres. */}
              {anfitrionesXv(hosts).padrinos.length === 0 ? null : (
                <>
                  <div style={{ fontSize: 10, letterSpacing: '0.3em', marginTop: 22, color: Z.anfitriones?.color ?? P.uva, fontWeight: 600 }}>
                    {themes.godparents}
                  </div>
                  {anfitrionesXv(hosts).padrinos.map((nombre) => (
                    <div
                      key={nombre}
                      style={{ fontSize: 15, letterSpacing: '0.08em', marginTop: 10, color: Z.anfitrionesNombres ?? P.violetaHondo, fontWeight: 700 }}
                    >
                      {nombre}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </Reveal>

        {cuando === null ? null : (
          <Reveal>
            <div style={{ marginTop: 60, textAlign: 'center', padding: '20px', ...CRISTAL, position: 'relative' }}>
              {/* «Bajo el Mar» y «Encanto Marino» enmarcan esta tarjeta con dos filetes por
                  arriba y por abajo, cada uno doblado por una línea blanca. */}
              {Z.fechaFiletes !== true ? null : (
                <>
                  <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${P.lilaFuerte}, transparent)` }} />
                  <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 1.5, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)' }} />
                  <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${P.lilaFuerte}, transparent)` }} />
                  <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)' }} />
                </>
              )}
              {Z.fechaOrnamento === false ? null : piel.ornamento}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 18 }}>
                <div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 56, lineHeight: 1, color: FECHA, fontWeight: 700 }}>
                    {dia}
                  </div>
                  <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, marginTop: 4, color: FECHA, textTransform: 'capitalize' }}>
                    {mes}
                  </div>
                </div>
                <div aria-hidden style={{ fontFamily: DISPLAY, fontSize: 42, opacity: 0.5, color: FECHA }}>
                  ·
                </div>
                <div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 56, lineHeight: 1, color: FECHA, fontWeight: 700 }}>
                    {horaEvento}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: '0.3em', marginTop: 4, color: ROTULO_TENUE, fontWeight: 700 }}>
                    {themes.countdownHours}
                  </div>
                </div>
              </div>
              {Z.fechaOrnamento === false ? null : piel.ornamento}
            </div>
          </Reveal>
        )}

        {schedule === undefined ? null : (
          <Reveal>
            {/* La pieza va encima del «Faltan» en la marina y la partitura, y debajo en los
                tres diseños de gala: es donde la pone cada maqueta. */}
            {Z.relojDebajo === true || piel.reloj === undefined ? null : (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
                <Image
                  alt=""
                  aria-hidden
                  height={220}
                  src={piel.reloj}
                  style={{ width: piel.arte?.relojWidth ?? 160, height: 'auto', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.6))' }}
                  width={160}
                />
              </div>
            )}
            <div
              style={{
                marginTop: Z.relojDebajo === true ? 44 : 20,
                textAlign: 'center',
                fontFamily: CALIGRAFIA,
                fontSize: 40,
                color: FALTAN,
                textShadow: Z.sombraTexto,
              }}
            >
              {themes.countdownPrefix}
            </div>
            {Z.relojDebajo === undefined || piel.reloj === undefined ? null : (
              <Image
                alt=""
                aria-hidden
                height={220}
                src={piel.reloj}
                style={{
                  width: piel.arte?.relojWidth ?? 100,
                  height: 'auto',
                  display: 'block',
                  margin: '10px auto 4px',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.5))',
                }}
                width={160}
              />
            )}
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
                color: ROTULO_TENUE,
                fontWeight: 700,
              }}
              rowStyle={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}
              targetISO={schedule.startsAt}
              valueStyle={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1, color: FECHA, fontWeight: 700 }}
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
            {/* El saludo, compuesto como en la maqueta: la línea, el nombre en caligrafía,
                «reservamos», el número y «lugar para ti». Con la línea ya hecha de la
                ranura no se puede componer así, por eso el invitado llega como dato. */}
            {guestInfo === undefined ? (
              slots.guest
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: SANS, fontSize: 15, color: INVITADO_TITULO }}>{themes.yourPresence}</div>
                <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, marginTop: 12, color: P.uva }}>
                  {guestInfo.label}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, marginTop: 16, color: ROTULO_TENUE }}>{themes.weSaved}</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 40, marginTop: 4, color: P.tinta, fontWeight: 700 }}>
                  {guestInfo.seats}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, marginTop: 4, color: ROTULO_TENUE }}>{themes.seatForYou}</div>
              </div>
            )}
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
              {/* «Bosque Encantado» la compone centrada —pieza arriba, hora al pie—; las
                  demás en fila, con el título a la izquierda y la pieza a la derecha. */}
              {Z.recepcionCentrada === true ? (
                <div style={{ textAlign: 'center', padding: '10px 0 22px' }}>
                  <Image
                    alt=""
                    aria-hidden
                    height={62}
                    src={piel.castillo}
                    style={{
                      width: piel.arte?.castilloWidth ?? 62,
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto 20px',
                      filter: piel.arte?.castilloFiltro,
                    }}
                    width={62}
                  />
                  <div
                    style={{
                      fontFamily: CALIGRAFIA,
                      fontSize: Z.tituloRecepcionSize ?? 32,
                      color: TITULO,
                      fontWeight: 700,
                      textShadow: Z.sombraTexto,
                    }}
                  >
                    {reception.label ?? themes.reception}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 14, color: LUGAR_NOMBRE, fontWeight: 700, textShadow: Z.sombraTexto }}>
                    {reception.place ?? ''}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 6, color: LUGAR_DIRECCION, fontWeight: 600, textShadow: Z.sombraTexto }}>
                    {reception.address ?? ''}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      letterSpacing: '0.15em',
                      color: LUGAR_HORA,
                      marginTop: 16,
                      textShadow: Z.sombraTexto,
                    }}
                  >
                    {reception.time ?? ''}
                  </div>
                  {piel.ornamento}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div
                      style={{
                        fontFamily: CALIGRAFIA,
                        fontSize: Z.tituloRecepcionSize ?? 30,
                        color: TITULO,
                        fontWeight: 700,
                        textShadow: Z.sombraTexto ?? '0 1px 3px rgba(255,255,255,.9)',
                      }}
                    >
                      {reception.label ?? themes.reception}
                    </div>
                    <Image
                      alt=""
                      aria-hidden
                      height={48}
                      src={piel.castillo}
                      style={{
                        width: piel.arte?.castilloWidth ?? 48,
                        height: 'auto',
                        flexShrink: 0,
                        filter: piel.arte?.castilloFiltro,
                      }}
                      width={48}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      fontSize: 13,
                      color: LUGAR_NOMBRE,
                      fontWeight: 700,
                      textShadow: Z.sombraTexto,
                    }}
                  >
                    <span>{reception.place ?? ''}</span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: Z.lugarHoraSize,
                        fontWeight: Z.lugarHoraPeso,
                        color: LUGAR_HORA,
                      }}
                    >
                      {reception.time ?? ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: LUGAR_DIRECCION, fontWeight: 600, textShadow: Z.sombraTexto }}>
                    {reception.address ?? ''}
                  </div>
                </>
              )}
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
                accent={MAPA}
                border={P.amatista}
                coords={map.coords ?? ''}
                directionsLabel={themes.viewLocation}
                href={map.href}
                respaldo={[reception?.place, reception?.address].filter(Boolean).join(', ')}
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
                color: TITULO,
                marginTop: 28,
                marginBottom: 10,
              }}
            >
              {piel.rotulos?.itinerary ?? themes.itinerary}
            </div>
            <div
              style={{
                padding: '30px 22px',
                borderRadius: 20,
                // El mismo fondo que las demás tarjetas del diseño, **no uno más opaco**.
                // Estaba con `vidrioFuerte` y en la maqueta ninguno de los siete lo usa:
                // todos los itinerarios se pintan con `...panel`, o con su valor exacto
                // cuando el diseño lo escribe en línea. En «Noche Estrellada» eso es .82
                // donde va .6, y la tarjeta se veía casi maciza sobre el fondo.
                background: P.vidrio,
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${P.lila}`,
                boxShadow: P.sombra,
              }}
            >
              {/*
                Se lee **en orden**, por filas: recepción y acto central arriba, fiesta y
                despedida abajo. El `.jsx` de la maqueta trae el arreglo cruzado —fiesta en
                segundo lugar— y aquí se reprodujo con un `order`; la invitación de
                referencia que enseña el usuario lo pinta cronológico, y cuando las dos
                fuentes no coinciden manda la que se ve.
              */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>
                {/* La divisoria la llevan todos menos «Gala Real», cuya rejilla la maqueta
                    abre sin ella (`invites-1.jsx:2075`). */}
                {piel.itinerarioDivisoria === false ? null : (
                  <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1.5, background: P.lilaFuerte }} />
                )}
                {itinerary.map((fila, i) => (
                  <div
                    key={`${fila.time}-${fila.label}`}
                    style={{
                      textAlign: 'center',
                      padding: '18px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      // «Gala Real» estira la quinta fila a las dos columnas para que
                      // «Cierre» quede centrado y no suelto a la izquierda.
                      gridColumn:
                        piel.itinerarioUltimaCentrada === true &&
                        i === itinerary.length - 1 &&
                        itinerary.length % 2 === 1
                          ? '1 / -1'
                          : 'auto',
                    }}
                  >
                    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: Z.discoItinerario ?? 'rgba(255,255,255,.85)',
                          border: `1.5px solid ${Z.discoBorde ?? P.lila}`,
                          boxShadow: '0 2px 10px rgba(74,26,110,.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/*
                          El dibujo manda sobre la imagen, **fila a fila**. «Gala Real»
                          trae cuatro iconos como PNG de plata y **dibuja** el quinto —la
                          torta—, que es lo que hace su maqueta. Con la condición puesta
                          sobre `iconoNodo` a secas, declararlo para una sola fila dejaba
                          las otras cuatro sin icono: se preguntaba si el diseño tiene
                          dibujos, no si tiene **este**.
                        */}
                        {piel.iconoNodo?.(fila.imageId) ?? (
                        <Image
                          alt=""
                          aria-hidden
                          height={64}
                          src={piel.icono(fila.imageId)}
                          style={
                            piel.iconoRedondo === true
                              ? { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }
                              : {
                                  // Cada icono con la medida que le da la maqueta, y su filtro
                                  // si lo lleva: a un tamaño único la corona se veía diminuta
                                  // y el coche, gigante.
                                  width: piel.iconoTam?.(fila.imageId) ?? 48,
                                  height: piel.iconoTam?.(fila.imageId) ?? 48,
                                  objectFit: 'contain',
                                  filter: piel.iconoFiltro?.(fila.imageId),
                                }
                          }
                          width={64}
                        />
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: Z.itinerarioRotuloSize ?? 12,
                        color: ITIN_ROTULO,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        marginTop: 10,
                        paddingBottom: Z.itinerarioSeparador === undefined || Z.itinerarioSeparador === 'linea' ? 10 : 0,
                        borderBottom:
                          Z.itinerarioSeparador === undefined || Z.itinerarioSeparador === 'linea'
                            ? `1.5px solid ${P.lilaFuerte}`
                            : undefined,
                      }}
                    >
                      {fila.label}
                    </div>
                    {/* «Mascarada» y «Bosque Encantado» separan aquí con su ornamento, no con
                        una línea; las tres de gala no separan. */}
                    {Z.itinerarioSeparador === 'ornamento' ? piel.ornamento : null}
                    <div
                      style={{
                        fontFamily: DISPLAY,
                        fontSize: Z.itinerarioHoraSize ?? 22,
                        marginTop: 10,
                        color: ITIN_HORA,
                        fontWeight: 700,
                      }}
                    >
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
                  accent={Z.musicaAcento ?? P.uva}
                  artist={music.artist ?? ''}
                  artistColor={Z.musicaArtista ?? P.malva}
                  audioSrc={audioSrc ?? (music.audioMediaId === undefined ? undefined : `/media/${music.audioMediaId}`)}
                  eyebrow={themes.songOfTheNight}
                  playBg={P.uva}
                  playIconColor={P.blanco}
                  textColor={P.tinta}
                  track={music.track ?? ''}
                  trackColor={Z.musicaPista ?? P.violetaHondo}
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
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: UVA_HONDA }}>
                {dressCode.title ?? piel.rotulos?.dressCode ?? themes.dressCode}
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.35em',
                  opacity: 0.85,
                  marginTop: 6,
                  color: Z.vestimentaNota ?? UVA_HONDA,
                  fontWeight: 700,
                }}
              >
                {dressCode.note ?? ''}
              </div>
              {piel.vestimentaNodo ?? (
              <Image
                alt=""
                aria-hidden
                height={220}
                src={piel.vestimenta}
                style={{
                  width: piel.arte?.vestimentaWidth ?? '70%',
                  maxWidth: 220,
                  height: 'auto',
                  margin: '14px auto 0',
                  filter: 'contrast(1.12) drop-shadow(0 10px 28px rgba(74,26,110,.28))',
                }}
                width={220}
              />
              )}
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 10, color: Z.vestimentaDetalle ?? UVA_HONDA, fontWeight: 600 }}>
                {dressCode.detail ?? ''}
              </div>
              <PaletaDeColores borde="currentColor" colores={dressCode.colors} />
            </div>
          </Reveal>
        )}

        {/*
          La tarjeta de regalos es la que la maqueta titula «Detalles que Abrazan», y lleva
          dentro el primer aviso: la intro, el sobre de línea, «Lluvia de Sobres» y su nota,
          y debajo la mesa de verdad. El aviso de los sobres no es una tarjeta aparte —lo
          era, y quedaba un rótulo suelto encima de otra tarjeta con el mismo tema—.
        */}
        {/*
          Sin tarjeta, la mesa de regalos va sola. La tarjeta es decoración de la maqueta y
          se pide; la ranura es la mesa de verdad —reservar un regalo— y no se puede perder
          con ella: lo hacía en «Noche Estrellada», «Encanto Musical» y «Gala Real».
        */}
        {piel.regalos !== true ? (
          <div style={{ marginTop: 28 }}>{slots.registry}</div>
        ) : (
        <Reveal>
          <div
            style={{
              marginTop: 28,
              textAlign: 'center',
              padding: '34px 24px',
              ...CRISTAL,
              // El mismo panel que el resto, no uno reforzado: la maqueta la pinta con
              // `...panel` en los cuatro diseños que la tienen.
              background: P.vidrio,
              border: `1.5px solid ${P.lila}`,
              boxShadow: P.sombra,
            }}
          >
            <div style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: TITULO, textShadow: Z.sombraTexto }}>
              {piel.rotulos?.gifts ?? themes.gifts}
            </div>

            {introDeRegalos === undefined ? null : (
              <p
                style={{
                  marginTop: 22,
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 16,
                  lineHeight: 1.8,
                  color: Z.regalosIntro ?? P.violeta,
                  textShadow: Z.sombraTexto,
                  maxWidth: '75%',
                  marginInline: 'auto',
                }}
              >
                {introDeRegalos}
              </p>
            )}

            {avisoDeSobres === undefined ? null : (
              <div style={{ marginTop: 40 }}>
                <SobreDeLinea color={Z.sobreAcento ?? P.lila} />
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: SANS,
                    fontSize: 15,
                    letterSpacing: '0.04em',
                    color: Z.sobresRotulo ?? P.violetaHondo,
                    textShadow: Z.sombraTexto,
                    fontWeight: 700,
                  }}
                >
                  {avisoDeSobres.title}
                </div>
                {notaDeSobres === undefined ? null : (
                  <div style={{ marginTop: 6, fontSize: 12, color: Z.sobresNota ?? P.uva, textShadow: Z.sombraTexto }}>
                    {notaDeSobres}
                  </div>
                )}
              </div>
            )}

            {/* El separador de esta tarjeta no es el mismo en los cuatro: ver `separadorRegalos`. */}
            {piel.separadorRegalos ?? <FileteDegradado color={P.lilaFuerte} margin="36px auto" />}

            {/* El código y su pie, como en el diseño. */}
            <MarcoQr aro={Z.qrAro} bg={P.blanco} fg={Z.qrTinta ?? P.violetaHondo} seed={42} size={110} />
            <div
              style={{
                marginTop: 14,
                fontFamily: SANS,
                fontSize: 15,
                letterSpacing: '0.04em',
                color: Z.sobresRotulo ?? P.violetaHondo,
                textShadow: Z.sombraTexto,
                fontWeight: 700,
              }}
            >
              {themes.scanHere}
            </div>

            {slots.registry}
          </div>
        </Reveal>
        )}

        {avisosSueltos.map((aviso) => (
          <Reveal key={aviso.title}>
            <div
              style={{
                marginTop: 28,
                textAlign: 'center',
                padding: '26px 20px',
                ...CRISTAL,
                background: P.vidrioFuerte,
                border: `1.5px solid ${P.lila}`,
                boxShadow: P.sombraFuerte,
              }}
            >
              {piel.ornamento ?? <DividerOrnamental color={P.amatista} />}
              <div style={{ marginTop: 22, fontFamily: CALIGRAFIA, fontSize: 44, color: TITULO }}>
                {aviso.title}
              </div>
              {aviso.text === undefined ? null : (
                <p
                  style={{
                    marginTop: 16,
                    fontFamily: SERIF,
                    fontSize: 16,
                    lineHeight: 1.7,
                    color: P.violeta,
                    textShadow: Z.sombraTexto ?? '0 1px 3px rgba(255,255,255,.9)',
                    maxWidth: '78%',
                    marginInline: 'auto',
                  }}
                >
                  {aviso.text}
                </p>
              )}
              <div style={{ marginTop: 22 }}>{piel.ornamento ?? <DividerOrnamental color={P.amatista} />}</div>
            </div>
          </Reveal>
        ))}

        {/*
          El formulario no es un rótulo y una ranura: la maqueta lo presenta con su
          ornamento, el título en caligrafía grande y la línea del plazo. Sin eso, el bloque
          donde el invitado hace lo único que se le pide era el más soso de la invitación.
        */}
        <Reveal>
          <div
            style={{
              marginTop: 28,
              textAlign: 'center',
              padding: '30px 22px',
              ...CRISTAL,
              background: P.vidrioFuerte,
              border: `1.5px solid ${P.lila}`,
              boxShadow: P.sombraFuerte,
            }}
          >
            {piel.ornamento ?? <DividerOrnamental color={P.amatista} />}
            <div style={{ marginTop: 18, fontFamily: CALIGRAFIA, fontSize: 40, color: Z.tituloFormulario ?? TITULO }}>
              {dictionary.title}
            </div>
            {plazo === null ? null : (
              <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 14, color: Z.plazo ?? P.violeta }}>
                {themes.rsvpDeadlineLine.replace('{fecha}', plazo)}
              </div>
            )}
            {piel.ornamento ?? <FileteDegradado color={P.lilaFuerte} margin="22px auto" />}
            {slots.rsvp}
          </div>
        </Reveal>

        {slots.guestbook === null ? null : (
          <Reveal>
            <div style={{ marginTop: 28, padding: '22px 20px', ...CRISTAL, border: `1.5px solid ${P.lila}` }}>
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 30, color: P.uva, textAlign: 'center', marginBottom: 12 }}>
                {piel.rotulos?.guestbook ?? themes.guestbook}
              </div>
              {slots.guestbook}
            </div>
          </Reveal>
        )}

        <div style={{ marginTop: 28 }}>{slots.pass}</div>

        <Reveal>
          <div style={{ marginTop: 20, textAlign: 'center', padding: '20px 10px 40px' }}>
            {piel.ornamento ?? <FileteDegradado color={P.lilaFuerte} margin="0 auto 34px" />}
            {/*
              El agradecimiento va **antes** del rótulo y de la firma, que es donde la
              maqueta lo pone: «gracias por acompañarme» cierra la invitación, y debajo
              firma quien la manda. Estaba al final, detrás de la concha, leyéndose como un
              pie de foto.
            */}
            {despedida === undefined ? null : (
              <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: P.violeta, maxWidth: '70%', marginInline: 'auto' }}>
                {despedida}
              </p>
            )}
            {/* El cierre lleva su propio rótulo —«Mis XV Años»—, no el antetítulo de la
                cabecera: arriba pone «· MIS QUINCE ·» y aquí no. */}
            <div style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: P.uva, marginTop: 36 }}>
              {themes.myFifteen}
            </div>
            {closing?.signature === undefined ? null : (
              <div style={{ fontFamily: CALIGRAFIA, fontSize: 56, color: Z.firma ?? P.violetaHondo, marginTop: 10, textShadow: Z.sombraTexto }}>
                {closing.signature}
              </div>
            )}
            <div style={{ width: piel.arte?.cierreWidth ?? '65%', margin: '36px auto 28px' }}>
              <Image
                alt=""
                aria-hidden
                height={300}
                src={piel.cierre}
                style={{ width: '100%', height: 'auto', display: 'block', filter: 'drop-shadow(0 10px 30px rgba(74,26,110,.28))' }}
                width={400}
              />
            </div>
            {bendicion === undefined ? null : (
              <p
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 21,
                  lineHeight: 1.8,
                  color: P.violeta,
                  textShadow: Z.sombraTexto ?? '0 2px 8px rgba(255,255,255,.9)',
                }}
              >
                {bendicion}
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

/** «Bajo el Mar» — Sofía, de `invites-1.jsx:343`. La composición marina con su piel pastel. */
export function XvView(props: ThemeProps) {
  return <XvSharedView {...props} piel={PIEL_XV} />
}
