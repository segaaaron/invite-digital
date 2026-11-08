import { hasFeature, type Allowance, type DesignChange } from './allowance'
import { extraDisponible, type EfectoDeExtra } from './extras'

/**
 * Los textos de la comparativa. Llegan de fuera —el diccionario de la web, o el español del
 * panel— para que la tabla se genere **desde los límites** y no desde un texto escrito a mano
 * que prometa lo que el servidor no corta.
 */
export type TextosComparativa = {
  si: string
  no: string
  sinLimite: string
  /** «Hasta {n}». */
  hasta: string
  /** «{n} días». */
  dias: string
  /** «{n} meses», para lo que dura en línea a partir de seis meses (V4: «6 meses»). */
  meses?: string
  /**
   * Las filas que se pintan, **en este orden**: la web elige las del documento de cambios y el
   * panel las de sus límites. Una clave que no esté, no sale.
   */
  filas: Partial<FilasDeComparativa>
  modelo: Record<DesignChange, string>
}

type FilasDeComparativa = {
    /** Lo que traen todos: portada, cuenta regresiva, mapa, cronograma, vestimenta y música. */
    basicos: string
    /**
     * «Sugerencia de regalos»: la traen **los tres planes** y aun así se compara (documento del
     * 30 oct), porque la tarjeta de Atelier la promete y la tabla la dejaba en blanco.
     */
    sugerencia: string
    /** Rondas de corrección del diseño por encargo. Sin rondas, el plan es de autoservicio. */
    rondas: string
    /** «Lista en»: los días que tarda la primera versión. */
    entrega: string
    /** «Recordatorios: a quién escribir hoy», la cola del panel. Es un límite del plan (`0101`). */
    recordatorios: string
    confirmacion: string
    lista: string
    pases: string
    calendario: string
    textos: string
    /** Los cambios de diseño que hacemos nosotros en Gala e Imperial (van con «Colores y letra»). */
    colores: string
    tipografias: string
    secciones: string
    /** El panel descargable: la lista de invitados que se exporta (va con importar/descargar). */
    panel: string
    /**
     * Número de mesa + QR de acceso, las dos cosas en una fila. **Ya no la escribe ningún
     * diccionario**: el documento del 30 oct la reparte entre `mesas` y `puerta`. Se queda porque
     * la tabla la sabe pintar si alguien vuelve a pedirla.
     */
    mesaQr: string
    album: string
    /** Los detalles inspirados en su evento: lo que hacemos en el plan de todo el día. */
    detalles: string
    /** Luxury, el planner con IA: el plan lo trae según Admin › Asistente (ya resuelto en `asistente`). */
    luxury: string
    grupos: string
    fotos: string
    fotosInvitados: string
    contrasena: string
    csv: string
    mesas: string
    regalos: string
    formas: string
    libro: string
    estilo: string
    puerta: string
    porteros: string
    planners: string
    tareas: string
    plannerCompleto: string
    plannerTotal: string
    enLinea: string
    modelo: string
}

export type CeldaComparativa = { texto: string; incluido: boolean }

/**
 * **En qué parte de la tabla va cada fila** (20 oct, maqueta del usuario): la invitación, los regalos, el
 * control de invitados y la entrega. Agrupadas se leen; en una lista de veinticinco filas seguidas, no.
 *
 * El grupo es del dominio y no del diccionario porque dice **qué es** cada límite, no cómo se llama: el
 * texto se traduce, el sitio de la fila no.
 */
export type GrupoDeComparativa = 'invitacion' | 'regalos' | 'control' | 'entrega'

const GRUPO: Record<keyof FilasDeComparativa, GrupoDeComparativa> = {
  basicos: 'invitacion',
  sugerencia: 'regalos',
  rondas: 'entrega',
  entrega: 'entrega',
  recordatorios: 'control',
  confirmacion: 'control',
  lista: 'control',
  pases: 'control',
  calendario: 'invitacion',
  textos: 'invitacion',
  colores: 'invitacion',
  tipografias: 'invitacion',
  secciones: 'invitacion',
  panel: 'control',
  mesaQr: 'control',
  album: 'regalos',
  detalles: 'invitacion',
  luxury: 'control',
  grupos: 'control',
  fotos: 'invitacion',
  fotosInvitados: 'regalos',
  contrasena: 'invitacion',
  csv: 'control',
  mesas: 'control',
  regalos: 'regalos',
  formas: 'regalos',
  libro: 'regalos',
  estilo: 'invitacion',
  puerta: 'control',
  porteros: 'control',
  planners: 'control',
  tareas: 'control',
  plannerCompleto: 'control',
  plannerTotal: 'control',
  enLinea: 'entrega',
  modelo: 'invitacion',
}

export const grupoDeFila = (clave: keyof FilasDeComparativa): GrupoDeComparativa => GRUPO[clave]

export type FilaComparativa = { clave: keyof FilasDeComparativa; etiqueta: string; valores: CeldaComparativa[]; grupo: GrupoDeComparativa }

