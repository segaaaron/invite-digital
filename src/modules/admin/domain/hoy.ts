import { diaCorto } from '@/shared/format/fecha'
import type { Venta } from './ventas'
import type { Salud } from './salud'

/**
 * **«Hoy»: la bandeja única del admin** (28 de septiembre). Lo que pide acción, sacado de **las
 * mismas ventas y la misma salud** que enseñan Ventas y Eventos: antes Hoy leía sus propias filas
 * crudas y podía contar distinto que el tablero. Ahora no puede contradecirlos.
 *
 * Cuatro grupos: ventas que esperan, eventos en riesgo, cambios de plan y **oportunidades** (el
 * extra justo en el momento justo). Puro: la fecha llega como argumento.
 */

/** Una solicitud de cambio de plan pendiente: la única fila cruda que Hoy lee aparte. */
export type CambioDePlan = { readonly eventSlug: string; readonly eventTitle: string; readonly planSlug: string; readonly createdAt: Date }

/** Un evento, con su salud ya calculada y lo que hace falta para ofrecerle un extra. */
export type EventoDeHoy = {
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly salud: Salud
  readonly grupos: number
  readonly maxGrupos: number | null
  readonly plannerSuite: string | null
}

export type TonoAviso = 'no' | 'pending' | 'maybe' | 'ok'

export type Aviso = {
  /** Estable y única: sirve de `key` y de ancla en las pruebas. */
  readonly clave: string
  readonly tono: TonoAviso
  /** La palabra de la píldora. El color acompaña, nunca sustituye. */
  readonly etiqueta: string
  readonly titulo: string
  readonly detalle: string
  readonly href: string
  readonly accion: string
  /** Para ordenar: lo que más lleva esperando, primero. */
  readonly desde: number
}

const DIA = 86_400_000

/** Días de calendario entre dos fechas ISO. En UTC: `new Date('2026-09-14')` ya lo es. */
export const diasEntre = (desde: string, hasta: string): number =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA)

const FORMATO_BOLIVIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/La_Paz',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * El día de hoy **en Bolivia**. El servidor corre en UTC: a las ocho de la noche de La Paz
 * ya es mañana allí, y «faltan 3 días» saldría como «faltan 2».
 */
export const fechaEnBolivia = (instante: Date): string => FORMATO_BOLIVIA.format(instante)

