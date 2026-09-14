import { err, ok, type Result } from '@/shared/result'
import { formatoWhatsapp, normalizarWhatsapp } from '@/shared/whatsapp'

/**
 * «La web»: los datos del negocio que el admin cambia sin desplegar.
 *
 * **Una sola fuente**, y es lo que pide el SEO local: nombre, dirección, teléfono y web
 * idénticos en el pie, en la sección de contacto, en los correos y en el marcado
 * `LocalBusiness`. Cuando cada sitio tenía su copia escrita en el código, cambiar el
 * WhatsApp era un despliegue y bastaba olvidarse de una para que no coincidieran.
 *
 * Se guarda como **un solo JSON** en `app_settings`: se lee entero, se valida entero y se
 * versiona entero —el historial guarda la foto completa y restaurar es volver a guardarla—.
 *
 * Módulo puro: ni base ni reloj.
 */

export type Bilingue = { readonly es: string; readonly en: string }
export type Cifra = { readonly valor: string; readonly es: string; readonly en: string }
export type Testimonio = {
  readonly autor: string
  readonly rol: Bilingue
  readonly cita: Bilingue
  /** Ruta de la fotografía; vacía pinta la inicial. */
  readonly foto: string
  /** Solo se publica lo confirmado: un testimonio sin respaldo es una afirmación falsa. */
  readonly confirmado: boolean
}
export type TextoLegal = Bilingue & { readonly publicada: boolean }
export type SeoPagina = { readonly titulo: Bilingue; readonly descripcion: Bilingue }

export type SiteSettings = {
  /** Formato internacional (`+59170012345`) o vacío si todavía no se configuró. */
  readonly whatsapp: string
  /** «Respondemos de lunes a sábado, de 9 a 19 h». Vacío no se enseña. */
  readonly horario: Bilingue
  readonly mensajes: { readonly general: Bilingue; readonly plan: Bilingue; readonly soporte: Bilingue }
  readonly direccion: string
  readonly ciudad: string
  readonly pais: string
  readonly cobertura: Bilingue
  readonly redes: { readonly instagram: string; readonly facebook: string; readonly tiktok: string }
  readonly cifras: { readonly visibles: boolean; readonly items: readonly [Cifra, Cifra, Cifra, Cifra] }
  readonly marcas: readonly string[]
  readonly testimonios: readonly Testimonio[]
  readonly legal: { readonly privacidad: TextoLegal; readonly terminos: TextoLegal }
  /** Vacío es «el título de siempre», el del diccionario. */
  readonly seo: { readonly inicio: SeoPagina; readonly colecciones: SeoPagina }
}

export const SITE_SETTINGS_KEY = 'site.settings'

