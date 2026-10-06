import { hasFeature, type Allowance, type DesignChange } from './allowance'

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
    /** Número de mesa + QR de acceso: mesas y puerta a la vez. */
    mesaQr: string
    album: string
    /** Los detalles inspirados en su evento: lo que hacemos en el plan de todo el día. */
    detalles: string
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
export type FilaComparativa = { clave: keyof FilasDeComparativa; etiqueta: string; valores: CeldaComparativa[] }

/** Una fila por límite, con una celda por plan en el orden en que llegan. */
export function filasComparativas(planes: readonly Allowance[], t: TextosComparativa): FilaComparativa[] {
  const siNo = (v: boolean): CeldaComparativa => ({ texto: v ? t.si : t.no, incluido: v })
  const tope = (v: number | null): CeldaComparativa =>
    v === null ? { texto: t.sinLimite, incluido: true } : v <= 0 ? { texto: t.no, incluido: false } : { texto: t.hasta.replace('{n}', String(v)), incluido: true }

  const todos = (): CeldaComparativa => siNo(true)
  const celdas: Record<keyof FilasDeComparativa, (a: Allowance) => CeldaComparativa> = {
    basicos: todos,
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
    grupos: (a) => tope(a.maxGuestGroups),
    fotos: (a) => tope(a.maxGalleryPhotos),
    fotosInvitados: (a) => siNo(a.guestPhotos),
    contrasena: (a) => siNo(a.eventPassword),
    csv: (a) => siNo(a.csvImport),
    mesas: (a) => siNo(a.seating),
    regalos: (a) => siNo(a.registry),
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
    valores: planes.map(celdas[clave]),
  }))
}
