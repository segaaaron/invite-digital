import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { rotuloDePortada } from './cover-copy'
import { NataliaCover } from './NataliaCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-natalia.palette'

type ArchivoNatalia = (typeof THEME_ASSETS)['xv-natalia'][number]

const ICONOS: Record<string, ArchivoNatalia> = {
  recepcion: 'invitacion-recepcion.avif',
  corona: 'corona-icono1.avif',
  fiesta: 'fiesta-icono.avif',
  despedida: 'despedida-icono.avif',
}

/**
 * La piel de «Encanto Marino»: dorado sobre negro, con partitura de fondo.
 *
 * No lleva burbujas —son del mar, no de la música— y su velo es negro al 25 %: sobre una
 * partitura dorada, un velo claro apaga el oro y deja el texto sin contraste por los dos
 * lados.
 */
export const PIEL_NATALIA: PielXv = {
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  // «Lluvia de Sobres» no está: en la maqueta es una tarjeta **dentro** de los regalos, y
  // vive en el contenido de muestra, no como rótulo del libro de firmas.
  rotulos: { itinerary: 'Cronograma', gifts: 'Detalles que Abrazan' },
  // Su maqueta sí pinta «Detalles que Abrazan» con el sobre y el código.
  regalos: true,
  fondoBase: '#120c06',
  velo: 'rgba(0,0,0,.25)',
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-natalia', 'fondo-notas-dorado.avif')}
      style={{ objectFit: 'cover', objectPosition: '25% 40%' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <NataliaCover
      badge={rotuloDePortada(datos.eyebrow, datos.name)}
      bgAsset={themeAsset('xv-natalia', 'fondo-musical.avif')}
      hint={datos.enter}
      line1={datos.line1}
      line2={datos.line2}
      name={datos.name}
      noteAsset={themeAsset('xv-natalia', 'nota-sol-dorado-sf.avif')}
      openLabel={datos.openLabel}
      title={`${datos.title} AÑOS`}
    />
  ),
  // Los colores que «Encanto Marino» reparte distinto de «Bajo el Mar», medidos contra su
  // componente de la maqueta.
  piezas: {
    // La firma del cierre va con el oro del diseño, no con su tinta clara.
    firma: '#E8C88F',
    // El titular no lleva el halo blanco de la marina: sobre la partitura, la maqueta pone
    // uno negro y desenfocado. Y la barra y la cita van sobre su propio velo.
    haloTitular: 'radial-gradient(ellipse 70% 75% at 50% 50%, rgba(0,0,0,.5) 0%, rgba(0,0,0,.32) 55%, transparent 80%)',
    haloTitularFiltro: 'blur(6px)',
    veloTexto: 'rgba(0,0,0,.45)',
    cita: { size: 15, color: '#FFFFFF', opacidad: 1 },
    fechaFiletes: true,
    // El código de la mesa de regalos va casi en negro, como en la maqueta: es lo que se lee.
    qrTinta: '#1a1208',
    qrAro: '#b8901f',
    // La tarjeta de regalos: en la maqueta el rótulo de los sobres va en oro y el texto que
    // lo acompaña en marfil; aquí salían justo al revés.
    regalosIntro: '#F5EFE6',
    sobresRotulo: '#E8C88F',
    sobresNota: '#F5EFE6',
    serial: '#B8901F',
    monograma: '#E8C88F',
    anios: '#F5EFE6',
    anfitrionesNombres: '#F5EFE6',
    fecha: '#E8C88F',
    rotuloTenue: '#B8901F',
    faltan: '#E8C88F',
  },
  arte: { castilloWidth: 48 },
  iconoTam: (clave) => ({ recepcion: 48, corona: 55, fiesta: 50, despedida: 60 })[clave ?? ''] ?? 48,
  // Copiado literal de su maqueta (`invites-1.jsx:718`). Estaba con `hue-rotate(2deg)` y
  // sin la opacidad, y eso deja la corona en **rojo encendido** en vez del morado
  // apagado del diseño: los dos grados no giran el tono y el 0,6 es lo que la mete detrás.
  iconoFiltro: (clave) =>
    clave === 'corona'
      ? 'brightness(0) saturate(100%) invert(24%) sepia(84%) saturate(2500%) hue-rotate(265deg) brightness(80%) contrast(105%) opacity(0.6)'
      : undefined,
  // Como en su maqueta: la partitura va fija a la ventana y sin velo borroso, no hay
  // burbujas —son del mar, no de la música— y lo que flota son notas doradas.
  fondoFijo: true,
  particulas: { char: '♪', color: '#B8901F', count: 14 },
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: `1px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  corona: themeAsset('xv-natalia', 'guitarra-y-saxo-dorado-sf.avif'),
  reloj: themeAsset('xv-natalia', 'nota-sol-sf.avif'),
  castillo: themeAsset('xv-natalia', 'castillo-purpura.avif'),
  vestimenta: themeAsset('xv-natalia', 'icono-vestimenta.avif'),
  cierre: themeAsset('xv-natalia', 'concha-recortada.avif'),
  icono: (clave) => themeAsset('xv-natalia', ICONOS[clave ?? ''] ?? 'corona-icono1.avif'),
}
