import type { ReactNode } from 'react'

/**
 * Los iconos de la portada, dibujados a línea para que **se escriban solos** al entrar en
 * pantalla: `PortadaVida` mide cada trazo y lo va descubriendo. Por eso son `path`, `circle`
 * y `rect` sueltos, sin relleno y sin agrupar — un `<g>` o un `<use>` no tienen longitud.
 *
 * El orden es el de `dictionary.portada.noche.items` y `dictionary.portada.movil.puntos`: el
 * icono número tres es el del texto número tres.
 */
export const ICONOS_DE_LA_NOCHE: readonly ReactNode[] = [
  // Mesa de regalos
  <>
    <rect height="12" rx="1.5" width="18" x="3" y="8" />
    <path d="M3 12h18M12 8v12M12 8C9.4 8 8 7 8 5.8S9.4 3.6 12 8zM12 8c2.6 0 4-1 4-2.2S14.6 3.6 12 8z" />
  </>,
  // Cuenta regresiva
  <>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 9.5v4l2.6 1.6M9.6 3.4h4.8M12 3.4v3" />
  </>,
  // Itinerario: una lista con horas. La iglesia no servía para XV, graduaciones ni bodas civiles.
  <>
    <circle cx="5.6" cy="7" r="1.5" />
    <circle cx="5.6" cy="12.5" r="1.5" />
    <circle cx="5.6" cy="18" r="1.5" />
    <path d="M10 7h10M10 12.5h10M10 18h6.6" />
  </>,
  // Vestimenta
  <>
    <path d="M9.4 3.2L12 6.4l2.6-3.2M9.4 3.2L6.6 4.8 5 21h5.2M14.6 3.2l2.8 1.6L19 21h-5.2M12 6.4l-1.8 14.6h3.6z" />
  </>,
  // Fotos de invitados
  <>
    <rect height="13" rx="2" width="18" x="3" y="7" />
    <circle cx="12" cy="13.5" r="3.6" />
    <path d="M8.3 7l1.5-2.4h4.4L15.7 7" />
  </>,
  // Libro de firmas: un libro abierto. La copa era un brindis.
  <>
    <path d="M12 7.2C10 5.9 7.3 5.4 4.4 5.8v12.4c2.9-.4 5.6.1 7.6 1.4 2-1.3 4.7-1.8 7.6-1.4V5.8c-2.9-.4-5.6.1-7.6 1.4z" />
    <path d="M12 7.2v12.4" />
  </>,
  // Cómo llegar: el pin de ubicación. No todos llegan en auto, y el pin es lo que se asocia a Maps.
  <>
    <path d="M12 21.4s7-6.5 7-11.3A7 7 0 005 10.1c0 4.8 7 11.3 7 11.3z" />
    <circle cx="12" cy="10" r="2.6" />
  </>,
  // Pase QR sin señal
  <>
    <rect height="7" rx="1" width="7" x="3" y="3" />
    <rect height="7" rx="1" width="7" x="14" y="3" />
    <rect height="7" rx="1" width="7" x="3" y="14" />
    <path d="M14 14h3.2v3.2H14zM20.8 20.8h-2M17.6 20.8v-2" />
  </>,
  // Mesas: una mesa redonda con cuatro sillas, vista desde arriba. El anterior parecía un candado.
  <>
    <circle cx="12" cy="12" r="4.6" />
    <rect height="2.6" rx="1.1" width="4" x="10" y="2.6" />
    <rect height="2.6" rx="1.1" width="4" x="10" y="18.8" />
    <rect height="4" rx="1.1" width="2.6" x="2.6" y="10" />
    <rect height="4" rx="1.1" width="2.6" x="18.8" y="10" />
  </>,
  // Recordatorios
  <>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8.5 10.5h7" />
  </>,
  // Español e inglés
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" />
  </>,
  // Confirmación en un toque: un check. Los anillos de «Colores y letra» solo hablaban de bodas.
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M8.2 12.4l2.7 2.7 5-5.7" />
  </>,
]

/**
 * Los cinco de la columna del teléfono, en el orden de la lista nueva de la demo (documento del
 * 30 oct): el sobre con el nombre, la canción, las fotos, el mapa y el teléfono sin apps.
 */
export const ICONOS_DEL_MOVIL: readonly ReactNode[] = [
  // Con el nombre de cada uno: el sobre
  <>
    <rect height="13" rx="2" width="18" x="3" y="5.5" />
    <path d="M3.6 6.4L12 12.4l8.4-6" />
  </>,
  // Su canción al abrir
  <>
    <circle cx="8" cy="17.4" r="2.6" />
    <circle cx="17.8" cy="15.4" r="2.4" />
    <path d="M10.6 17.4V7.1l9.6-2.5v10.8" />
  </>,
  // Sus fotos y su historia
  <>
    <rect height="13" rx="2" width="18" x="3" y="6" />
    <circle cx="12" cy="12.5" r="3.4" />
    <path d="M8.5 6l1.4-2h4.2L15.5 6" />
  </>,
  // Mapa y cronograma
  <>
    <path d="M12 21s7-6.4 7-11a7 7 0 10-14 0c0 4.6 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </>,
  // Sin apps ni descargas: el teléfono
  <>
    <rect height="19" rx="3" width="12.6" x="5.7" y="2.5" />
    <path d="M10.3 5.2h3.4M9.6 19h4.8" />
  </>,
]
