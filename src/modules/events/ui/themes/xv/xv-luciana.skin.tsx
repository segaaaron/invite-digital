import Image from '@/shared/design/ui/ImagenQueAparece'
import { themeAsset } from '../assets'
import { BotanicalWreath } from '../kit/flora/BotanicalWreath'
import { LucianaCover } from './LucianaCover'
import { CronogramaEsfera } from './CronogramasV3'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-luciana.palette'

/** La piel de «Bosque Encantado». */
export const PIEL: PielXv = {
  // Lo que este diseño abre a sangre, antes de la barra: como en la maqueta.
  apertura: (
    <>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(var(--alto, 100dvh) * 0.45)',
          minHeight: 280,
          overflow: 'hidden',
          // El borde rasgado de su maqueta, copiado punto por punto (`invites-1.jsx:1333`): son
          // 66 vértices con la altura variando entre el 96 y el 98 %, que es lo que dibuja un
          // papel roto. El zigzag de siete puntos que había aquí se leía como un festón
          // regular, que es otra cosa.
          clipPath:
            'polygon(0.00% 0.00%,100.00% 0.00%,100.00% 96.00%,100.00% 96.06%,98.33% 96.32%,96.67% 96.00%,95.00% 96.56%,93.33% 96.47%,91.67% 96.36%,90.00% 96.41%,88.33% 96.46%,86.67% 96.55%,85.00% 96.11%,83.33% 96.10%,81.67% 96.00%,80.00% 96.00%,78.33% 96.23%,76.67% 96.00%,75.00% 96.00%,73.33% 96.07%,71.67% 96.15%,70.00% 96.00%,68.33% 96.00%,66.67% 96.00%,65.00% 96.00%,63.33% 96.53%,61.67% 96.30%,60.00% 96.00%,58.33% 96.00%,56.67% 96.04%,55.00% 96.11%,53.33% 96.70%,51.67% 96.79%,50.00% 97.38%,48.33% 97.29%,46.67% 97.69%,45.00% 98.00%,43.33% 97.43%,41.67% 97.71%,40.00% 97.54%,38.33% 97.20%,36.67% 97.41%,35.00% 96.96%,33.33% 96.83%,31.67% 96.35%,30.00% 96.34%,28.33% 96.92%,26.67% 96.81%,25.00% 97.28%,23.33% 97.17%,21.67% 96.59%,20.00% 96.87%,18.33% 96.36%,16.67% 96.18%,15.00% 96.09%,13.33% 96.00%,11.67% 96.37%,10.00% 96.26%,8.33% 96.66%,6.67% 97.06%,5.00% 96.54%,3.33% 96.85%,1.67% 97.23%,0.00% 97.64%,0.00% 96.00%)',
        }}
      >
        <Image
          alt=""
          fill
          priority
          sizes="480px"
          src={themeAsset('xv-luciana', 'quinceanera-verde.avif')}
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      </div>
    </>
  ),
  fondoBase: '#0f2a1f',
  // El velo exacto de su maqueta. Estaba en rgba(10,28,20,.55), que es medio tono más
  // claro y verdea el bosque de más.
  velo: 'rgba(8,22,14,.55)',
  // Su fotografía va **fija a la ventana** y su velo sin desenfoque, como en la maqueta:
  // con el velo borroso de la marina, el fondo oscuro se apagaba entero.
  fondoFijo: true,
  veloInferior: 'rgba(8,22,14,.9)',
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-luciana', 'bosque-verdee.avif')}
      //  es de su maqueta: sin él el bosque sale lavado.
      style={{ objectFit: 'cover', filter: 'saturate(1.1)' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <LucianaCover
      accent={P.lila}
      bg="#0f2a1f"
      bgAsset={themeAsset('xv-luciana', 'bosque-verdee.avif')}
      foto={datos.foto}
      hint={datos.enter}
      lanternAsset={themeAsset('xv-luciana', 'faro-verde.avif')}
      line1={datos.line1}
      line2={datos.line2}
      name={datos.name}
      openLabel={datos.openLabel}
      textColor={P.tinta}
      title={`${datos.title} ${datos.anios}`}
    />
  ),
  // Los colores que «Bosque Encantado» reparte distinto de «Bajo el Mar».
  piezas: {
    // El «ENVIAR» de su formulario en la maqueta.
    formulario: { boton: '#D9B85C' },
    botonTinta: '#0f2a1f',
    // El plano como su maqueta: calles del oro del borde y aro del fondo.
    mapaBorde: '#D9B85C',
    mapaAro: '#0f2a1f',
    // La firma del cierre va con el oro del diseño, no con su tinta clara.
    firma: '#E8C87A',
    // Disco de oro al 10 % y la lámina del borde entre el rótulo y la hora.
    discoItinerario: 'rgba(217,184,92,.10)',
    itinerarioSeparador: 'ornamento',
    // Su maqueta escribe **toda** la invitación con sombra negra, y el titular no lleva
    // halo: el fondo es una fotografía oscura, no el papel claro de la marina.
    haloTitular: 'none',
    // Su recepción va centrada: la pieza arriba y la hora al pie.
    recepcionCentrada: true,
    // Su reloj va debajo del «Faltan», y la cita mide 14,4 con menos espaciado.
    relojDebajo: true,
    // Los valores de su maqueta: 14,4 con interlineado 2, negrita 700 y la sombra negra.
    cita: { size: 14.4, espaciado: '0.06em', opacidad: 1, color: '#EAF3E4', weight: 700, interlineado: 2, sombra: '0 2px 8px rgba(0,0,0,.75)' },
    // El código de la mesa de regalos va casi en negro, como en la maqueta: es lo que se lee.
    qrTinta: '#2a1140',
    // Como en Mascarada: el sobre con el borde del panel y el texto con sombra negra.
    sobreAcento: P.lilaFuerte,
    sombraTexto: '0 2px 8px rgba(0,0,0,.75)',
    musicaAcento: '#E8C87A',
    musicaPista: '#E8C87A',
    musicaArtista: '#9BC48A',
    vestimentaNota: '#9BC48A',
    vestimentaDetalle: '#EAF3E4',
    regalosIntro: '#EAF3E4',
    sobresRotulo: '#E8C87A',
    sobresNota: '#9BC48A',
    plazo: '#EAF3E4',
    fecha: '#E8C87A',
    invitadoTitulo: '#EAF3E4',
    tituloSeccion: '#E8C87A',
    tituloRecepcionSize: 32,
    mapa: '#E8C87A',
    itinerarioRotulo: '#E8C87A',
    itinerarioHora: '#EAF3E4',
  },
  // Los tamaños de su maqueta: el faro cierra a 110 y el reloj mide 90.
  arte: { relojWidth: 90, cierreWidth: 110 },
  paleta: P,
  cristal: {
    background: P.vidrio,
    borderRadius: 16,
    border: `1.5px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  // «Lluvia de Sobres» no está: en la maqueta es una tarjeta **dentro** de los regalos, y
  // vive en el contenido de muestra, no como rótulo del libro de firmas.
  rotulos: { itinerary: 'scheduleTitle', gifts: 'giftsEmbrace' },
  // Su maqueta sí pinta «Detalles que Abrazan» con el sobre y el código.
  regalos: true,
  // Sin pieza entre la cita y los padres, y sin retrato en arco: su maqueta abre con la
  // fotografía a sangre —la `apertura`— y no la repite dentro de un arco rosa, ni cuelga el
  // farol encima.
  reloj: themeAsset('xv-luciana', 'reloj1.avif'),
  castillo: themeAsset('xv-luciana', 'faro-verde.avif'),
  vestimenta: themeAsset('xv-luciana', 'traje1.avif'),
  cierre: themeAsset('xv-luciana', 'faro-verde.avif'),
  // Su cronograma en V3 es una esfera de reloj con «XV» al centro, dentro de su panel.
  itinerario: (filas) => (
    <div style={{ padding: '20px 14px 30px', background: P.vidrio, borderRadius: 20, border: `1.5px solid ${P.bordeVidrio}`, boxShadow: P.sombra }}>
      <CronogramaEsfera
        e={{
          size: 208,
          salida: 24,
          anillo: P.bordeVidrio,
          acento: '#E8C87A',
          hora: { color: '#EAF3E4', size: 16, peso: 700 },
          momento: { color: '#E8C87A', size: 8, tracking: '0.1em' },
          centro: { font: 'var(--font-great-vibes)', size: 26, dy: 6 },
          sombra: '0 2px 8px rgba(0,0,0,.75)',
          pie: 30,
        }}
        filas={filas}
      />
    </div>
  ),
  // La recepción lleva un castillo de línea dorado, como en su maqueta.
  castilloNodo: (
    <svg
      aria-hidden
      fill="none"
      height="62"
      stroke="#D9B85C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      style={{ display: 'block', margin: '0 auto 20px' }}
      viewBox="0 0 24 24"
      width="62"
    >
      <path d="M4 21 V10 M20 21 V10 M4 10 L4 7 L7 7 L7 10 M20 10 L20 7 L17 7 L17 10 M7 10 L7 4 L9 6 M17 10 L17 4 L15 6 M9 6 L12 3 L15 6" />
      <path d="M4 21 H20" />
      <rect height="6" width="4" x="10" y="15" />
    </svg>
  ),
  // La esfera no pinta iconos; el esqueleto pide uno igual.
  icono: () => themeAsset('xv-luciana', 'faro-verde.avif'),
  /**
   * Su encabezado, copiado de `invites-1.jsx:1338-1345`.
   *
   * Es el único de los siete que no abre con el esqueleto compartido: **no lleva la barra
   * «· MIS QUINCE · / 2026» ni el «XV» de 92 píxeles**. Escribe «MIS QUINCE AÑOS» en un
   * renglón de 13 muy espaciado, cuelga debajo su lámina de borde y remata con el nombre
   * en Great Vibes de 75. Heredando el compartido, esta invitación abría con un monograma
   * gigante y un año que su maqueta no escribe en ninguna parte.
   */
  encabezado: ({ name, titular }) => (
    <div style={{ position: 'relative', marginTop: 10, textAlign: 'center', padding: '10px 0' }}>
      <div
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 13,
          letterSpacing: '0.28em',
          color: P.lila,
          fontWeight: 700,
          textShadow: '0 2px 8px rgba(0,0,0,.75)',
          textTransform: 'uppercase',
        }}
      >
        {titular}
      </div>
      <Image
        alt=""
        aria-hidden
        height={40}
        src={themeAsset('xv-luciana', 'borde.avif')}
        style={{
          width: '50%',
          height: 'auto',
          display: 'block',
          margin: '22px auto',
          filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.6))',
        }}
        width={300}
      />
      <h1
        style={{
          fontFamily: 'var(--font-great-vibes)',
          fontSize: 75,
          lineHeight: 1.45,
          marginTop: 2,
          color: P.lila,
          textShadow: '0 2px 8px rgba(0,0,0,.75)',
          margin: 0,
        }}
      >
        {name}
      </h1>
    </div>
  ),
  /**
   * Su cita va **dentro de la corona de hojas y luces**, no en una tarjeta
   * (`invites-1.jsx:1348-1358`). Encima y debajo del texto, un trío de puntos dorados al
   * 60 % —invertidos entre sí—, que es lo que la maqueta pone como remate.
   */
  citaMarco: (cita) => (
    <BotanicalWreath color={P.lila}>
      <div>
        <svg aria-hidden height="10" style={{ display: 'block', margin: '0 auto 8px' }} viewBox="0 0 24 10" width="24">
          <circle cx="12" cy="1.5" fill={P.lila} opacity="0.6" r="2" />
          <circle cx="4" cy="8" fill={P.lila} opacity="0.6" r="2" />
          <circle cx="20" cy="8" fill={P.lila} opacity="0.6" r="2" />
        </svg>
        {cita}
        <svg aria-hidden height="10" style={{ display: 'block', margin: '8px auto 0' }} viewBox="0 0 24 10" width="24">
          <circle cx="4" cy="1.5" fill={P.lila} opacity="0.6" r="2" />
          <circle cx="20" cy="1.5" fill={P.lila} opacity="0.6" r="2" />
          <circle cx="12" cy="8" fill={P.lila} opacity="0.6" r="2" />
        </svg>
      </div>
    </BotanicalWreath>
  ),
  // Su ornamento no es un filete: la maqueta pone la lámina del borde, al 50 %.
  ornamento: (
    <Image
      alt=""
      aria-hidden
      height={40}
      src={themeAsset('xv-luciana', 'borde.avif')}
      style={{
        width: '50%',
        height: 'auto',
        display: 'block',
        margin: '22px auto',
        filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.6))',
      }}
      width={300}
    />
  ),
  // Aquí el separador de la tarjeta de regalos es la lámina del borde, al 50 %.
  separadorRegalos: (
    <Image
      alt=""
      aria-hidden
      height={40}
      src={themeAsset('xv-luciana', 'borde.avif')}
      style={{
        width: '50%',
        height: 'auto',
        display: 'block',
        margin: '22px auto',
        filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.6))',
      }}
      width={300}
    />
  ),
}
