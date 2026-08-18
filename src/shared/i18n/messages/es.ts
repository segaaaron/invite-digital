export const es = {
  nav: { collections: 'Colecciones', experience: 'Experiencia 3D', pricing: 'Inversión', contact: 'Hablemos' },
  hero: {
    eyebrow: 'Lujo sereno · Atelier digital',
    titleLine1: 'INVITACIONES',
    titleLine2: 'DIGITALES DE',
    titleAccent: 'alta costura',
    body: 'Sobres que se abren en 3D, sellos de cera que se rompen al tacto y una escena inmersiva por cada evento. Diseñamos la pieza, la programamos y la entregamos con dominio propio en 72 horas.',
    ctaPrimary: 'Crear invitación',
    ctaSecondary: 'Ver demo interactiva',
    trustLabel: 'Organizadores que confían en nosotros',
  },
  stats: {
    events: 'Eventos entregados',
    delivery: 'Entrega promedio',
    rsvp: 'Confirmación RSVP',
    countries: 'Países alcanzados',
  },
  experience: {
    eyebrow: 'La experiencia',
    title: 'Tres actos de una misma pieza',
    acts: [
      { label: 'Acto I', title: 'Unboxing virtual', body: 'El sobre llega cerrado. El invitado desliza, el sello de cera cede y la tarjeta emerge con física real de papel.' },
      { label: 'Acto II', title: 'Detalles inmersivos', body: 'Foil dorado que reacciona a la luz del cursor, texturas de algodón, tipografía compuesta a mano para cada nombre.' },
      { label: 'Acto III', title: 'Demo interactiva en vivo', body: 'Galería en movimiento, mapa, cuenta regresiva y RSVP con confirmación instantánea al WhatsApp de los novios.' },
    ],
  },
  mobile: {
    eyebrow: 'En su bolsillo',
    title: 'Así llega a su teléfono',
    body: 'Un solo enlace por WhatsApp. Se abre a pantalla completa, sin apps ni descargas, y funciona igual en iPhone, Android y tablet.',
    bullets: ['Carga en menos de dos segundos', 'Código QR para la mesa de recepción', 'Botón de confirmación directo al chat'],
  },
  collections: { eyebrow: 'Colecciones', title: 'Una escena para cada celebración', hint: 'Arrástralo o usa las flechas' },
  comparison: {
    eyebrow: 'Comparativa',
    title: 'La diferencia LUXE',
    hint: 'Arrastra el sello para comparar',
    luxe: ['Sobre 3D con apertura animada y sello de cera', 'Dominio propio, sin marcas de terceros', 'RSVP con panel en vivo y recordatorios', 'Música, galería inmersiva y cuenta regresiva', 'Diseño compuesto a mano por el atelier'],
    traditional: ['Imagen estática enviada por chat', 'Plantilla con logo de la plataforma', 'Confirmaciones contadas a mano', 'Sin galería, sin música, sin mapa', 'Mismo diseño que otros mil eventos'],
  },
  pricing: { eyebrow: 'Inversión', title: 'Planes & precios', mostChosen: 'Más elegido' },
  models: { eyebrow: 'Modelos', title: 'Invitaciones a tu medida', subtitle: 'Ocho diseños base · con código QR, botón de apertura y confirmación en línea', qr: 'Código QR', open: 'Abrir', seeAll: 'Ver todos los modelos' },
  contact: {
    eyebrow: 'Atelier de lujo sereno',
    title: 'Comienza tu viaje',
    body: 'Cuéntanos la fecha y el lugar. En menos de 24 horas recibes una propuesta con boceto y demo navegable de tu invitación.',
    submit: 'Solicitar consulta',
    successTitle: 'Solicitud recibida',
    successBody: 'Te escribimos en menos de 24 horas con el boceto y la demo navegable.',
    again: 'Enviar otra',
    fields: { name: 'Nombre', contact: 'WhatsApp o email', category: 'Tipo de evento', date: 'Fecha del evento', message: 'Cuéntanos sobre tu evento' },
  },
  footer: { rights: 'Todos los derechos reservados', coverage: 'Cochabamba, Bolivia · Entregas a todo el país' },
} as const

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T

export type Dictionary = Widen<typeof es>