const hace = (dias: number): string => (dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`)

const porAntiguedad = (a: Aviso, b: Aviso) => a.desde - b.desde

/** Por encima de esto, un tipo de aviso se resume en uno solo que lleva a su lista filtrada. */
const SUELTOS = 4
/** Hasta cuántos días por delante un evento en riesgo sube a Hoy. */
export const HORIZONTE_RIESGO = 90

export type Hoy = {
  readonly grupos: readonly { readonly id: string; readonly titulo: string; readonly avisos: readonly Aviso[] }[]
  readonly total: number
}

const VENTAS = '/panel/admin/ventas'

/** Los avisos de una etapa, sueltos o resumidos en uno que abre la lista de esa etapa. */
function deEtapa(
  ventas: readonly Venta[],
  clave: Venta['etapa'],
  forma: { etiqueta: string; tono: TonoAviso; accion: string; detalle: (v: Venta, dias: number) => string; resumen: (n: number) => string },
  diasDesde: (d: Date) => number,
): Aviso[] {
  const deAqui = ventas.filter((v) => v.etapa === clave).toSorted((a, b) => a.esperaDesde.getTime() - b.esperaDesde.getTime())
  const primera = deAqui[0]
  if (primera === undefined) return []
  if (deAqui.length > SUELTOS) {
    return [
      {
        clave: `resumen:${clave}`,
        tono: forma.tono,
        etiqueta: forma.etiqueta,
        titulo: forma.resumen(deAqui.length),
        detalle: `La que más espera, ${hace(diasDesde(primera.esperaDesde))}`,
        href: `${VENTAS}?vista=lista&etapa=${clave}`,
        accion: 'Abrir la lista',
        desde: primera.esperaDesde.getTime(),
      },
    ]
  }
  return deAqui.map((v) => ({
    clave: `venta:${v.clave}`,
    tono: forma.tono,
    etiqueta: forma.etiqueta,
    titulo: v.nombre,
    detalle: forma.detalle(v, diasDesde(v.esperaDesde)),
    href: `${VENTAS}?venta=${v.clave}`,
    accion: forma.accion,
    desde: v.esperaDesde.getTime(),
  }))
}

export function componerHoy(
  input: {
    ventas: readonly Venta[]
    eventos: readonly EventoDeHoy[]
    cambiosDePlan: readonly CambioDePlan[]
    /** Los efectos de extra que están a la venta: solo se ofrece lo que se vende. */
    extrasALaVenta: ReadonlySet<string>
    /** Las opiniones recién llegadas de los clientes (encuesta tras el evento). */
    opiniones?: readonly { slug: string; title: string; rating: number; comment: string | null; allowPublish: boolean; answeredAt: Date }[]
  },
  hoy: string,
): Hoy {
  const diasDesde = (instante: Date) => diasEntre(fechaEnBolivia(instante), hoy)
  const fechaDe = (v: Venta) => (v.fechaEvento === null ? '' : ` · evento el ${diaCorto(v.fechaEvento, hoy)}`)

  // Ventas: primero lo que ya es dinero (pagado sin evento, comprobantes), luego quien espera respuesta.
  const ventas: Aviso[] = [
    ...deEtapa(input.ventas, 'por_crear_evento', { etiqueta: 'Pagado', tono: 'no', accion: 'Crear el evento', detalle: (v) => `Pagó y espera su evento${fechaDe(v)}`, resumen: (n) => `${n} pagos sin su evento` }, diasDesde),
    ...deEtapa(input.ventas, 'por_revisar', { etiqueta: 'Comprobante', tono: 'pending', accion: 'Revisar', detalle: (_v, d) => `Subió su comprobante ${hace(d)}`, resumen: (n) => `${n} comprobantes por revisar` }, diasDesde),
    ...deEtapa(input.ventas, 'nueva', { etiqueta: 'Consulta', tono: 'maybe', accion: 'Contestar', detalle: (v, d) => `Escribió ${hace(d)}${fechaDe(v)}`, resumen: (n) => `${n} consultas sin contestar` }, diasDesde),
    ...deEtapa(
      input.ventas.filter((v) => v.urgente),
      'esperando_pago',
      { etiqueta: 'Sin pago', tono: 'maybe', accion: 'Recordar', detalle: (_v, d) => `Sin comprobante desde ${hace(d)}`, resumen: (n) => `${n} pedidos sin pago` },
      diasDesde,
    ),
  ]
  const conSaldo = input.ventas.filter((v) => v.etapa === 'saldo_pendiente' && v.fechaEvento !== null && diasEntre(hoy, v.fechaEvento) <= 30)
  for (const v of conSaldo) {
    ventas.push({
      clave: `saldo:${v.clave}`,
      tono: 'pending',
      etiqueta: 'Saldo',
      titulo: v.nombre,
      detalle: `El evento es en ${diasEntre(hoy, v.fechaEvento ?? hoy)} días y falta cobrar el saldo`,
      href: `${VENTAS}?venta=${v.clave}`,
      accion: 'Cobrar',
      desde: v.esperaDesde.getTime(),
    })
  }

  // Eventos en riesgo: lo de la salud, lo más cercano arriba.
  const riesgos: Aviso[] = input.eventos
    .filter((e) => e.salud.tono !== 'ok')
    .map((e) => ({ e, dias: diasEntre(hoy, e.eventDate) }))
    .filter(({ dias }) => dias >= 0 && dias <= HORIZONTE_RIESGO)
    .map(({ e }) => ({
      clave: `riesgo:${e.slug}`,
      tono: e.salud.tono === 'risk' ? ('no' as const) : ('maybe' as const),
      etiqueta: e.salud.tono === 'risk' ? 'En riesgo' : 'Atención',
      titulo: e.title,
      detalle: e.salud.alertas.length > 1 ? `${e.salud.texto} · y ${e.salud.alertas.length - 1} más` : e.salud.texto,
      href: `/panel/admin/eventos?evento=${e.slug}`,
      accion: 'Ver',
      desde: Date.parse(`${e.eventDate}T00:00:00Z`),
    }))
    .sort(porAntiguedad)

  const cambios: Aviso[] = input.cambiosDePlan
    .map((c) => ({
      clave: `plan:${c.eventSlug}`,
      tono: 'pending' as const,
      etiqueta: 'Cambio de plan',
      titulo: c.eventTitle,
      detalle: `Pide pasar a ${c.planSlug} · ${hace(diasDesde(c.createdAt))}`,
      href: `/panel/eventos/${c.eventSlug}/configuracion`,
      accion: 'Decidir',
      desde: c.createdAt.getTime(),
    }))
    .sort(porAntiguedad)

  // Oportunidades: el extra justo en el momento justo, solo si se vende.
  const oportunidades: Aviso[] = []
  for (const e of input.eventos) {
    const dias = diasEntre(hoy, e.eventDate)
    if (input.extrasALaVenta.has('dia_d') && e.plannerSuite === 'completo' && dias >= 15 && dias <= 60) {
      oportunidades.push({ clave: `op-diad:${e.slug}`, tono: 'ok', etiqueta: 'Oportunidad', titulo: e.title, detalle: `Faltan ${dias} días: el Día D ordena proveedores y horarios`, href: `/panel/admin/eventos?evento=${e.slug}`, accion: 'Ofrecer', desde: dias })
    }
    if (input.extrasALaVenta.has('mas_grupos') && e.maxGrupos !== null && dias >= 0 && e.grupos >= e.maxGrupos * 0.85) {
      oportunidades.push({ clave: `op-grupos:${e.slug}`, tono: 'ok', etiqueta: 'Oportunidad', titulo: e.title, detalle: `Lleva ${e.grupos} de ${e.maxGrupos} invitaciones: ofrécele más`, href: `/panel/admin/eventos?evento=${e.slug}`, accion: 'Ofrecer', desde: dias })
    }
    if (dias <= -1 && dias >= -7) {
      oportunidades.push({ clave: `op-gracias:${e.slug}`, tono: 'ok', etiqueta: 'Gracias', titulo: e.title, detalle: `Fue ${hace(-dias)}: pídele su opinión y un testimonio`, href: `/panel/admin/eventos?evento=${e.slug}`, accion: 'Escribir', desde: -dias })
    }
  }

  // Las opiniones de las dos últimas semanas; con permiso y buena nota, se ofrece publicarla.
  const opiniones: Aviso[] = (input.opiniones ?? [])
    .filter((o) => diasDesde(o.answeredAt) <= 14)
    .map((o) => ({
      clave: `opinion:${o.slug}`,
      tono: o.rating >= 4 ? ('ok' as const) : ('no' as const),
      etiqueta: `${o.rating} de 5`,
      titulo: o.title,
      detalle: o.comment === null ? `Opinó ${hace(diasDesde(o.answeredAt))}, sin comentario` : `«${o.comment.slice(0, 90)}${o.comment.length > 90 ? '…' : ''}»`,
      // Con permiso, a la ficha de su cliente: ahí se publica de un toque.
      href: o.allowPublish && o.rating >= 4 ? `/panel/admin/clientes?evento=${o.slug}` : `/panel/admin/eventos?evento=${o.slug}`,
      accion: o.allowPublish && o.rating >= 4 ? 'Publicar' : 'Ver',
      desde: -o.answeredAt.getTime(),
    }))
    .sort(porAntiguedad)

  const grupos = [
    { id: 'ventas', titulo: 'Ventas', avisos: ventas },
    { id: 'riesgos', titulo: 'Eventos en riesgo', avisos: riesgos },
    { id: 'planes', titulo: 'Cambios de plan', avisos: cambios },
    { id: 'oportunidades', titulo: 'Oportunidades', avisos: oportunidades },
    { id: 'opiniones', titulo: 'Opiniones de clientes', avisos: opiniones },
  ].filter((g) => g.avisos.length > 0)
  // Cuántas cosas esperan: lo que pide hacer algo. Las oportunidades son un extra, no una deuda.
  return { grupos, total: ventas.length + riesgos.length + cambios.length }
}