/** Una fila por límite, con una celda por plan en el orden en que llegan. */
export function filasComparativas(planes: readonly Allowance[], t: TextosComparativa): FilaComparativa[] {
  const siNo = (v: boolean): CeldaComparativa => ({ texto: v ? t.si : t.no, incluido: v })
  const tope = (v: number | null): CeldaComparativa =>
    v === null ? { texto: t.sinLimite, incluido: true } : v <= 0 ? { texto: t.no, incluido: false } : { texto: t.hasta.replace('{n}', String(v)), incluido: true }

  const todos = (): CeldaComparativa => siNo(true)
  /** Un número del encargo (rondas, días). Nulo o cero: el plan no lo trae. */
  const cuenta = (v: number | null | undefined, texto: (n: number) => string): CeldaComparativa =>
    v === null || v === undefined || v <= 0 ? { texto: t.no, incluido: false } : { texto: texto(v), incluido: true }

  const celdas: Record<keyof FilasDeComparativa, (a: Allowance) => CeldaComparativa> = {
    basicos: todos,
    sugerencia: todos,
    rondas: (a) => cuenta(a.correctionRounds, (n) => String(n)),
    entrega: (a) => cuenta(a.deliveryDays, (n) => t.dias.replace('{n}', String(n))),
    recordatorios: (a) => siNo(hasFeature(a, 'reminders')),
    confirmacion: todos,
    lista: todos,
    pases: todos,
    calendario: todos,
    textos: todos,
    colores: (a) => siNo(hasFeature(a, 'estilo')),
    tipografias: (a) => siNo(hasFeature(a, 'estilo')),
    secciones: (a) => siNo(hasFeature(a, 'estilo')),
    panel: (a) => siNo(a.csvImport),
    mesaQr: (a) => siNo(a.seating && a.checkin),
    album: (a) => siNo(a.guestPhotos),
    detalles: (a) => siNo(hasFeature(a, 'plannerTotal')),
    luxury: (a) => siNo(a.asistente === true),
    grupos: (a) => tope(a.maxGuestGroups),
    fotos: (a) => tope(a.maxGalleryPhotos),
    fotosInvitados: (a) => siNo(a.guestPhotos),
    contrasena: (a) => siNo(a.eventPassword),
    csv: (a) => siNo(a.csvImport),
    mesas: (a) => siNo(a.seating),
    // **Las dos banderas.** La etiqueta del 30 oct junta la lista de tiendas (`registry`) con la
    // lluvia de sobres y el QR (`giftWays`), y las dos se cortan por separado en el servidor
    // (`requireFeature('registry')` y `requireFeature('giftWays')`). Leyendo solo una, un plan con
    // lista y sin sobres salía con ✓ al lado de «lluvia de sobres».
    regalos: (a) => siNo(a.registry && hasFeature(a, 'giftWays')),
    formas: (a) => siNo(hasFeature(a, 'giftWays')),
    libro: (a) => siNo(hasFeature(a, 'guestbook')),
    estilo: (a) => siNo(hasFeature(a, 'estilo')),
    puerta: (a) => siNo(a.checkin),
    porteros: (a) => tope(a.maxDoorPorters),
    planners: (a) => tope(a.maxHiredPlanners),
    tareas: () => siNo(true),
    plannerCompleto: (a) => siNo(hasFeature(a, 'plannerCompleto')),
    plannerTotal: (a) => siNo(hasFeature(a, 'plannerTotal')),
    enLinea: (a) => ({
      texto:
        t.meses !== undefined && a.onlineDays >= 180 && a.onlineDays % 30 === 0
          ? t.meses.replace('{n}', String(a.onlineDays / 30))
          : t.dias.replace('{n}', String(a.onlineDays)),
      incluido: true,
    }),
    modelo: (a) => ({ texto: t.modelo[a.designChange], incluido: a.designChange !== 'ninguno' }),
  }

  return (Object.entries(t.filas) as Array<[keyof FilasDeComparativa, string]>).map(([clave, etiqueta]) => ({
    clave,
    etiqueta,
    grupo: GRUPO[clave],
    valores: planes.map(celdas[clave]),
  }))
}

/** Un extra que se ve en la celda del plan que no lo trae: «+Bs 150», ya escrito por quien conoce la moneda. */
export type PrecioDeFila = { readonly fila: FilaComparativa['clave']; readonly efecto: EfectoDeExtra; readonly precio: string }

/** Lo que va entre paréntesis en una fila con tope por evento (el álbum: «hasta 500 fotos»). `{precio}` se rellena. */
export type NotaDeFila = { readonly incluido: string; readonly extra: string }

/**
 * **El precio del extra, en la celda del plan que no lo trae** (7 nov). «+Bs 150» dice a la vez que no viene
 * incluido y cuánto cuesta sumarlo. Solo donde el extra **se puede comprar de verdad** (`extraDisponible`): el
 * Día D no se vende sobre Atelier, y allí la celda sigue en «–» en vez de prometer lo que el panel rechaza.
 */
export function conPreciosDeExtras(
  filas: readonly FilaComparativa[],
  limites: readonly Allowance[],
  precios: readonly PrecioDeFila[],
  notas: Partial<Record<FilaComparativa['clave'], NotaDeFila>> = {},
): FilaComparativa[] {
  return filas.map((fila) => {
    const precio = precios.find((p) => p.fila === fila.clave)
    const nota = notas[fila.clave]
    return {
      ...fila,
      valores: fila.valores.map((celda, i) => {
        const a = limites[i]
        if (celda.incluido) return nota === undefined ? celda : { texto: nota.incluido, incluido: true }
        if (precio === undefined || a === undefined || !extraDisponible(a, precio.efecto).ok) return celda
        const texto = `+${precio.precio}`
        return { texto: nota === undefined ? texto : nota.extra.replace('{precio}', texto), incluido: false }
      }),
    }
  })
}
