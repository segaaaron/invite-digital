import { z } from 'zod'
import { TEMAS_DE_AYUDA, type TemaDeAyuda } from './guias'

/**
 * Lo que Luxury puede pedir. **El modelo no toca la base**: pide una herramienta por su nombre, el
 * servidor valida los argumentos aquí, la ejecuta con los permisos de quien pregunta y le devuelve
 * el resultado. El evento nunca es un argumento: sale de la sesión y de la dirección.
 *
 * Las de lectura se ejecutan solas; `proponer_invitados` **no guarda nada**: enseña una tarjeta y
 * guarda la persona con «Confirmar».
 *
 * Esquemas en modo estricto (OpenAI): todo `required`, lo opcional como `null`, sin propiedades de más.
 */
export type DefinicionDeHerramienta = {
  readonly type: 'function'
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly strict: true
}

const objeto = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
const texto = (description: string, anulable = false) => ({ type: anulable ? ['string', 'null'] : 'string', description })
const opcion = (valores: readonly string[], description: string) => ({ type: ['string', 'null'], enum: [...valores, null], description })

export const ESTADOS_DE_INVITADO = ['confirmados', 'no_vienen', 'sin_responder'] as const
export const FILTROS_DE_TAREA = ['pendientes', 'semana', 'atrasadas', 'hechas'] as const
export const MAX_INVITACIONES_POR_PROPUESTA = 30
export const MAX_PERSONAS_POR_INVITACION = 12

