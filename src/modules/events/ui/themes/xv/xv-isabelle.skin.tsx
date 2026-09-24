import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { IsabelleCover } from './IsabelleCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-isabelle.palette'

type Archivo = (typeof THEME_ASSETS)['xv-isabelle'][number]

/** Las piezas doradas del itinerario, por su clave (`imageId`). */
export const ICONOS_ISABELLE: Record<string, { readonly archivo: Archivo; readonly nombre: string }> = {
  copa: { archivo: 'copa-dorada-sf.avif', nombre: 'Recepción' },
  cena: { archivo: 'cena-dorada-sf.avif', nombre: 'Cena' },
  baile: { archivo: 'baile-dorado-sf.avif', nombre: 'Baile' },
  torta: { archivo: 'torta-dorada-sf.avif', nombre: 'Torta' },
  carroza: { archivo: 'carrosa-dorada-sf.avif', nombre: 'Cierre' },
}
const ORDEN = ['copa', 'cena', 'baile', 'torta', 'carroza'] as const

const SOMBRA = '0 1px 3px rgba(255,255,255,.6)'

/**
 * La piel de «Palacio Griego» en V3 (`QuinceInviteIsabelleGriego`): la quinceañera a sangre
 * entre columnas, fundida hacia abajo, y el resto sobre mármol crema en paneles con filete de
 * oro. Es la misma composición que los XV de gala; cambian los colores, las piezas doradas y
 * el itinerario, que va en una columna con un dibujo por hito.
 */
export const PIEL: PielXv = {
  apertura: (foto) => (
    <div style={{ position: 'relative', width: '100%', height: 460, overflow: 'hidden', marginBottom: -20 }}>
      {foto === undefined ? (
        <Image
          alt=""
          fill
          priority
          sizes="480px"
          src={themeAsset('xv-isabelle', 'xv-recortado.avif')}
          style={{
            objectFit: 'cover',
            objectPosition: 'top center',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 92%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 92%)',
          }}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- la sirve /media/[id], con la puerta de contraseña del evento. */
        <img
          alt=""
          src={foto}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 92%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 92%)',
          }}
        />
      )}
    </div>
  ),
  fondoBase: P.crema,
  velo: 'linear-gradient(160deg, rgba(255,248,231,.72) 0%, rgba(250,232,206,.68) 55%, rgba(245,220,200,.72) 100%)',
  fondoFijo: true,
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-isabelle', 'estilo-griego-v3.avif')}
      style={{ objectFit: 'cover' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <IsabelleCover
      bgAsset={themeAsset('xv-isabelle', 'portada-griega.avif')}
      hint={datos.enter}
      name={datos.name}
      openLabel={datos.openLabel}
      serial={`${datos.eyebrow} 2026`.trim()}
      title={`${datos.title} ${datos.anios}`}
    />
  ),
  // Sin ornamentos: la maqueta no pone ninguno entre bloques ni en el formulario.
  ornamento: <></>,
  piezas: {
    formulario: { boton: '#C5961A', campo: 'rgba(255,255,255,.75)', linea: '#C5961A', tinta: P.tinta, etiqueta: P.uva },
    botonTinta: P.crema,
    tituloFormulario: P.uva,
    plazo: P.tinta,
    mapa: P.uva,
    mapaBorde: P.amatista,
    mapaAro: P.tinta,
    mapaRotulo: P.malva,
    serial: P.uva,
    monograma: P.uva,
    anios: P.malva,
    nombre: P.violetaHondo,
    firma: P.violetaHondo,
    fecha: P.uva,
    cuentaCifra: P.violetaHondo,
    rotuloTenue: P.uva,
    faltan: P.uva,
    tituloSeccion: P.uva,
    lugarNombre: P.violetaHondo,
    lugarHora: P.uva,
    anfitriones: { font: 'var(--font-dm-sans)', size: 12, color: P.uva, mayusculas: true },
    anfitrionesNombres: P.violetaHondo,
    invitadoTitulo: P.tinta,
    musicaAcento: P.amatista,
    musicaPista: P.violetaHondo,
    musicaArtista: P.malva,
    vestimentaNota: P.malva,
    vestimentaDetalle: P.violetaHondo,
    despedida: P.tinta,
    fechaOrnamento: false,
    recepcionCentrada: 'compacta',
    sombraTexto: SOMBRA,
    haloTitular: 'none',
    cita: {
      panel: true,
      fuente: 'var(--font-cormorant)',
      weight: 400,
      sombra: 'none',
      color: P.tinta,
      cursiva: true,
      mayusculas: false,
      size: 18,
      interlineado: 2.1,
      espaciado: 'normal',
      opacidad: 1,
      relleno: '44px 28px',
      maxAncho: '72%',
    },
    cierreRombo: false,
  },
  arte: {
    coronaWidth: 220,
    coronaFiltro: 'drop-shadow(0 10px 20px rgba(139,105,20,.2))',
    relojWidth: 100,
    relojFiltro: 'drop-shadow(0 4px 10px rgba(139,105,20,.25))',
    castilloWidth: 220,
    castilloFiltro: 'drop-shadow(0 4px 10px rgba(139,105,20,.2))',
    vestimentaWidth: '100%',
    cierreWidth: 180,
  },
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    border: `1.5px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  rotulos: { itinerary: 'itineraryTitle' },
  // Una columna con el dibujo dorado de cada hito, su momento y su hora, en un panel.
  itinerario: (filas) => (
    <div style={{ padding: '26px 22px', borderRadius: 20, background: P.vidrio, border: `1.5px solid ${P.bordeVidrio}`, boxShadow: P.sombra }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {filas.map((fila, i) => {
          const icono = ICONOS_ISABELLE[fila.imageId ?? ORDEN[i % ORDEN.length] ?? 'copa'] ?? ICONOS_ISABELLE.copa
          return (
            <li key={`${fila.time}-${fila.label}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {icono === undefined ? null : (
                <Image alt="" aria-hidden height={126} src={themeAsset('xv-isabelle', icono.archivo)} style={{ width: 126, height: 126, objectFit: 'contain' }} width={126} />
              )}
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: P.uva, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 10 }}>
                {fila.label}
              </div>
              <div style={{ fontFamily: 'var(--font-italiana)', fontSize: 24, marginTop: 5, color: P.violetaHondo, fontWeight: 700 }}>{fila.time}</div>
            </li>
          )
        })}
      </ol>
    </div>
  ),
  corona: themeAsset('xv-isabelle', 'busto-marmol-sf.avif'),
  reloj: themeAsset('xv-isabelle', 'reloj-conteo-sf.avif'),
  castillo: themeAsset('xv-isabelle', 'recepcion-dorada-casa-sf.avif'),
  vestimenta: themeAsset('xv-isabelle', 'codigo-vestimenta-dorado-sf.avif'),
  cierre: themeAsset('xv-isabelle', 'marmol-y-flores-sf.avif'),
  icono: (clave) => themeAsset('xv-isabelle', (ICONOS_ISABELLE[clave ?? ''] ?? ICONOS_ISABELLE.copa)?.archivo ?? 'copa-dorada-sf.avif'),
}
