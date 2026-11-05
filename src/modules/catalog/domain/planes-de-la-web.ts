import type { Plan } from './plan'
import type { Locale } from '@/shared/i18n/locales'

/**
 * **Lo que la web enseña de cada plan: precio de lanzamiento, descripción y características agrupadas.**
 *
 * Normalmente esto vive en la base y se edita en Admin › Catálogo › Planes, porque lo que incluye un plan
 * es una decisión comercial. El 21 de octubre el usuario pidió lo contrario, y dos veces: que el cambio
 * **vaya en la web**, sin tener que escribirlo en el admin. Así que aquí está, por `slug`.
 *
 * Lo que sigue saliendo de la base: el nombre, el precio de hoy, el lema y el orden. Esto añade el precio
 * de antes —el tachado—, reemplaza la lista de características por la agrupada de la maqueta y, desde el
 * documento de correcciones del 30 de octubre, también la descripción: la de la base **tutea** y la
 * portada entera habla de usted.
 *
 * Para devolverlo al admin: borra el plan de este mapa y escribe sus líneas en Catálogo › Planes. El
 * formato es el mismo —una línea acabada en dos puntos abre un grupo, «Entrega» se pinta en píldoras,
 * `(exclusivo)` pone su etiqueta y lo que va entre `*asteriscos*` sale en dorado—.
 *
 * **Lo que no está aquí: la entrega.** Las rondas, los días y el tiempo en línea los pinta la
 * tarjeta leyendo la base, que es de donde salen también en la tabla comparativa. Escritos a mano
 * en los dos sitios acabaron diciendo cosas distintas (Gala: cuatro rondas en la tarjeta, tres en
 * la tabla).
 */
type ContenidoDePlan = {
  readonly precioAntesCents: number
  readonly descripcion: Readonly<Record<Locale, string>>
  readonly features: Readonly<Record<Locale, readonly string[]>>
}

export const PLANES_DE_LA_WEB: Readonly<Record<string, ContenidoDePlan>> = {
  atelier: {
    precioAntesCents: 59000,
    descripcion: {
      es: 'Todo lo esencial de su evento en una invitación elegante, personalizada para cada invitado.',
      en: 'Everything your event needs in an elegant invitation, personalised for each guest.',
    },
    features: {
      es: [
        'Su evento:',
        'Portada y cuenta regresiva',
        'Ubicación en Google Maps y cronograma',
        'Código de vestimenta y música de fondo',
        'Galería de fotos (hasta 5)',
        'Lista de tareas, presupuesto y agenda con avisos',
        'Sus invitados:',
        'Nombre del invitado y pases «Reservamos X lugares»',
        'Envíos ilimitados',
        'Confirmación por WhatsApp + lista de confirmados',
        'Botón para agendar en Google Calendar',
        'Sugerencia de regalos',
      ],
      en: [
        'Your event:',
        'Animated cover and countdown',
        'Google Maps location and schedule',
        'Dress code and background music',
        'Photo gallery (up to 5)',
        'Task list, budget and calendar with reminders',
        'Your guests:',
        'Guest name and passes “We saved X seats”',
        'Unlimited sending',
        'WhatsApp RSVP + list of confirmed guests',
        'Add to Google Calendar button',
        'Gift suggestion',
      ],
    },
  },
  gala: {
    precioAntesCents: 79000,
    descripcion: {
      es: 'Sume regalos y libro de firmas para que sus invitados le dejen sus buenos deseos.',
      en: 'Add gifts and a guest book so your guests can leave you their best wishes.',
    },
    features: {
      es: [
        'Todo lo de Atelier, más:',
        'Colores y tipografías personalizadas',
        'Quitar, agregar u ordenar secciones',
        'Galería ampliada (hasta 10 fotos)',
        'Proveedores, cronograma y documentos',
        'Regalos y recuerdos:',
        'Lluvia de sobres y QR de transferencia',
        'Libro de firmas',
      ],
      en: [
        'Everything in Atelier, plus:',
        'Custom colours and typefaces',
        'Remove, add or reorder sections',
        'Larger gallery (up to 10 photos)',
        'Vendors, schedule and documents',
        'Gifts and keepsakes:',
        'Envelope shower and bank QR',
        'Guest book',
      ],
    },
  },
  imperial: {
    precioAntesCents: 115000,
    descripcion: {
      es: 'Control en tiempo real, mesas, acceso con QR y álbum compartido.',
      en: 'Real-time control, seating, QR entry and a shared album.',
    },
    features: {
      es: [
        'Todo lo de Gala, más:',
        'Diseño inspirado en su evento: vestido, decoración o flores',
        'Galería de 20 fotos',
        'Panel en tiempo real: confirmados, no asistirán y pendientes · descargable',
        'Número de mesa, plano del salón y QR de acceso',
        'Recepción con pase QR, también sin señal · hasta 10 personas en recepción',
        'Recordatorios: su panel le dice a quién escribir',
        'Álbum compartido: sus invitados suben sus fotos con un QR',
        'Luxury Planner, su asistente con IA: le habla, organiza sus tareas y le avisa lo pendiente',
        'Día D, con un enlace para cada proveedor',
      ],
      en: [
        'Everything in Gala, plus:',
        'A design inspired by your event: dress, décor or flowers',
        '20-photo gallery',
        'Live dashboard: confirmed, not attending and pending · downloadable',
        'Table number, floor plan and entry QR',
        'Check-in with QR pass, offline too · up to 10 people at the door',
        'Reminders: your dashboard tells you who to write to',
        'Shared album: your guests upload their photos with a QR',
        'Luxury Planner, your AI assistant: talk to it, it organises your tasks and flags what is pending',
        'Day-of, with a link for each vendor',
      ],
    },
  },
}

/** El plan como lo enseña la web: con su precio de antes, su descripción y sus características agrupadas. */
export function conContenidoDeLaWeb(plan: Plan, locale: Locale): Plan {
  const contenido = PLANES_DE_LA_WEB[plan.slug]
  if (contenido === undefined) return plan
  return { ...plan, priceBeforeCents: contenido.precioAntesCents, description: contenido.descripcion[locale], features: [...contenido.features[locale]] }
}
