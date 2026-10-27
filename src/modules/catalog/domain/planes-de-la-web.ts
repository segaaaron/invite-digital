import type { Plan } from './plan'
import type { Locale } from '@/shared/i18n/locales'

/**
 * **Lo que la web enseña de cada plan: precio de lanzamiento y características agrupadas.**
 *
 * Normalmente esto vive en la base y se edita en Admin › Catálogo › Planes, porque lo que incluye un plan
 * es una decisión comercial. El 21 de octubre el usuario pidió lo contrario, y dos veces: que el cambio
 * **vaya en la web**, sin tener que escribirlo en el admin. Así que aquí está, por `slug`.
 *
 * Lo que sigue saliendo de la base: el nombre, el precio de hoy, la frase y el orden. Esto solo añade el
 * precio de antes —el tachado— y reemplaza la lista de características por la agrupada de la maqueta.
 *
 * Para devolverlo al admin: borra el plan de este mapa y escribe sus líneas en Catálogo › Planes. El
 * formato es el mismo —una línea acabada en dos puntos abre un grupo, «Entrega» se pinta en píldoras,
 * `(exclusivo)` pone su etiqueta y lo que va entre `*asteriscos*` sale en dorado—.
 */
type ContenidoDePlan = {
  readonly precioAntesCents: number
  readonly features: Readonly<Record<Locale, readonly string[]>>
}

export const PLANES_DE_LA_WEB: Readonly<Record<string, ContenidoDePlan>> = {
  atelier: {
    precioAntesCents: 59000,
    features: {
      es: [
        'Su evento:',
        'Portada y cuenta regresiva',
        'Ubicación en Google Maps y cronograma',
        'Código de vestimenta y música de fondo',
        'Galería de fotos',
        'Sus invitados:',
        'Nombre del invitado y pases «Reservamos X lugares»',
        'Envíos ilimitados',
        'Confirmación por WhatsApp + lista de confirmados',
        'Botón para agendar en Google Calendar',
        'Sugerencia de regalos',
        'Entrega:',
        '2 rondas de corrección',
        'Lista en 3 días',
        'En línea 60 días',
      ],
      en: [
        'Your event:',
        'Animated cover and countdown',
        'Google Maps location and schedule',
        'Dress code and background music',
        'Photo gallery',
        'Your guests:',
        'Guest name and passes “We saved X seats”',
        'Unlimited sending',
        'WhatsApp RSVP + list of confirmed guests',
        'Add to Google Calendar button',
        'Gift suggestion',
        'Delivery:',
        '2 correction rounds',
        'Ready in 3 days',
        'Online for 60 days',
      ],
    },
  },
  gala: {
    precioAntesCents: 79000,
    features: {
      es: [
        'Diseño a su gusto:',
        'Colores y tipografías personalizadas',
        'Galería ampliada (hasta 10 fotos)',
        'Regalos y recuerdos:',
        'Lluvia de sobres y QR de transferencia',
        'Libro de firmas (exclusivo)',
        'Entrega:',
        '4 rondas de corrección',
        'Lista en *solo 3 días*',
        'En línea 90 días',
      ],
      en: [
        'Your own look:',
        'Custom colours and typefaces',
        'Larger gallery (up to 10 photos)',
        'Gifts and keepsakes:',
        'Envelope shower and bank QR',
        'Guestbook (exclusive)',
        'Delivery:',
        '4 correction rounds',
        'Ready in *just 3 days*',
        'Online for 90 days',
      ],
    },
  },
  imperial: {
    precioAntesCents: 115000,
    features: {
      es: [
        'Diseño exclusivo:',
        'Diseño creado para tu tema: vestido, decoración o flores',
        'Galería de 20 fotos',
        'Control de invitados:',
        'Panel en tiempo real: confirma, rechaza, pendiente · descargable',
        'Número de mesa, plano del salón y QR de acceso',
        'Recepción con pase QR, también sin señal · 10 personas de recepción',
        'Recuerdos y organización:',
        'Álbum compartido: sus invitados suben sus fotos con un QR',
        'Luxury, tu planner con IA, y Día D con enlace para cada proveedor',
        'Entrega:',
        '5 rondas de corrección',
        'Lista en 5 días',
        'En línea *6 meses*',
      ],
      en: [
        'A design of your own:',
        'Designed around your theme: dress, décor or flowers',
        '20-photo gallery',
        'Guest control:',
        'Live panel: confirmed, declined, pending · downloadable',
        'Table number, floor plan and entry QR',
        'Check-in with QR pass, offline too · 10 door staff',
        'Keepsakes and planning:',
        'Shared album: your guests upload their photos with a QR',
        'Luxury, your AI planner, and D-Day with a link for each vendor',
        'Delivery:',
        '5 correction rounds',
        'Ready in 5 days',
        'Online for *6 months*',
      ],
    },
  },
}

/** El plan como lo enseña la web: con su precio de antes y sus características agrupadas, si las tiene. */
export function conContenidoDeLaWeb(plan: Plan, locale: Locale): Plan {
  const contenido = PLANES_DE_LA_WEB[plan.slug]
  if (contenido === undefined) return plan
  return { ...plan, priceBeforeCents: contenido.precioAntesCents, features: [...contenido.features[locale]] }
}
