/**
 * «Hoy»: lo que le espera al admin, decidido sin base y sin reloj.
 *
 * El repositorio trae filas crudas; aquí se decide qué es un aviso. **La fecha llega como
 * argumento**, igual que en `dueReminders`: así «a 30 días», «más de 3 días» y «más de 7»
 * se prueban sin tocar el reloj del sistema.
 */

export type HoyCrudo = {
  /** Pedidos con comprobante subido y sin decidir. Alguien transfirió y espera. */
  readonly pedidosPorRevisar: readonly { ref: string; customerName: string; createdAt: Date }[]
  /** Pedidos abiertos sin comprobante. */
  readonly pedidosSinPago: readonly { ref: string; customerName: string; createdAt: Date }[]
  readonly consultasNuevas: readonly { id: string; name: string; createdAt: Date; eventDate: string | null }[]
  readonly cambiosDePlan: readonly { eventSlug: string; eventTitle: string; planSlug: string; createdAt: Date }[]
  /** Eventos de hoy a `HORIZONTE_RIESGO` días, con sus grupos y cuántos respondieron. */
  readonly eventos: readonly {
    slug: string
    title: string
    eventDate: string
    status: string
    grupos: number
    respondidos: number
  }[]
  /** Cuentas de cliente que siguen con la contraseña provisional. */
  readonly accesosSinEstrenar: readonly {
    email: string
    createdAt: Date
    eventSlug: string | null
    eventTitle: string | null
  }[]
}

export type TonoAviso = 'no' | 'pending' | 'maybe'

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

export type Proxima = {
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly dias: number
  readonly status: string
  readonly grupos: number
  readonly respondidos: number
  /** Respondidos sobre grupos; `null` sin grupos, que no es un 0 %. */
  readonly ratio: number | null
}

export type Hoy = {
  readonly ventas: readonly Aviso[]
  readonly riesgos: readonly Aviso[]
  readonly atascados: readonly Aviso[]
  readonly proximas: readonly Proxima[]
  readonly totales: { pedidos: number; consultas: number; cambios: number; riesgos: number; atascados: number }
  readonly total: number
}

/** Hasta dónde mira el repositorio, y hasta dónde un borrador es un riesgo. */
export const HORIZONTE_RIESGO = 30
/** Por debajo de esto, el riesgo es urgente. */
const URGENTE = 7
const HORIZONTE_PROXIMAS = 14
const ACCESO_ATASCADO = 3
const PAGO_ATASCADO = 7

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
const faltan = (dias: number): string => (dias <= 0 ? 'es hoy' : dias === 1 ? 'es mañana' : `faltan ${dias} días`)

const porAntiguedad = (a: Aviso, b: Aviso) => a.desde - b.desde

/** Por encima de esto las consultas se resumen en un aviso: veinte filas iguales no se leen. */
const CONSULTAS_SUELTAS = 3

function avisosDeConsultas(consultas: HoyCrudo['consultasNuevas'], diasDesde: (instante: Date) => number): Aviso[] {
  const ordenadas = [...consultas].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const primera = ordenadas[0]
  if (primera === undefined) return []

  if (ordenadas.length > CONSULTAS_SUELTAS) {
    return [
      {
        clave: 'consultas',
        tono: 'maybe',
        etiqueta: 'Consultas',
        titulo: `${ordenadas.length} consultas sin contactar`,
        detalle: `La más antigua escribió ${hace(diasDesde(primera.createdAt))}`,
        href: '/panel/admin/consultas',
        accion: 'Abrir bandeja',
        desde: primera.createdAt.getTime(),
      },
    ]
  }

  return ordenadas.map((c) => ({
    clave: `consulta:${c.id}`,
    tono: 'maybe',
    etiqueta: 'Consulta',
    titulo: c.name,
    detalle: `Escribió desde la web ${hace(diasDesde(c.createdAt))}${c.eventDate ? ` · evento el ${c.eventDate}` : ''}`,
    href: '/panel/admin/consultas',
    accion: 'Contactar',
    desde: c.createdAt.getTime(),
  }))
}

