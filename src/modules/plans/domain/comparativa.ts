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
  filas: {
    grupos: string
    fotos: string
    fotosInvitados: string
    contrasena: string
    csv: string
    mesas: string
    regalos: string
    puerta: string
    porteros: string
    planners: string
    tareas: string
    plannerCompleto: string
    plannerTotal: string
    enLinea: string
    modelo: string
  }
  modelo: Record<DesignChange, string>
}

export type CeldaComparativa = { texto: string; incluido: boolean }
export type FilaComparativa = { clave: keyof TextosComparativa['filas']; etiqueta: string; valores: CeldaComparativa[] }

/** Una fila por límite, con una celda por plan en el orden en que llegan. */
export function filasComparativas(planes: readonly Allowance[], t: TextosComparativa): FilaComparativa[] {
  const siNo = (v: boolean): CeldaComparativa => ({ texto: v ? t.si : t.no, incluido: v })
  const tope = (v: number | null): CeldaComparativa =>
    v === null ? { texto: t.sinLimite, incluido: true } : v <= 0 ? { texto: t.no, incluido: false } : { texto: t.hasta.replace('{n}', String(v)), incluido: true }

  const celdas: Record<keyof TextosComparativa['filas'], (a: Allowance) => CeldaComparativa> = {
    grupos: (a) => tope(a.maxGuestGroups),
    fotos: (a) => tope(a.maxGalleryPhotos),
    fotosInvitados: (a) => siNo(a.guestPhotos),
    contrasena: (a) => siNo(a.eventPassword),
    csv: (a) => siNo(a.csvImport),
    mesas: (a) => siNo(a.seating),
    regalos: (a) => siNo(a.registry),
    puerta: (a) => siNo(a.checkin),
    porteros: (a) => tope(a.maxDoorPorters),
    planners: (a) => tope(a.maxHiredPlanners),
    tareas: () => siNo(true),
    plannerCompleto: (a) => siNo(hasFeature(a, 'plannerCompleto')),
    plannerTotal: (a) => siNo(hasFeature(a, 'plannerTotal')),
    enLinea: (a) => ({ texto: t.dias.replace('{n}', String(a.onlineDays)), incluido: true }),
    modelo: (a) => ({ texto: t.modelo[a.designChange], incluido: a.designChange !== 'ninguno' }),
  }

  return (Object.keys(t.filas) as Array<keyof TextosComparativa['filas']>).map((clave) => ({
    clave,
    etiqueta: t.filas[clave],
    valores: planes.map(celdas[clave]),
  }))
}