const SEO_VACIO: SeoPagina = { titulo: { es: '', en: '' }, descripcion: { es: '', en: '' } }

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  whatsapp: '',
  horario: { es: '', en: '' },
  mensajes: {
    general: {
      es: 'Hola, me interesa una invitación digital. ¿Me cuentan cómo empezamos?',
      en: 'Hello, I am interested in a digital invitation. How do we get started?',
    },
    plan: {
      es: 'Hola, quiero la invitación del plan {plan} ({precio}). ¿Me cuentan los siguientes pasos?',
      en: "Hello, I'd like the {plan} invitation plan ({precio}). Could you walk me through the next steps?",
    },
    soporte: {
      es: 'Hola, necesito ayuda con mi panel de Luxury Atelier.',
      en: 'Hello, I need help with my Luxury Atelier panel.',
    },
  },
  direccion: '',
  ciudad: 'Cochabamba',
  pais: 'Bolivia',
  cobertura: { es: 'Entregas a todo el país', en: 'Delivering nationwide' },
  redes: { instagram: '', facebook: '', tiktok: '' },
  // Las cifras que la portada enseñaba escritas en el código. **Ocultas por defecto**: son
  // afirmaciones de negocio y se publican cuando el admin las confirma.
  cifras: {
    visibles: false,
    items: [
      { valor: '480', es: 'Eventos entregados', en: 'Events delivered' },
      { valor: '72h', es: 'Entrega promedio', en: 'Average delivery' },
      { valor: '94%', es: 'Confirmación RSVP', en: 'RSVP completion' },
      { valor: '16', es: 'Países alcanzados', en: 'Countries reached' },
    ],
  },
  marcas: [],
  testimonios: [
    {
      autor: 'Daniela Ortiz',
      rol: { es: 'Wedding planner · Cochabamba', en: 'Wedding planner · Cochabamba' },
      cita: {
        es: 'Mandamos el enlace un martes y el viernes ya teníamos el 90% de las confirmaciones. Ninguna novia había visto algo así en Bolivia.',
        en: 'We sent the link on a Tuesday and by Friday we already had ninety percent of the confirmations. No bride in Bolivia had seen anything like it.',
      },
      foto: '/site/testimonios/daniela.avif',
      // El único testimonio real que tenía la web: se conserva publicado.
      confirmado: true,
    },
  ],
  legal: {
    privacidad: {
      publicada: false,
      es: [
        '## Qué datos recogemos',
        'Los que escribes en el formulario de contacto o al hacer un pedido (nombre, WhatsApp o correo, fecha del evento) y, si organizas un evento, los de tus invitados: nombre, teléfono, confirmación y restricciones alimentarias.',
        '',
        '## Para qué los usamos',
        'Solo para responderte, preparar tu invitación y gestionar las confirmaciones de tu evento. No los vendemos ni los cedemos a terceros.',
        '',
        '## Cuánto tiempo los guardamos',
        'Los datos de los invitados se anonimizan cuando vence el plazo de retención del evento. Las consultas de la web se anonimizan al año.',
        '',
        '## Tus derechos',
        'Puedes pedirnos acceder a tus datos, corregirlos o borrarlos escribiéndonos por WhatsApp.',
      ].join('\n'),
      en: [
        '## What we collect',
        'What you write in the contact form or when placing an order (name, WhatsApp or email, event date) and, if you host an event, your guests’ details: name, phone, RSVP and dietary restrictions.',
        '',
        '## Why we use it',
        'Only to reply to you, prepare your invitation and manage your event’s RSVPs. We do not sell or share it with third parties.',
        '',
        '## How long we keep it',
        'Guest data is anonymised when the event’s retention period ends. Website enquiries are anonymised after one year.',
        '',
        '## Your rights',
        'You can ask us to access, correct or delete your data by writing to us on WhatsApp.',
      ].join('\n'),
    },
    terminos: {
      publicada: false,
      es: [
        '## El servicio',
        'Diseñamos, publicamos y mantenemos invitaciones digitales para eventos, con confirmación de asistencia y herramientas de organización según el plan contratado.',
        '',
        '## Pagos',
        'Los pedidos se pagan por transferencia. El servicio empieza cuando confirmamos el pago.',
        '',
        '## Contenido',
        'Eres responsable de los textos, fotografías y música que subes, y de tener derecho a usarlos.',
      ].join('\n'),
      en: [
        '## The service',
        'We design, publish and maintain digital event invitations, with RSVP and planning tools according to the plan purchased.',
        '',
        '## Payments',
        'Orders are paid by bank transfer. The service starts once we confirm the payment.',
        '',
        '## Content',
        'You are responsible for the texts, photos and music you upload, and for having the right to use them.',
      ].join('\n'),
    },
  },
  seo: { inicio: SEO_VACIO, colecciones: SEO_VACIO },
}

export type SiteSettingsError = { readonly campo: string; readonly mensaje: string }

const fallo = (campo: string, mensaje: string): Result<never, SiteSettingsError> => err({ campo, mensaje })

/* ─── WhatsApp ─────────────────────────────────────────────────────────────────── */

export { enlaceWhatsapp, formatoWhatsapp } from '@/shared/whatsapp'

export const mensajePlan = (plantilla: string, plan: string, precio: string): string =>
  plantilla.replaceAll('{plan}', plan).replaceAll('{precio}', precio)

/* ─── Validación ───────────────────────────────────────────────────────────────── */

const REDES = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
  tiktok: ['tiktok.com'],
} as const