export function componerHoy(crudo: HoyCrudo, hoy: string): Hoy {
  const diasDesde = (instante: Date) => diasEntre(fechaEnBolivia(instante), hoy)

  // Por tipo primero y por antigüedad dentro: un comprobante es alguien que **ya pagó** y
  // espera; con doscientas consultas sin atender delante, no se vería nunca.
  const ventas: Aviso[] = [
    ...crudo.pedidosPorRevisar.map((p) => ({
      clave: `pedido:${p.ref}`,
      tono: 'pending' as const,
      etiqueta: 'Comprobante',
      titulo: p.customerName,
      detalle: `Pedido ${p.ref} · subió el comprobante ${hace(diasDesde(p.createdAt))}`,
      href: '/panel/pedidos',
      accion: 'Revisar',
      desde: p.createdAt.getTime(),
    })).sort(porAntiguedad),
    ...crudo.cambiosDePlan.map((c) => ({
      clave: `plan:${c.eventSlug}`,
      tono: 'pending' as const,
      etiqueta: 'Cambio de plan',
      titulo: c.eventTitle,
      detalle: `Pide pasar a ${c.planSlug} · ${hace(diasDesde(c.createdAt))}`,
      href: `/panel/eventos/${c.eventSlug}/plan`,
      accion: 'Decidir',
      desde: c.createdAt.getTime(),
    })).sort(porAntiguedad),
    ...avisosDeConsultas(crudo.consultasNuevas, diasDesde),
  ]

  const conDias = crudo.eventos.map((e) => ({ ...e, dias: diasEntre(hoy, e.eventDate) }))

  const riesgos: Aviso[] = conDias
    .filter((e) => e.dias >= 0 && e.dias <= HORIZONTE_RIESGO)
    .flatMap((e): Aviso[] => {
      const tono: TonoAviso = e.dias <= URGENTE ? 'no' : 'maybe'
      // `desde` ordena por fecha del evento: lo que llega antes, arriba.
      const desde = Date.parse(`${e.eventDate}T00:00:00Z`)
      if (e.status === 'draft') {
        return [
          {
            clave: `borrador:${e.slug}`,
            tono,
            etiqueta: 'En borrador',
            titulo: e.title,
            detalle: `${faltan(e.dias)} y la invitación no está publicada`,
            href: `/panel/eventos/${e.slug}/configuracion`,
            accion: 'Publicar',
            desde,
          },
        ]
      }
      if (e.status === 'live' && e.grupos === 0) {
        return [
          {
            clave: `sin-invitados:${e.slug}`,
            tono,
            etiqueta: 'Sin invitados',
            titulo: e.title,
            detalle: `Publicada, ${faltan(e.dias)} y sin ningún grupo cargado`,
            href: `/panel/eventos/${e.slug}/invitados`,
            accion: 'Cargar',
            desde,
          },
        ]
      }
      return []
    })
    .sort(porAntiguedad)

  const atascados: Aviso[] = [
    ...crudo.accesosSinEstrenar
      .filter((a) => diasDesde(a.createdAt) >= ACCESO_ATASCADO)
      .map((a) => ({
        clave: `acceso:${a.email}`,
        tono: 'maybe' as const,
        etiqueta: 'No ha entrado',
        titulo: a.email,
        detalle: `Recibió su acceso ${hace(diasDesde(a.createdAt))}${a.eventTitle ? ` para ${a.eventTitle}` : ''} y no ha entrado`,
        href: a.eventSlug ? `/panel/eventos/${a.eventSlug}/configuracion` : '/panel/admin/usuarios',
        accion: 'Escribirle',
        desde: a.createdAt.getTime(),
      })),
    ...crudo.pedidosSinPago
      .filter((p) => diasDesde(p.createdAt) >= PAGO_ATASCADO)
      .map((p) => ({
        clave: `sin-pago:${p.ref}`,
        tono: 'maybe' as const,
        etiqueta: 'Sin pago',
        titulo: p.customerName,
        detalle: `Pedido ${p.ref} abierto ${hace(diasDesde(p.createdAt))} y sin comprobante`,
        href: '/panel/pedidos',
        accion: 'Seguir',
        desde: p.createdAt.getTime(),
      })),
  ].sort(porAntiguedad)

  const proximas: Proxima[] = conDias
    .filter((e) => e.dias >= 0 && e.dias <= HORIZONTE_PROXIMAS)
    .sort((a, b) => a.dias - b.dias)
    .map((e) => ({
      slug: e.slug,
      title: e.title,
      eventDate: e.eventDate,
      dias: e.dias,
      status: e.status,
      grupos: e.grupos,
      respondidos: e.respondidos,
      ratio: e.grupos === 0 ? null : e.respondidos / e.grupos,
    }))

  return {
    ventas,
    riesgos,
    atascados,
    proximas,
    totales: {
      pedidos: crudo.pedidosPorRevisar.length,
      consultas: crudo.consultasNuevas.length,
      cambios: crudo.cambiosDePlan.length,
      riesgos: riesgos.length,
      atascados: atascados.length,
    },
    total: ventas.length + riesgos.length + atascados.length,
  }
}
