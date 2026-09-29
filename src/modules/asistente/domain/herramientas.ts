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
]

const nombre = z.string().trim().min(1).max(160)

export const esquemaDeInvitacion = z.object({
  personas: z.array(nombre).min(1).max(MAX_PERSONAS_POR_INVITACION),
  telefono: z.string().trim().max(40).nullable(),
})
export const esquemaDePropuesta = z.array(esquemaDeInvitacion).min(1).max(MAX_INVITACIONES_POR_PROPUESTA)
export type InvitacionPropuesta = z.infer<typeof esquemaDeInvitacion>

export type LlamadaValida =
  | { readonly nombre: 'resumen_del_evento' }
  | { readonly nombre: 'buscar_invitados'; readonly texto: string | null; readonly estado: (typeof ESTADOS_DE_INVITADO)[number] | null }
  | { readonly nombre: 'tareas'; readonly filtro: (typeof FILTROS_DE_TAREA)[number] }
  | { readonly nombre: 'presupuesto' }
  | { readonly nombre: 'proveedores' }
  | { readonly nombre: 'cronograma' }
  | { readonly nombre: 'como_se_hace'; readonly tema: TemaDeAyuda }
  | { readonly nombre: 'proponer_invitados'; readonly invitaciones: readonly InvitacionPropuesta[] }

const esquemas = {
  resumen_del_evento: z.object({}).strict(),
  buscar_invitados: z.object({ texto: z.string().trim().max(120).nullable(), estado: z.enum(ESTADOS_DE_INVITADO).nullable() }).strict(),
  tareas: z.object({ filtro: z.enum(FILTROS_DE_TAREA).nullable() }).strict(),
  presupuesto: z.object({}).strict(),
  proveedores: z.object({}).strict(),
  cronograma: z.object({}).strict(),
  como_se_hace: z.object({ tema: z.enum(TEMAS_DE_AYUDA) }).strict(),
  proponer_invitados: z.object({ invitaciones: esquemaDePropuesta }).strict(),
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