export const HERRAMIENTAS: readonly DefinicionDeHerramienta[] = [
  {
    type: 'function',
    name: 'resumen_del_evento',
    description: 'Cifras del evento: invitaciones, lugares, confirmados, sin responder, visitas, días que faltan.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'buscar_invitados',
    description: 'Busca personas de la lista de invitados por nombre y/o por estado de su respuesta. Devuelve como mucho 40.',
    parameters: objeto({
      texto: texto('Parte del nombre o de la invitación; null para no filtrar por nombre.', true),
      estado: opcion(ESTADOS_DE_INVITADO, 'Filtra por su respuesta; null para todas.'),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'tareas',
    description: 'Tareas del plan del evento con su fecha y estado.',
    parameters: objeto({ filtro: opcion(FILTROS_DE_TAREA, 'pendientes (por defecto), semana (vencen en 7 días), atrasadas o hechas.') }),
    strict: true,
  },
  {
    type: 'function',
    name: 'presupuesto',
    description: 'Presupuesto: totales previsto, comprometido, pagado y lo que falta, por partida, y los pagos que vencen.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'proveedores',
    description: 'Proveedores del evento con su servicio, empresa y estado (cotizando, reservado, contratado, confirmado).',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'cronograma',
    description: 'Los momentos del cronograma del día del evento, con su hora y si salen en la invitación.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'como_se_hace',
    description: 'Cómo se hace algo en el panel y el enlace a la pantalla. Úsala antes de explicar una pantalla.',
    parameters: objeto({ tema: { type: 'string', enum: [...TEMAS_DE_AYUDA], description: 'De qué trata la pregunta.' } }),
    strict: true,
  },
  {
    type: 'function',
    name: 'proponer_invitados',
    description:
      'Propone añadir invitaciones a la lista. NO guarda: la persona ve una tarjeta y confirma. Cada invitación es una familia o una persona: el primer nombre es el principal y los demás sus acompañantes.',
    parameters: objeto({
      invitaciones: {
        type: 'array',
        description: 'Las invitaciones a añadir.',
        items: objeto({
          personas: { type: 'array', items: { type: 'string' }, description: 'Nombres completos; el primero es el principal.' },
          telefono: texto('Su WhatsApp tal como lo dieron (8 dígitos de Bolivia o con prefijo); null si no lo dieron.', true),
        }),
      },
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'proponer_tareas',
    description:
      'Propone tareas para el plan del evento. NO guarda: la persona ve una tarjeta y confirma. Úsala para «arma mi plan», «qué me falta hacer», o cuando pidan recordar algo con fecha.',
    parameters: objeto({
      tareas: {
        type: 'array',
        description: 'Las tareas, de la más próxima a la más lejana.',
        items: objeto({
          titulo: texto('Qué hay que hacer, corto: «Reservar el salón».'),
          vence: texto('Fecha límite AAAA-MM-DD (antes del evento); null si no tiene.', true),
          responsable: { type: 'string', enum: ['anfitrion', 'planner', 'familia'], description: 'Quién se encarga.' },
        }),
      },
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'proponer_partidas',
    description:
      'Propone partidas del presupuesto (lo que se va a gastar). NO guarda: la persona confirma. Usa las categorías que devuelve «presupuesto» (categorias_disponibles). Importes en bolivianos.',
    parameters: objeto({
      partidas: {
        type: 'array',
        description: 'Las partidas a sumar.',
        items: objeto({
          concepto: texto('Qué es: «Fotógrafo», «Torta de tres pisos».'),
          categoria: texto('La clave de su categoría, de categorias_disponibles.'),
          previsto_bs: { type: 'number', description: 'Lo previsto en bolivianos, sin centavos.' },
        }),
      },
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'proponer_momentos',
    description:
      'Propone momentos del cronograma del día (la ceremonia, la entrada, el vals, la cena). NO guarda: la persona confirma. Los marcados «en_invitacion» salen en el itinerario de la invitación.',
    parameters: objeto({
      momentos: {
        type: 'array',
        description: 'Los momentos en orden de hora.',
        items: objeto({
          hora: texto('HH:MM, hora de Bolivia (00:30 para después de medianoche).'),
          momento: texto('Qué pasa: «Entrada de los novios».'),
          en_invitacion: { type: 'boolean', description: 'Si sale en el itinerario que ven los invitados.' },
        }),
      },
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'agenda',
    description:
      'La agenda del evento: tareas con fecha, pagos, momentos del cronograma, ensayos, citas, el cierre de confirmaciones y el día. Sin fechas, los próximos 30 días.',
    parameters: objeto({
      desde: texto('YYYY-MM-DD; null para hoy.', true),
      hasta: texto('YYYY-MM-DD; null para 30 días después de «desde».', true),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'proponer_citas',
    description:
      'Propone citas para la agenda (prueba del vestido, degustación, reunión con un proveedor). NO guarda: la persona confirma. Mira antes «agenda» para no chocar.',
    parameters: objeto({
      citas: {
        type: 'array',
        description: 'Las citas a agendar.',
        items: objeto({
          titulo: texto('Qué es: «Degustación del menú».'),
          dia: texto('YYYY-MM-DD.'),
          hora: texto('HH:MM, hora de Bolivia.'),
          minutos: { type: 'integer', description: 'Cuánto dura, en minutos (60 si no se sabe).' },
          lugar: texto('Dónde; null si no se sabe.', true),
        }),
      },
    }),
    strict: true,
  },
]

const nombre = z.string().trim().min(1).max(160)

export const esquemaDeInvitacion = z.object({
  personas: z.array(nombre).min(1).max(MAX_PERSONAS_POR_INVITACION),
  telefono: z.string().trim().max(40).nullable(),
})
export const esquemaDePropuesta = z.array(esquemaDeInvitacion).min(1).max(MAX_INVITACIONES_POR_PROPUESTA)
export type InvitacionPropuesta = z.infer<typeof esquemaDeInvitacion>

const MAX_POR_PROPUESTA = 20
export const esquemaDeTarea = z.object({
  titulo: z.string().trim().min(1).max(200),
  vence: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  responsable: z.enum(['anfitrion', 'planner', 'familia']),
})
export const esquemaDePartida = z.object({
  concepto: z.string().trim().min(1).max(160),
  categoria: z.string().trim().min(1).max(40),
  previsto_bs: z.number().min(0).max(10_000_000),
})
export const esquemaDeMomento = z.object({
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  momento: z.string().trim().min(1).max(160),
  en_invitacion: z.boolean(),
})
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const esquemaDeCita = z.object({
  titulo: z.string().trim().min(1).max(200),
  dia,
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  minutos: z.number().int().min(5).max(1440),
  lugar: z.string().trim().max(200).nullable(),
})
export type CitaPropuesta = z.infer<typeof esquemaDeCita>
export type TareaPropuesta = z.infer<typeof esquemaDeTarea>
export type PartidaPropuesta = z.infer<typeof esquemaDePartida>
export type MomentoPropuesto = z.infer<typeof esquemaDeMomento>

/** Lo que Luxury propone y la persona confirma con un botón. Nada de esto se guarda sin ese toque. */
export type Propuesta =
  | { readonly clase: 'invitados'; readonly invitaciones: readonly InvitacionPropuesta[] }
  | { readonly clase: 'tareas'; readonly tareas: readonly TareaPropuesta[] }
  | { readonly clase: 'partidas'; readonly partidas: readonly PartidaPropuesta[] }
  | { readonly clase: 'momentos'; readonly momentos: readonly MomentoPropuesto[] }
  | { readonly clase: 'citas'; readonly citas: readonly CitaPropuesta[] }

export type LlamadaValida =
  | { readonly nombre: 'resumen_del_evento' }
  | { readonly nombre: 'buscar_invitados'; readonly texto: string | null; readonly estado: (typeof ESTADOS_DE_INVITADO)[number] | null }
  | { readonly nombre: 'tareas'; readonly filtro: (typeof FILTROS_DE_TAREA)[number] }
  | { readonly nombre: 'presupuesto' }
  | { readonly nombre: 'proveedores' }
  | { readonly nombre: 'cronograma' }
  | { readonly nombre: 'como_se_hace'; readonly tema: TemaDeAyuda }
  | { readonly nombre: 'proponer_invitados'; readonly invitaciones: readonly InvitacionPropuesta[] }
  | { readonly nombre: 'proponer_tareas'; readonly tareas: readonly TareaPropuesta[] }
  | { readonly nombre: 'proponer_partidas'; readonly partidas: readonly PartidaPropuesta[] }
  | { readonly nombre: 'proponer_momentos'; readonly momentos: readonly MomentoPropuesto[] }
  | { readonly nombre: 'agenda'; readonly desde: string | null; readonly hasta: string | null }
  | { readonly nombre: 'proponer_citas'; readonly citas: readonly CitaPropuesta[] }

const esquemas = {
  resumen_del_evento: z.object({}).strict(),
  buscar_invitados: z.object({ texto: z.string().trim().max(120).nullable(), estado: z.enum(ESTADOS_DE_INVITADO).nullable() }).strict(),
  tareas: z.object({ filtro: z.enum(FILTROS_DE_TAREA).nullable() }).strict(),
  presupuesto: z.object({}).strict(),
  proveedores: z.object({}).strict(),
  cronograma: z.object({}).strict(),
  como_se_hace: z.object({ tema: z.enum(TEMAS_DE_AYUDA) }).strict(),
  proponer_invitados: z.object({ invitaciones: esquemaDePropuesta }).strict(),
  proponer_tareas: z.object({ tareas: z.array(esquemaDeTarea).min(1).max(MAX_POR_PROPUESTA) }).strict(),
  proponer_partidas: z.object({ partidas: z.array(esquemaDePartida).min(1).max(MAX_POR_PROPUESTA) }).strict(),
  proponer_momentos: z.object({ momentos: z.array(esquemaDeMomento).min(1).max(MAX_POR_PROPUESTA) }).strict(),
  agenda: z.object({ desde: dia.nullable(), hasta: dia.nullable() }).strict(),
  proponer_citas: z.object({ citas: z.array(esquemaDeCita).min(1).max(MAX_POR_PROPUESTA) }).strict(),
} as const

/**
 * De lo que pidió el modelo a una llamada que el servidor puede ejecutar. Un nombre que no existe o unos
 * argumentos que no cuadran vuelven como error **al modelo**, que puede corregirse; nunca llegan a la base.
 */
export function interpretarLlamada(nombreDeHerramienta: string, argumentos: string): { ok: true; llamada: LlamadaValida } | { ok: false; error: string } {
  if (!Object.hasOwn(esquemas, nombreDeHerramienta)) return { ok: false, error: `No existe la herramienta ${nombreDeHerramienta}.` }
  let crudo: unknown
  try {
    crudo = JSON.parse(argumentos === '' ? '{}' : argumentos)
  } catch {
    return { ok: false, error: 'Los argumentos no son JSON.' }
  }
  const nombreValido = nombreDeHerramienta as keyof typeof esquemas
  const leido = esquemas[nombreValido].safeParse(crudo)
  if (!leido.success) return { ok: false, error: `Argumentos no válidos: ${leido.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` }
  const datos = leido.data as { filtro?: (typeof FILTROS_DE_TAREA)[number] | null }
  // Sin filtro, las pendientes: es lo que se quiere saber casi siempre.
  if (nombreValido === 'tareas') return { ok: true, llamada: { nombre: 'tareas', filtro: datos.filtro ?? 'pendientes' } }
  return { ok: true, llamada: { nombre: nombreValido, ...leido.data } as LlamadaValida }
}

/** Si una llamada es una propuesta (se enseña y se confirma), y cuál. */
export function propuestaDe(llamada: LlamadaValida): Propuesta | null {
  switch (llamada.nombre) {
    case 'proponer_invitados':
      return { clase: 'invitados', invitaciones: llamada.invitaciones }
    case 'proponer_tareas':
      return { clase: 'tareas', tareas: llamada.tareas }
    case 'proponer_partidas':
      return { clase: 'partidas', partidas: llamada.partidas }
    case 'proponer_momentos':
      return { clase: 'momentos', momentos: llamada.momentos }
    case 'proponer_citas':
      return { clase: 'citas', citas: llamada.citas }
    default:
      return null
  }
}