function redValida(url: string, dominios: readonly string[]): boolean {
  if (url === '') return true
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && dominios.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

const recortar = (b: Bilingue): Bilingue => ({ es: b.es.trim(), en: b.en.trim() })

function largo(campo: string, texto: string, maximo: number): Result<never, SiteSettingsError> | null {
  return texto.length > maximo ? fallo(campo, `Hasta ${maximo} caracteres.`) : null
}

/**
 * Valida lo que envía el formulario y lo deja listo para guardar. Devuelve **el campo** que
 * falla, para que la pantalla lo marque donde está y no en un aviso genérico arriba.
 */
export function leerSiteSettings(entrada: SiteSettings): Result<SiteSettings, SiteSettingsError> {
  const whatsapp = normalizarWhatsapp(entrada.whatsapp)
  if (whatsapp === null) return fallo('whatsapp', 'Escribe el número con su código de país, por ejemplo +591 700 12345.')

  const horario = recortar(entrada.horario)
  for (const [campo, texto, maximo] of [
    ['horario', horario.es, 80],
    ['horario', horario.en, 80],
    ['direccion', entrada.direccion.trim(), 160],
    ['ciudad', entrada.ciudad.trim(), 80],
    ['pais', entrada.pais.trim(), 60],
    ['cobertura', entrada.cobertura.es.trim(), 120],
    ['cobertura', entrada.cobertura.en.trim(), 120],
  ] as const) {
    const r = largo(campo, texto, maximo)
    if (r) return r
  }
  if (entrada.ciudad.trim() === '') return fallo('ciudad', 'La ciudad es obligatoria: sale en el pie y en Google.')
  if (entrada.pais.trim() === '') return fallo('pais', 'El país es obligatorio.')

  const mensajes = {
    general: recortar(entrada.mensajes.general),
    plan: recortar(entrada.mensajes.plan),
    soporte: recortar(entrada.mensajes.soporte),
  }
  for (const clave of ['general', 'plan', 'soporte'] as const) {
    for (const idioma of ['es', 'en'] as const) {
      if (mensajes[clave][idioma].length > 300) return fallo(`mensajes.${clave}`, 'Un mensaje de WhatsApp de hasta 300 caracteres: corto y natural.')
    }
  }

  const redes = {
    instagram: entrada.redes.instagram.trim(),
    facebook: entrada.redes.facebook.trim(),
    tiktok: entrada.redes.tiktok.trim(),
  }
  for (const red of ['instagram', 'facebook', 'tiktok'] as const) {
    if (!redValida(redes[red], REDES[red])) {
      return fallo(`redes.${red}`, `Pega el enlace completo de tu perfil de ${red === 'tiktok' ? 'TikTok' : red === 'facebook' ? 'Facebook' : 'Instagram'}, empezando por https://.`)
    }
  }

  const items = entrada.cifras.items.map((c) => ({ valor: c.valor.trim(), es: c.es.trim(), en: c.en.trim() }))
  for (const [i, c] of items.entries()) {
    if (c.valor.length > 10 || c.es.length > 40 || c.en.length > 40) return fallo(`cifras.${i}`, 'La cifra hasta 10 caracteres y la etiqueta hasta 40.')
    if (entrada.cifras.visibles && (c.valor === '' || c.es === '' || c.en === '')) {
      return fallo(`cifras.${i}`, 'Para publicar la franja, las cuatro cifras necesitan valor y etiqueta en los dos idiomas.')
    }
  }

  const marcas = entrada.marcas.map((m) => m.trim()).filter((m) => m !== '')
  if (marcas.length > 12) return fallo('marcas', 'Hasta 12 marcas.')
  if (marcas.some((m) => m.length > 40)) return fallo('marcas', 'Cada marca hasta 40 caracteres.')

  const testimonios = entrada.testimonios.map((t) => ({
    autor: t.autor.trim(),
    rol: recortar(t.rol),
    cita: recortar(t.cita),
    foto: t.foto.trim(),
    confirmado: t.confirmado,
  }))
  if (testimonios.length > 6) return fallo('testimonios', 'Hasta 6 testimonios.')
  for (const [i, t] of testimonios.entries()) {
    if (t.autor === '' || t.cita.es === '') return fallo(`testimonios.${i}`, 'Cada testimonio necesita autor y cita en español.')
    if (t.cita.es.length > 400 || t.cita.en.length > 400) return fallo(`testimonios.${i}`, 'La cita hasta 400 caracteres.')
    if (t.foto !== '' && !/^\/site\/[a-z0-9/_-]+\.(avif|webp|jpg|png)$/.test(t.foto)) return fallo(`testimonios.${i}`, 'La foto tiene que ser una ruta de la web, como /site/testimonios/nombre.avif.')
  }

  const legal = {
    privacidad: { publicada: entrada.legal.privacidad.publicada, ...recortar(entrada.legal.privacidad) },
    terminos: { publicada: entrada.legal.terminos.publicada, ...recortar(entrada.legal.terminos) },
  }
  for (const clave of ['privacidad', 'terminos'] as const) {
    const texto = legal[clave]
    if (texto.publicada && (texto.es === '' || texto.en === '')) {
      return fallo(`legal.${clave}`, 'Para publicarla, escribe el texto en los dos idiomas.')
    }
    if (texto.es.length > 20_000 || texto.en.length > 20_000) return fallo(`legal.${clave}`, 'Hasta 20.000 caracteres.')
  }

  const seoDe = (p: SeoPagina): SeoPagina => ({ titulo: recortar(p.titulo), descripcion: recortar(p.descripcion) })
  const seo = { inicio: seoDe(entrada.seo.inicio), colecciones: seoDe(entrada.seo.colecciones) }
  for (const pagina of ['inicio', 'colecciones'] as const) {
    const s = seo[pagina]
    // Lo que Google enseña sin cortar: unos 60 caracteres de título y 160 de descripción.
    if (s.titulo.es.length > 70 || s.titulo.en.length > 70) return fallo(`seo.${pagina}`, 'El título hasta 70 caracteres: Google corta lo demás.')
    if (s.descripcion.es.length > 170 || s.descripcion.en.length > 170) return fallo(`seo.${pagina}`, 'La descripción hasta 170 caracteres.')
  }

  return ok({
    whatsapp,
    horario,
    mensajes,
    direccion: entrada.direccion.trim(),
    ciudad: entrada.ciudad.trim(),
    pais: entrada.pais.trim(),
    cobertura: recortar(entrada.cobertura),
    redes,
    cifras: { visibles: entrada.cifras.visibles, items: items as unknown as SiteSettings['cifras']['items'] },
    marcas,
    testimonios,
    legal,
    seo,
  })
}

/* ─── Lectura tolerante ────────────────────────────────────────────────────────── */

const texto = (v: unknown, defecto: string): string => (typeof v === 'string' ? v : defecto)
const bool = (v: unknown, defecto: boolean): boolean => (typeof v === 'boolean' ? v : defecto)
const objeto = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const bilingue = (v: unknown, d: Bilingue): Bilingue => {
  const o = objeto(v)
  return { es: texto(o.es, d.es), en: texto(o.en, d.en) }
}

/**
 * Lee la fila guardada **sin lanzar nunca**. Un JSON roto o de una versión anterior no
 * puede tumbar la web entera: lo que falte o no tenga el tipo esperado sale del valor por
 * defecto. Es la misma regla que el contenido de una invitación.
 */
export function parseSiteSettings(crudo: string | undefined): SiteSettings {
  if (crudo === undefined) return DEFAULT_SITE_SETTINGS
  let datos: Record<string, unknown>
  try {
    datos = objeto(JSON.parse(crudo))
  } catch {
    return DEFAULT_SITE_SETTINGS
  }
  const d = DEFAULT_SITE_SETTINGS

  const mensajes = objeto(datos.mensajes)
  const redes = objeto(datos.redes)
  const cifras = objeto(datos.cifras)
  const items = Array.isArray(cifras.items) ? cifras.items : []
  const legal = objeto(datos.legal)
  const seo = objeto(datos.seo)
  const seoDe = (v: unknown, def: SeoPagina): SeoPagina => {
    const o = objeto(v)
    return { titulo: bilingue(o.titulo, def.titulo), descripcion: bilingue(o.descripcion, def.descripcion) }
  }
  const legalDe = (v: unknown, def: TextoLegal): TextoLegal => {
    const o = objeto(v)
    return { publicada: bool(o.publicada, def.publicada), es: texto(o.es, def.es), en: texto(o.en, def.en) }
  }

  return {
    whatsapp: texto(datos.whatsapp, d.whatsapp),
    horario: bilingue(datos.horario, d.horario),
    mensajes: {
      general: bilingue(mensajes.general, d.mensajes.general),
      plan: bilingue(mensajes.plan, d.mensajes.plan),
      soporte: bilingue(mensajes.soporte, d.mensajes.soporte),
    },
    direccion: texto(datos.direccion, d.direccion),
    ciudad: texto(datos.ciudad, d.ciudad),
    pais: texto(datos.pais, d.pais),
    cobertura: bilingue(datos.cobertura, d.cobertura),
    redes: {
      instagram: texto(redes.instagram, d.redes.instagram),
      facebook: texto(redes.facebook, d.redes.facebook),
      tiktok: texto(redes.tiktok, d.redes.tiktok),
    },
    cifras: {
      visibles: bool(cifras.visibles, d.cifras.visibles),
      items: d.cifras.items.map((def, i) => {
        const o = objeto(items[i])
        return { valor: texto(o.valor, def.valor), es: texto(o.es, def.es), en: texto(o.en, def.en) }
      }) as unknown as SiteSettings['cifras']['items'],
    },
    marcas: Array.isArray(datos.marcas) ? datos.marcas.filter((m): m is string => typeof m === 'string') : d.marcas,
    testimonios: Array.isArray(datos.testimonios)
      ? datos.testimonios.map((t) => {
          const o = objeto(t)
          return {
            autor: texto(o.autor, ''),
            rol: bilingue(o.rol, { es: '', en: '' }),
            cita: bilingue(o.cita, { es: '', en: '' }),
            foto: texto(o.foto, ''),
            confirmado: bool(o.confirmado, false),
          }
        })
      : d.testimonios,
    legal: { privacidad: legalDe(legal.privacidad, d.legal.privacidad), terminos: legalDe(legal.terminos, d.legal.terminos) },
    seo: { inicio: seoDe(seo.inicio, d.seo.inicio), colecciones: seoDe(seo.colecciones, d.seo.colecciones) },
  }
}

/** Qué bloques cambiaron entre dos versiones, ordenados. Es lo que se anota en la auditoría. */
export function camposCambiados(antes: SiteSettings, despues: SiteSettings): string[] {
  return (Object.keys(despues) as (keyof SiteSettings)[])
    .filter((clave) => JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave]))
    .sort()
}

