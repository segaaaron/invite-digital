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
  // Itinerario
  <>
    <path d="M4 21V11l8-5 8 5v10z" />
    <path d="M12 6V2.5M10.3 4.2h3.4M9.5 21v-5.5h5V21" />
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
  // Libro de firmas
  <>
    <path d="M7 3h10l-1.4 6A3.6 3.6 0 0112 12a3.6 3.6 0 01-3.6-3zM12 12v8M8.6 20h6.8" />
  </>,
  // Cómo llegar
  <>
    <path d="M3 16v-3l2.4-4.6A2 2 0 017.2 7h9.6a2 2 0 011.8 1.4L21 13v3" />
    <circle cx="7" cy="17" r="1.8" />
    <circle cx="17" cy="17" r="1.8" />
    <path d="M3 16h2.2M18.8 16H21" />
  </>,
  // Pase QR sin señal
  <>
    <rect height="7" rx="1" width="7" x="3" y="3" />
    <rect height="7" rx="1" width="7" x="14" y="3" />
    <rect height="7" rx="1" width="7" x="3" y="14" />
    <path d="M14 14h3.2v3.2H14zM20.8 20.8h-2M17.6 20.8v-2" />
  </>,
  // Mesas
  <>
    <path d="M5 19v-7a2 2 0 012-2h10a2 2 0 012 2v7" />
    <path d="M3 19h18M8 10V6a2 2 0 012-2h4a2 2 0 012 2v4" />
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
  // Colores y letra
  <>
    <circle cx="9.5" cy="12" r="5" />
    <circle cx="14.5" cy="12" r="5" />
  </>,
]

/** Los cinco de la columna del teléfono. */
export const ICONOS_DEL_MOVIL: readonly ReactNode[] = [
  // Sus fotos, en su lugar
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
  // Con el nombre de cada uno
  <>
    <rect height="16" rx="2" width="18" x="3" y="4" />
    <path d="M3 10h18M9 4v16" />
  </>,
  // Pase QR, también sin señal
  <>
    <rect height="6" rx="1" width="6" x="4" y="4" />
    <rect height="6" rx="1" width="6" x="14" y="4" />
    <rect height="6" rx="1" width="6" x="4" y="14" />
    <path d="M14 14h3v3h-3zM19 19h1.5M17 19v1.5" />
  </>,
  // Español e inglés
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.4 2.4 14.1 0 17M12 3.5c-2.4 2.4-2.4 14.1 0 17" />
  </>,
]