/** Lo que la web pública necesita ya resuelto en un idioma. */
export type SitioPublico = {
  readonly whatsapp: string
  readonly whatsappVisible: string
  readonly horario: string
  readonly mensajeGeneral: string
  readonly mensajePlan: string
  readonly mensajeSoporte: string
  readonly direccion: string
  readonly ciudad: string
  readonly pais: string
  readonly cobertura: string
  readonly redes: SiteSettings['redes']
  readonly cifras: readonly { valor: string; etiqueta: string }[] | null
  readonly marcas: readonly string[]
  readonly testimonios: readonly { autor: string; rol: string; cita: string; foto: string }[]
  readonly privacidadPublicada: boolean
  readonly terminosPublicados: boolean
}

export function sitioPublico(s: SiteSettings, idioma: 'es' | 'en'): SitioPublico {
  const en = (b: Bilingue) => (idioma === 'en' && b.en !== '' ? b.en : b.es)
  return {
    whatsapp: s.whatsapp,
    whatsappVisible: formatoWhatsapp(s.whatsapp),
    horario: en(s.horario),
    mensajeGeneral: en(s.mensajes.general),
    mensajePlan: en(s.mensajes.plan),
    mensajeSoporte: en(s.mensajes.soporte),
    direccion: s.direccion,
    ciudad: s.ciudad,
    pais: s.pais,
    cobertura: en(s.cobertura),
    redes: s.redes,
    cifras: s.cifras.visibles ? s.cifras.items.map((c) => ({ valor: c.valor, etiqueta: idioma === 'en' ? c.en : c.es })) : null,
    marcas: s.marcas,
    testimonios: s.testimonios
      .filter((t) => t.confirmado)
      .map((t) => ({ autor: t.autor, rol: en(t.rol), cita: en(t.cita), foto: t.foto })),
    privacidadPublicada: s.legal.privacidad.publicada,
    terminosPublicados: s.legal.terminos.publicada,
  }
}
