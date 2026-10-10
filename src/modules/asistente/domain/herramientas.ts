import { z } from 'zod'
import { celularDictado } from '@/shared/whatsapp'
import { TEMAS_DE_AYUDA, type TemaDeAyuda } from './guias'

/**
 * Lo que Luxury puede pedir. **El modelo no toca la base**: pide una herramienta por su nombre, el
 * servidor valida los argumentos aquí y la ejecuta **con las mismas acciones de las pantallas**, con la
 * sesión, los permisos y los límites del plan de quien pregunta. El evento nunca es un argumento: sale de
 * la sesión y de la dirección.
 *
 * **Hace lo que se le pide, sin tarjeta de confirmar** (7 de octubre, decisión del usuario: «si yo le pido
 * registrar, lo registra; si le pido borrar, igual»). Lo único que no puede hacer solo es enviar por
 * WhatsApp —WhatsApp exige el toque de la persona—: `preparar_envio` deja un botón por invitado.
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
const numero = (description: string, entero = false) => ({ type: [entero ? 'integer' : 'number', 'null'], description })
const siNo = (description: string) => ({ type: ['boolean', 'null'], description })
const opcion = (valores: readonly string[], description: string) => ({ type: ['string', 'null'], enum: [...valores, null], description })
const lista = (description: string, items: Record<string, unknown>) => ({ type: 'array', description, items })
const accion = (valores: readonly string[], description: string) => ({ type: 'string', enum: [...valores], description })

export const ESTADOS_DE_INVITADO = ['confirmados', 'no_vienen', 'sin_responder'] as const
export const FILTROS_DE_TAREA = ['pendientes', 'semana', 'atrasadas', 'hechas'] as const
export const MAX_INVITACIONES_POR_PROPUESTA = 30
export const MAX_PERSONAS_POR_INVITACION = 12
const MAX_OPERACIONES = 30

export const ACCIONES = {
  invitados: ['editar', 'quitar', 'acompanante', 'asistencia', 'mover', 'reabrir', 'revocar', 'enlace_nuevo'],
  tareas: ['crear', 'editar', 'hecha', 'pendiente', 'borrar', 'plantilla'],
  presupuesto: ['crear_partida', 'editar_partida', 'borrar_partida', 'registrar_pago', 'marcar_pagado', 'marcar_pendiente', 'borrar_pago', 'fijar_total'],
  cronograma: ['crear', 'editar', 'borrar'],
  agenda: ['crear', 'editar', 'borrar', 'suscribir'],
  proveedores: ['crear', 'editar', 'borrar', 'llego', 'no_llego', 'enlace', 'quitar_enlace'],
  mesas: ['crear', 'editar', 'borrar', 'sentar', 'levantar', 'autoasignar', 'zona', 'editar_zona', 'borrar_zona'],
  ensayos: ['crear', 'borrar'],
  encargo: ['enviar_datos', 'pedir_cambios', 'aprobar'],
  regalos: ['crear', 'editar', 'borrar', 'comprado', 'liberar', 'crear_fondo', 'editar_fondo', 'borrar_fondo', 'aporte'],
  cortejo: ['crear', 'editar', 'borrar', 'confirmar', 'desconfirmar'],
  recepcion: ['sumar', 'quitar'],
} as const
export const ASISTENCIA = ['si', 'no', 'quiza'] as const
/** Las del salón (`ZONE_KINDS` de `venue`): pista, barra, escenario, música, entrada, cocina, fotos, otra. */
export const ZONAS = ['dance', 'bar', 'stage', 'music', 'entrance', 'kitchen', 'photo', 'custom'] as const
/** Cómo llegó un aporte a un fondo (`CONTRIBUTION_METHODS` de `registry`). */
export const METODOS_DE_APORTE = ['transfer', 'card', 'envelope', 'other'] as const
/** `TipoDeCortejo` del planner; cada fiesta admite los suyos y la acción corta el resto. */
export const TIPOS_DE_CORTEJO = ['padrino', 'dama', 'caballero', 'chambelan', 'corte'] as const
export const RESPONSABLES = ['anfitrion', 'planner', 'familia'] as const
export const ESTADOS_DE_PROVEEDOR = ['cotizando', 'reservado', 'contratado', 'confirmado'] as const

const lugarDeTextos = (quien: string) => ({
  anyOf: [objeto({ lugar: texto('El nombre del sitio; null si no cambia.', true), direccion: texto('La dirección en una línea; null si no cambia.', true), hora: texto('HH:MM; null si no cambia.', true) }), { type: 'null' }],
  description: `${quien}; null si no cambia.`,
})

/** Adónde lleva «ir_a», relativo al evento (9 oct): las pantallas del panel del cliente. */
export const PANTALLAS_DEL_EVENTO = {
  resumen: '',
  mi_invitacion: '/configuracion',
  ver_invitacion: '/vista-previa',
  invitados: '/invitados',
  enviar_invitaciones: '/invitados?panel=envio',
  ingreso: '/checkin',
  mesas: '/mesas',
  regalos: '/regalos',
  mensajes: '/mensajes',
  equipo: '/equipo',
  extras: '/extras',
  tareas: '/planner/tareas',
  agenda: '/planner/agenda',
  presupuesto: '/planner/presupuesto',
  proveedores: '/planner/proveedores',
  cronograma: '/planner/cronograma',
  cortejo: '/planner/cortejo',
  documentos: '/planner/documentos',
  dia_d: '/dia-d',
} as const
export type PantallaDelEvento = keyof typeof PANTALLAS_DEL_EVENTO
const PANTALLAS = Object.keys(PANTALLAS_DEL_EVENTO) as [PantallaDelEvento, ...PantallaDelEvento[]]

export const HERRAMIENTAS: readonly DefinicionDeHerramienta[] = [
  // ─── Lectura ──────────────────────────────────────────────────────────────
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
    description:
      'Busca personas de la lista de invitados por nombre, por el código de su pase (el de 5 letras bajo el QR) y/o por su respuesta: persona_id, invitacion_id, mesa, código y si ya entró al evento. Devuelve como mucho 40.',
    parameters: objeto({
      texto: texto('Parte del nombre, de la invitación o el código del pase; null para no filtrar.', true),
      estado: opcion(ESTADOS_DE_INVITADO, 'Filtra por su respuesta; null para todas.'),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'tareas',
    description: 'Tareas del plan del evento con su tarea_id, fecha, responsable y estado.',
    parameters: objeto({ filtro: opcion(FILTROS_DE_TAREA, 'pendientes (por defecto), semana (vencen en 7 días), atrasadas o hechas.') }),
    strict: true,
  },
  {
    type: 'function',
    name: 'presupuesto',
    description: 'Presupuesto: totales, cada partida con su partida_id y sus pagos (pago_id), los pagos que vencen y las categorías disponibles.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'proveedores',
    description: 'Proveedores del evento con su proveedor_id, servicio, empresa, contacto, WhatsApp y estado.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'cronograma',
    description: 'Los momentos del cronograma del día del evento, con su momento_id, hora y si salen en la invitación.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'agenda',
    description:
      'La agenda del evento: tareas con fecha, pagos, momentos, ensayos, citas (con cita_id), el cierre de confirmaciones y el día; además lo atrasado (tareas y pagos vencidos sin hacer) y cuántos días faltan. Sin fechas, los próximos 30 días.',
    parameters: objeto({ desde: texto('YYYY-MM-DD; null para hoy.', true), hasta: texto('YYYY-MM-DD; null para 30 días después de «desde».', true) }),
    strict: true,
  },
  {
    type: 'function',
    name: 'mi_invitacion',
    description: 'Lo que ya está escrito en la invitación (nombres, frase, fecha y hora, ceremonia, recepción, vestimenta, avisos, cierre). Úsala antes de escribirla.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'mesas',
    description: 'Las mesas del salón (mesa_id, lugares, quién se sienta) y las invitaciones sin mesa (invitacion_id).',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'regalos',
    description: 'La mesa de regalos: cada regalo con su regalo_id, precio y estado (libre, reservado, comprado), y los fondos en efectivo.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'mensajes',
    description: 'El libro de firmas: lo que escribieron los invitados, con su mensaje_id, quién y si ya se le agradeció.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'ir_a',
    description: 'Lleva a la persona a una pantalla del panel de este evento: la abre sola. Para «llévame a…», «ábreme…», «ve a…», «quiero ver…».',
    parameters: objeto({ pantalla: { type: 'string', enum: PANTALLAS, description: 'La pantalla.' } }),
    strict: true,
  },
  {
    type: 'function',
    name: 'como_se_hace',
    description: 'Cómo se hace algo en el panel y el enlace a la pantalla. Úsala para lo que tú no puedes hacer (subir fotos o música, comprar extras).',
    parameters: objeto({ tema: { type: 'string', enum: [...TEMAS_DE_AYUDA], description: 'De qué trata la pregunta.' } }),
    strict: true,
  },
  {
    type: 'function',
    name: 'cortejo',
    description: 'El cortejo (padrinos, damas, caballeros, chambelanes, corte): cada miembro con su miembro_id, tipo, si confirmó y lo que apadrina.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'recepcion',
    description: 'El personal de recepción (quién escanea los pases en la puerta) con su recepcion_id y cuántos ingresos registró, y la planner del equipo.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'puerta',
    description: 'El ingreso al evento, como en la recepción: cuántos entraron y cuántos faltan, las últimas llegadas con su hora y los VIP que aún no llegan.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'documentos',
    description: 'Los documentos subidos (contratos, cotizaciones, facturas): cada uno con su documento_id, tipo, nombre y proveedor.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'extras',
    description: 'Los extras que se pueden pedir para este evento (más fotos, más días en línea, Día D…), con su clave y precio.',
    parameters: objeto({}),
    strict: true,
  },
  // ─── Envío (con el toque de la persona) ───────────────────────────────────
  {
    type: 'function',
    name: 'preparar_envio',
    description:
      'Prepara el envío de las invitaciones por WhatsApp: la persona ve un botón por invitado con su mensaje y su enlace listos, y toca enviar en cada uno (WhatsApp no deja enviar sin ese toque). Para mandar, enviar, compartir o reenviar invitaciones.',
    parameters: objeto({ incluir_enviadas: { type: 'boolean', description: 'true para incluir también las ya enviadas (reenviar); false para solo las que faltan.' } }),
    strict: true,
  },
  {
    type: 'function',
    name: 'preparar_recordatorios',
    description: 'Prepara los recordatorios de hoy por WhatsApp para quien no abrió su invitación o no respondió: un botón por invitado.',
    parameters: objeto({}),
    strict: true,
  },
  // ─── Escritura: se hace en el momento ─────────────────────────────────────
  {
    type: 'function',
    name: 'registrar_invitados',
    description: 'Añade invitaciones a la lista, ya. Cada invitación es una familia o una persona: el primer nombre es el principal y los demás sus acompañantes.',
    parameters: objeto({
      invitaciones: lista(
        'Las invitaciones a añadir.',
        objeto({
          personas: { type: 'array', items: { type: 'string' }, description: 'Nombres completos; el primero es el principal.' },
          telefono: texto(
            'Su WhatsApp: 8 cifras de Bolivia que empiezan por 6 o 7 (o + y código de país). Del dictado junta solo las cifras; si no salen 8, no lo inventes ni lo recortes: pregúntalo. null si no lo dieron.',
            true,
          ),
          aun_si_existe: {
            type: 'boolean',
            description: 'false casi siempre. true solo en ESTA invitación, si la persona confirmó que es OTRA persona con el mismo nombre o el mismo WhatsApp de alguien que ya está en la lista.',
          },
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'cambiar_invitados',
    description:
      'Cambia invitados, ya: editar (nombre, WhatsApp, VIP, restricción), quitar a una persona, añadir un acompañante, marcar su asistencia, moverla a otra invitación, reabrir la respuesta de una invitación (para que vuelva a confirmar), revocar una invitación (su enlace deja de abrir) o darle un enlace nuevo (el anterior deja de abrir). Los id salen de «buscar_invitados».',
    parameters: objeto({
      operaciones: lista(
        'Una operación por persona.',
        objeto({
          accion: accion(ACCIONES.invitados, 'Qué hacer.'),
          persona_id: texto('El id de la persona (editar, quitar, asistencia, mover); null si no.', true),
          invitacion_id: texto('El id de la invitación: la suya para el WhatsApp, la que recibe al acompañante o a quien se mueve, o la que se reabre, revoca o recibe enlace nuevo; null si no hace falta.', true),
          nombre: texto('El nombre nuevo (editar) o el del acompañante; null si no cambia.', true),
          telefono: texto('El WhatsApp nuevo de la invitación; null si no cambia.', true),
          vip: siNo('true o false para marcar o desmarcar VIP; null si no cambia.'),
          restriccion: texto('Restricción alimentaria («Sin gluten»); cadena vacía para quitarla; null si no cambia.', true),
          asiste: opcion(ASISTENCIA, 'Para asistencia: si, no o quiza; null si no.'),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'escribir_invitacion',
    description:
      'Escribe la invitación, ya, en «Mi invitación», sin tocar fotos ni lo demás: portada, frase, fecha y hora, ceremonia, recepción, ubicación del mapa, vestimenta y sus colores, padres y padrinos, avisos, cierre y el nombre de la canción. Mira antes «mi_invitacion». Lo que no cambie va en null.',
    parameters: objeto({
      nombre_a: texto('Primer nombre de la portada (la novia, la quinceañera, quien cumple); null si no cambia.', true),
      nombre_b: texto('Segundo nombre de la portada (el novio); null si no cambia o no hay.', true),
      texto_sobre_nombres: texto('La línea sobre los nombres («¡NOS CASAMOS!», «MIS QUINCE»); null si no cambia.', true),
      iniciales: texto('Las iniciales que adornan la portada («M & R», «XV»); null si no cambia.', true),
      texto_bajo_nombres: texto('Una línea pequeña bajo los nombres, como el año; null si no cambia.', true),
      frase: texto('La frase o cita; null si no cambia.', true),
      fecha_hora: texto('Fecha y hora del evento AAAA-MM-DDTHH:MM, hora de Bolivia; null si no cambia.', true),
      ceremonia: lugarDeTextos('La ceremonia'),
      recepcion: lugarDeTextos('La recepción o la fiesta'),
      vestimenta: { anyOf: [objeto({ titulo: texto('«Etiqueta», «Formal», «Cóctel».'), nota: texto('Una frase de detalle; null si no.', true) }), { type: 'null' }], description: 'El código de vestimenta; null si no cambia.' },
      colores_vestimenta: {
        anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }],
        description: 'Los colores sugeridos para vestir (hasta 8), por nombre (Negro, Marfil, Champaña, Dorado, Plata, Rosa palo, Lavanda, Celeste, Azul marino, Verde salvia, Vino, Terracota) o #rrggbb; lista vacía para quitarlos; null si no cambian.',
      },
      ubicacion: texto('Dónde es la fiesta para el mapa: el enlace de Google Maps o la dirección escrita; null si no cambia.', true),
      anfitriones: {
        anyOf: [
          objeto({
            titulo: texto('Lo que va encima («Con la bendición de»); null si no cambia.', true),
            padre: texto('XV: el padre; null si no cambia.', true),
            madre: texto('XV: la madre; null si no cambia.', true),
            padre_novia: texto('Boda: padre de la novia; null si no cambia.', true),
            madre_novia: texto('Boda: madre de la novia; null si no cambia.', true),
            padre_novio: texto('Boda: padre del novio; null si no cambia.', true),
            madre_novio: texto('Boda: madre del novio; null si no cambia.', true),
            padrinos: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }], description: 'Los padrinos (reemplazan a los que había); null si no cambian.' },
          }),
          { type: 'null' },
        ],
        description: 'Padres y padrinos; null si no cambian.',
      },
      cancion: { anyOf: [objeto({ titulo: texto('El título de la canción.'), artista: texto('Quién la canta; null si no se sabe.', true) }), { type: 'null' }], description: 'Cómo se llama la canción que suena (el archivo se adjunta en el chat); null si no cambia.' },
      avisos: {
        anyOf: [lista('Los avisos («Solo adultos», «Lluvia de sobres»), máximo 4; reemplazan a los que había.', objeto({ titulo: texto('El título del aviso.'), texto: texto('El texto; null si no hace falta.', true) })), { type: 'null' }],
        description: 'Los avisos; null si no cambian.',
      },
      cierre: texto('El texto de despedida del final; null si no cambia.', true),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'renombrar_evento',
    description: 'Cambia el nombre del evento en el panel (no los nombres de la portada de la invitación: eso es «escribir_invitacion»).',
    parameters: objeto({ titulo: texto('El nombre nuevo, de 1 a 160 caracteres.') }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_tareas',
    description: 'Crea, edita, marca hechas o pendientes y borra tareas del plan, ya; «plantilla» carga el plan recomendado para esta fiesta (no duplica). Los tarea_id salen de «tareas».',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones, en orden.',
        objeto({
          accion: accion(ACCIONES.tareas, 'crear, editar, hecha, pendiente, borrar o plantilla.'),
          tarea_id: texto('El id de la tarea; null para crear.', true),
          titulo: texto('Qué hay que hacer, corto; null si no cambia.', true),
          vence: texto('Fecha límite AAAA-MM-DD; cadena vacía para quitarla; null si no cambia.', true),
          responsable: opcion(RESPONSABLES, 'Quién se encarga; null si no cambia (al crear, anfitrion).'),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_presupuesto',
    description: 'Crea, edita y borra partidas del presupuesto, registra, marca y borra sus pagos, y fija el presupuesto total (fijar_total con importe_bs: se reparte solo por categorías), ya. Los id salen de «presupuesto». Importes en bolivianos.',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones, en orden.',
        objeto({
          accion: accion(ACCIONES.presupuesto, 'Qué hacer.'),
          partida_id: texto('El id de la partida (editar, borrar o registrar un pago); null para crear.', true),
          pago_id: texto('El id del pago (marcar o borrar un pago); null si no.', true),
          concepto: texto('Qué es: «Fotógrafo»; null si no cambia.', true),
          categoria: texto('La clave de su categoría (categorias_disponibles); null si no cambia.', true),
          previsto_bs: numero('Lo previsto en bolivianos; null si no cambia.'),
          contratado_bs: numero('Lo contratado en bolivianos; null si no cambia.'),
          importe_bs: numero('El importe del pago, o el total para fijar_total, en bolivianos; null si no.'),
          vence: texto('Cuándo vence el pago AAAA-MM-DD; null si no.', true),
          pagado: siNo('Si el pago que se registra ya está pagado; null si no.'),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_cronograma',
    description: 'Crea, edita y borra momentos del cronograma del día, ya. Los marcados en_invitacion salen en el itinerario de la invitación. Los momento_id salen de «cronograma».',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones, en orden de hora.',
        objeto({
          accion: accion(ACCIONES.cronograma, 'crear, editar o borrar.'),
          momento_id: texto('El id del momento; null para crear.', true),
          hora: texto('HH:MM, hora de Bolivia (00:30 para después de medianoche); null si no cambia.', true),
          momento: texto('Qué pasa: «Entrada de los novios»; null si no cambia.', true),
          lugar: texto('Dónde; null si no cambia.', true),
          en_invitacion: siNo('Si sale en el itinerario de la invitación; null si no cambia (al crear, sí).'),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_agenda',
    description: 'Crea, edita y borra citas de la agenda (prueba del vestido, degustación, reunión con un proveedor), ya; «suscribir» da el enlace para ver la agenda en el calendario del celular. Los cita_id salen de «agenda».',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones.',
        objeto({
          accion: accion(ACCIONES.agenda, 'crear, editar, borrar o suscribir.'),
          cita_id: texto('El id de la cita; null para crear.', true),
          titulo: texto('Qué es; null si no cambia.', true),
          dia: texto('YYYY-MM-DD; null si no cambia.', true),
          hora: texto('HH:MM; null si no cambia.', true),
          minutos: numero('Cuánto dura en minutos; null si no cambia (al crear, 60).', true),
          lugar: texto('Dónde; null si no cambia.', true),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_proveedores',
    description: 'Crea, edita y borra proveedores; el día del evento marca si llegó (llego / no_llego); «enlace» le da su enlace con sus horarios (sin dinero ni invitados) y «quitar_enlace» lo apaga, ya. Con precio, su partida del presupuesto se crea o se actualiza sola. Los proveedor_id salen de «proveedores».',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones.',
        objeto({
          accion: accion(ACCIONES.proveedores, 'crear, editar, borrar, llego, no_llego, enlace o quitar_enlace.'),
          proveedor_id: texto('El id del proveedor; null para crear.', true),
          servicio: texto('Qué hace: «Fotografía», «Catering»; null si no cambia.', true),
          empresa: texto('El nombre de la empresa; null si no cambia.', true),
          contacto: texto('La persona de contacto; null si no cambia.', true),
          whatsapp: texto('Su WhatsApp; null si no cambia.', true),
          estado: opcion(ESTADOS_DE_PROVEEDOR, 'cotizando, reservado, contratado o confirmado; null si no cambia.'),
          precio_bs: numero('Precio en bolivianos; null si no cambia.'),
          categoria: texto('La clave de categoría del presupuesto para su partida (de «presupuesto»); null si no.', true),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_mesas',
    description: 'Crea, edita y borra mesas; sienta y levanta invitaciones; reparte solas las que faltan (autoasignar); pone una zona en el plano (zona: pista, barra, escenario…), la renombra (editar_zona) o la quita (borrar_zona), ya. Los id salen de «mesas».',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones, en orden (crea las mesas antes de sentar en ellas: usa «mesas» para saber su id).',
        objeto({
          accion: accion(ACCIONES.mesas, 'Qué hacer.'),
          mesa_id: texto('El id de la mesa (editar, borrar o sentar); null si no.', true),
          invitacion_id: texto('El id de la invitación (sentar o levantar); null si no.', true),
          nombre: texto('El nombre de la mesa (crear o editar); null si no cambia.', true),
          lugares: numero('Cuántas sillas (crear o editar); null si no cambia.', true),
          zona: opcion(ZONAS, 'Para zona: dance (pista), bar, stage (escenario), music, entrance, kitchen, photo o custom (con nombre); null si no.'),
          zona_id: texto('El id de la zona (editar_zona, borrar_zona); null si no.', true),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_regalos',
    description:
      'La mesa de regalos, ya: crea, edita, borra, marca comprado o libera (quita la reserva) un regalo; crea, edita o borra un fondo en efectivo y anota un aporte a un fondo. Los regalo_id y fondo_id salen de «regalos». Importes en bolivianos.',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones.',
        objeto({
          accion: accion(ACCIONES.regalos, 'Qué hacer.'),
          regalo_id: texto('El id del regalo; null para crear.', true),
          nombre: texto('El nombre del regalo o del fondo; null si no cambia.', true),
          precio_bs: numero('Precio del regalo o meta del fondo en bolivianos; null si no cambia.'),
          tienda: texto('Dónde se compra; null si no cambia.', true),
          enlace: texto('Enlace https de la tienda; null si no cambia.', true),
          descripcion: texto('Para un fondo: para qué es; null si no.', true),
          fondo_id: texto('El id del fondo (editar_fondo, borrar_fondo, aporte); null si no.', true),
          quien: texto('Para un aporte: quién lo dio; null si no.', true),
          metodo: opcion(METODOS_DE_APORTE, 'Para un aporte: transfer, card, envelope (sobre) u other; null si no.'),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'agradecer_mensajes',
    description: 'Responde mensajes del libro de firmas, ya (ids de «mensajes»). El invitado ve la respuesta al volver a su invitación.',
    parameters: objeto({
      agradecimientos: lista('Una respuesta por mensaje.', objeto({ mensaje_id: texto('El id del mensaje.'), respuesta: texto('El agradecimiento, cálido y corto, de parte de los anfitriones.') })),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'registrar_ingreso',
    description: 'Registra el ingreso de una invitación en la puerta el día del evento (ids de «buscar_invitados»). Solo funciona con el ingreso abierto.',
    parameters: objeto({ invitacion_id: texto('El id de la invitación que llegó.'), personas: numero('Cuántas personas entraron; null para todas las de la invitación.', true) }),
    strict: true,
  },
  {
    type: 'function',
    name: 'opciones_de_invitacion',
    description:
      'Cambia lo que rodea a la invitación, ya: el enlace general (uno para todos, cada quien escribe su nombre), las preguntas al confirmar (canción, menús, actos), las formas de regalar (lluvia de sobres, transferencia) y el save the date. Lo que no cambie va en null. Lo actual sale en «mi_invitacion».',
    parameters: objeto({
      enlace_general: opcion(['crear', 'quitar'], 'crear (o cambiar: el anterior deja de abrir) o quitar el enlace general; null si no cambia.'),
      save_the_date: opcion(['crear', 'quitar'], 'crear o quitar el save the date (se compra como extra); null si no cambia.'),
      pedir_cancion: siNo('Si se pide una canción al confirmar; null si no cambia.'),
      menus: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }], description: 'Los menús a elegir (hasta 6; lista vacía para no preguntar); null si no cambia.' },
      actos: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }], description: 'Los actos a los que se apuntan (hasta 4; lista vacía para no preguntar); null si no cambia.' },
      sobres: siNo('Encender o apagar la lluvia de sobres; null si no cambia.'),
      sobres_texto: texto('El texto de la lluvia de sobres; null si no cambia.', true),
      transferencia: siNo('Encender o apagar la transferencia; null si no cambia.'),
      banco: texto('Banco de la transferencia; null si no cambia.', true),
      titular: texto('Titular de la cuenta; null si no cambia.', true),
      cuenta: texto('Número de cuenta; null si no cambia.', true),
      nota_de_regalo: texto('Una indicación para regalar; null si no cambia.', true),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'estilo_de_invitacion',
    description:
      'Cambia el color de acento y la letra de la invitación (planes Gala e Imperial), ya. Colores: Salvia, Esmeralda, Azul noche, Azul empolvado, Lavanda, Borgoña, Terracota, Rosa empolvado, Fucsia, Oro, Negro, Champán, Oro claro, Rosa claro, Lila claro, Plata. Caligrafías: Great Vibes, Alex Brush, Allura. Titulares: Cormorant, Cinzel, Marcellus, Italiana, Playfair. «original» vuelve a lo del diseño. Si el diseño no admite algo, el resultado dice qué admite.',
    parameters: objeto({
      color: texto('El nombre del color, «original» o null si no cambia.', true),
      caligrafia: texto('El nombre de la caligrafía, «original» o null si no cambia.', true),
      titulares: texto('El nombre de la letra de titulares, «original» o null si no cambia.', true),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_cortejo',
    description: 'Suma, edita, quita y marca confirmados a los del cortejo, ya. Los miembro_id salen de «cortejo».',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones.',
        objeto({
          accion: accion(ACCIONES.cortejo, 'Qué hacer.'),
          miembro_id: texto('El id del miembro; null para crear.', true),
          tipo: opcion(TIPOS_DE_CORTEJO, 'padrino, dama, caballero (boda), chambelan o corte (XV); null si no cambia.'),
          nombre: texto('Su nombre; null si no cambia.', true),
          whatsapp: texto('Su WhatsApp; null si no cambia.', true),
          apadrina: texto('Lo que apadrina: «Aros», «Torta»; null si no cambia.', true),
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_ensayos',
    description: 'Agenda o borra ensayos del cortejo, ya. Los ensayo_id y miembro_id salen de «cortejo».',
    parameters: objeto({
      operaciones: lista(
        'Las operaciones.',
        objeto({
          accion: accion(ACCIONES.ensayos, 'crear o borrar.'),
          ensayo_id: texto('El id del ensayo (borrar); null para crear.', true),
          fecha_hora: texto('AAAA-MM-DDTHH:MM, hora de Bolivia (crear); null si no.', true),
          lugar: texto('Dónde; null si no.', true),
          nota: texto('Una nota; null si no.', true),
          asistentes: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }], description: 'Los miembro_id que van; null para todo el cortejo.' },
        }),
      ),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_encargo',
    description:
      'El diseño por encargo (lo diseña el atelier), ya: enviar_datos manda las respuestas para que empiecen; pedir_cambios gasta una ronda con todos los cambios juntos en un mensaje; aprobar acepta la versión. Mira antes «encargo».',
    parameters: objeto({
      accion: accion(ACCIONES.encargo, 'Qué hacer.'),
      mensaje: texto('Para pedir_cambios: todos los cambios juntos; null si no.', true),
      respuestas: {
        anyOf: [
          objeto({
            secciones: texto('Qué secciones quiere y en qué orden; null si no.', true),
            tematica: texto('La temática o el estilo; null si no.', true),
            vestido: texto('Cómo es el vestido; null si no.', true),
            decoracion: texto('La decoración; null si no.', true),
            flores: texto('Las flores; null si no.', true),
          }),
          { type: 'null' },
        ],
        description: 'Para enviar_datos: lo que se pregunta (solo las preguntas de «encargo»); null si no.',
      },
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'quitar_planner',
    description: 'Quita el acceso de la planner a este evento (ids de «recepcion», en equipo). Su cuenta sigue.',
    parameters: objeto({ usuario_id: texto('El usuario_id de la planner.') }),
    strict: true,
  },
  {
    type: 'function',
    name: 'encargo',
    description: 'El diseño por encargo: en qué paso está, rondas usadas y las que quedan, para cuándo se entrega y qué preguntas faltan.',
    parameters: objeto({}),
    strict: true,
  },
  {
    type: 'function',
    name: 'gestionar_recepcion',
    description:
      'Suma o quita personal de recepción (quien escanea los pases en la puerta el día del evento), ya. Al sumar, el resultado trae su enlace y su PIN: dáselos a la persona tal cual. Los recepcion_id salen de «recepcion».',
    parameters: objeto({
      accion: accion(ACCIONES.recepcion, 'sumar o quitar.'),
      recepcion_id: texto('El id para quitar; null para sumar.', true),
      persona: texto('Su nombre (sumar); null si no.', true),
      whatsapp: texto('Su WhatsApp (sumar); null si no lo dieron.', true),
      puerta: texto('Qué puerta cuida (sumar); null si no.', true),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'sumar_planner',
    description: 'Da acceso al panel de este evento a la planner contratada, con su correo, ya. Le llega su contraseña por correo.',
    parameters: objeto({ correo: texto('El correo de la planner.') }),
    strict: true,
  },
  {
    type: 'function',
    name: 'deshacer_ingreso',
    description: 'Deshace un ingreso registrado por error en la puerta (ids de «buscar_invitados»).',
    parameters: objeto({ invitacion_id: texto('El id de la invitación.'), persona_id: texto('La persona cuyo ingreso se deshace; null para toda la invitación.', true) }),
    strict: true,
  },
  {
    type: 'function',
    name: 'poner_foto',
    description:
      'Pone en la invitación una foto que la persona adjuntó en el chat (el mensaje trae su foto_id): en el retrato o en una casilla de la galería, solo donde el diseño la pinta. «mi_invitacion» dice qué fotos hay puestas.',
    parameters: objeto({
      foto_id: texto('El foto_id del adjunto.'),
      donde: accion(['retrato', 'galeria'], 'retrato o galeria.'),
      casilla: numero('Para la galería: la casilla 1, 2…; null para la primera sin foto.', true),
      rotulo: texto('Para la galería: el pie de la foto («Nosotros en Sucre»); null si no cambia.', true),
    }),
    strict: true,
  },
  {
    type: 'function',
    name: 'qr_de_transferencia',
    description: 'Pone como QR de la transferencia (lo que el invitado escanea para regalar) una imagen que la persona adjuntó en el chat (su foto_id), y enciende la transferencia. No va a la galería.',
    parameters: objeto({ foto_id: texto('El foto_id del adjunto con el QR del banco.') }),
    strict: true,
  },
  {
    type: 'function',
    name: 'borrar_documento',
    description: 'Borra un documento subido (ids de «documentos»), ya.',
    parameters: objeto({ documento_id: texto('El id del documento.') }),
    strict: true,
  },
  {
    type: 'function',
    name: 'pedir_extra',
    description: 'Pide un extra para el evento (de «extras»): crea el pedido y el resultado trae el enlace para pagarlo. No se cobra solo.',
    parameters: objeto({ extra: texto('La clave del extra.') }),
    strict: true,
  },
]

// ─── Validación ──────────────────────────────────────────────────────────────

const nombre = z.string().trim().min(1).max(160)
const id = z.string().trim().min(1).max(64)
const textoNulo = (max: number) => z.string().trim().max(max).nullable()
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const bs = z.number().min(0).max(10_000_000).nullable()
const operaciones = <T extends z.ZodTypeAny>(op: T) => z.object({ operaciones: z.array(op).min(1).max(MAX_OPERACIONES) }).strict()
/** Cada acción pide lo suyo: un id para tocar algo que existe, un nombre para crear. */
const cumple = (accionPedida: string, reglas: Record<string, () => boolean>) => reglas[accionPedida]?.() ?? true
const lleno = (v: string | null | undefined) => v !== null && v !== undefined && v.trim() !== ''

/** Un WhatsApp dictado que no es un celular vuelve al modelo con qué hacer, en vez de guardarse (9 oct). */
const celular = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .refine(
    (t) => t === null || t === '' || celularDictado(t) !== null,
    'no es un celular válido (8 cifras que empiezan por 6 o 7, o + y código de país). No lo guardes: repite a la persona el número de dos en dos (76 94 49 86) y pregúntale si es así.',
  )
export const esquemaDeInvitacion = z.object({ personas: z.array(nombre).min(1).max(MAX_PERSONAS_POR_INVITACION), telefono: celular, aun_si_existe: z.boolean() })
export const esquemaDePropuesta = z.array(esquemaDeInvitacion).min(1).max(MAX_INVITACIONES_POR_PROPUESTA)
export type InvitacionPropuesta = z.infer<typeof esquemaDeInvitacion>

const opInvitado = z
  .object({
    accion: z.enum(ACCIONES.invitados),
    persona_id: id.nullable(),
    invitacion_id: id.nullable(),
    nombre: textoNulo(160),
    telefono: celular,
    vip: z.boolean().nullable(),
    restriccion: textoNulo(200),
    asiste: z.enum(ASISTENCIA).nullable(),
  })
  .refine(
    (o) =>
      cumple(o.accion, {
        editar: () => o.persona_id !== null,
        quitar: () => o.persona_id !== null,
        acompanante: () => o.invitacion_id !== null && lleno(o.nombre),
        asistencia: () => o.persona_id !== null && o.asiste !== null,
        mover: () => o.persona_id !== null && o.invitacion_id !== null,
        reabrir: () => o.invitacion_id !== null,
        revocar: () => o.invitacion_id !== null,
        enlace_nuevo: () => o.invitacion_id !== null,
      }),
    { message: 'editar y quitar necesitan persona_id; acompanante, invitacion_id y nombre; asistencia, persona_id y asiste; mover, persona_id e invitacion_id; reabrir, revocar y enlace_nuevo, invitacion_id' },
  )
const lugar = z.object({ lugar: textoNulo(120), direccion: textoNulo(240), hora: hora.nullable() }).nullable()
const nombresDePadrinos = z.array(z.string().trim().min(1).max(160)).max(12).nullable()
export const esquemaDeTextos = z.object({
  nombre_a: textoNulo(120),
  nombre_b: textoNulo(120),
  texto_sobre_nombres: textoNulo(120),
  iniciales: textoNulo(40),
  texto_bajo_nombres: textoNulo(120),
  colores_vestimenta: z.array(z.string().trim().min(1).max(40)).max(8).nullable(),
  ubicacion: textoNulo(2048),
  anfitriones: z
    .object({
      titulo: textoNulo(120),
      padre: textoNulo(160),
      madre: textoNulo(160),
      padre_novia: textoNulo(160),
      madre_novia: textoNulo(160),
      padre_novio: textoNulo(160),
      madre_novio: textoNulo(160),
      padrinos: nombresDePadrinos,
    })
    .nullable(),
  cancion: z.object({ titulo: z.string().trim().min(1).max(160), artista: textoNulo(160) }).nullable(),
  frase: textoNulo(600),
  fecha_hora: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  ceremonia: lugar,
  recepcion: lugar,
  vestimenta: z.object({ titulo: z.string().trim().min(1).max(120), nota: textoNulo(600) }).nullable(),
  avisos: z
    .array(z.object({ titulo: z.string().trim().min(1).max(120), texto: textoNulo(600) }))
    .max(4)
    .nullable(),
  cierre: textoNulo(600),
})
export type TextosPropuestos = z.infer<typeof esquemaDeTextos>
const opTarea = z
  .object({ accion: z.enum(ACCIONES.tareas), tarea_id: id.nullable(), titulo: textoNulo(200), vence: z.union([dia, z.literal('')]).nullable(), responsable: z.enum(RESPONSABLES).nullable() })
  .refine((o) => cumple(o.accion, { crear: () => lleno(o.titulo), editar: () => o.tarea_id !== null, hecha: () => o.tarea_id !== null, pendiente: () => o.tarea_id !== null, borrar: () => o.tarea_id !== null }), {
    message: 'crear necesita titulo; las demás, tarea_id',
  })
const opPresupuesto = z
  .object({
    accion: z.enum(ACCIONES.presupuesto),
    partida_id: id.nullable(),
    pago_id: id.nullable(),
    concepto: textoNulo(160),
    categoria: textoNulo(40),
    previsto_bs: bs,
    contratado_bs: bs,
    importe_bs: bs,
    vence: dia.nullable(),
    pagado: z.boolean().nullable(),
  })
  .refine(
    (o) => cumple(o.accion, {
      fijar_total: () => o.importe_bs !== null,
      crear_partida: () => lleno(o.concepto) && lleno(o.categoria),
      editar_partida: () => o.partida_id !== null,
      borrar_partida: () => o.partida_id !== null,
      registrar_pago: () => o.partida_id !== null && o.importe_bs !== null,
      marcar_pagado: () => o.pago_id !== null,
      marcar_pendiente: () => o.pago_id !== null,
      borrar_pago: () => o.pago_id !== null,
    }),
    { message: 'crear_partida necesita concepto y categoria; registrar_pago, partida_id e importe_bs; las demás, su id' },
  )
const opMomento = z
  .object({ accion: z.enum(ACCIONES.cronograma), momento_id: id.nullable(), hora: hora.nullable(), momento: textoNulo(160), lugar: textoNulo(160), en_invitacion: z.boolean().nullable() })
  .refine((o) => cumple(o.accion, { crear: () => o.hora !== null && lleno(o.momento), editar: () => o.momento_id !== null, borrar: () => o.momento_id !== null }), {
    message: 'crear necesita hora y momento; las demás, momento_id',
  })
const opCita = z
  .object({ accion: z.enum(ACCIONES.agenda), cita_id: id.nullable(), titulo: textoNulo(200), dia: dia.nullable(), hora: hora.nullable(), minutos: z.number().int().min(5).max(1440).nullable(), lugar: textoNulo(200) })
  .refine((o) => cumple(o.accion, { crear: () => lleno(o.titulo) && o.dia !== null && o.hora !== null, editar: () => o.cita_id !== null, borrar: () => o.cita_id !== null, suscribir: () => true }), {
    message: 'crear necesita titulo, dia y hora; las demás, cita_id',
  })
const opProveedor = z
  .object({
    accion: z.enum(ACCIONES.proveedores),
    proveedor_id: id.nullable(),
    servicio: textoNulo(120),
    empresa: textoNulo(160),
    contacto: textoNulo(160),
    whatsapp: textoNulo(40),
    estado: z.enum(ESTADOS_DE_PROVEEDOR).nullable(),
    precio_bs: bs,
    categoria: textoNulo(40),
  })
  .refine((o) => o.accion === 'crear' ? lleno(o.servicio) : o.proveedor_id !== null, {
    message: 'crear necesita servicio; las demás, proveedor_id',
  })
const opMesa = z
  .object({ accion: z.enum(ACCIONES.mesas), mesa_id: id.nullable(), invitacion_id: id.nullable(), nombre: textoNulo(60), lugares: z.number().int().min(1).max(40).nullable(), zona: z.enum(ZONAS).nullable(), zona_id: id.nullable() })
  .refine(
    (o) => cumple(o.accion, {
      crear: () => lleno(o.nombre) && o.lugares !== null,
      editar: () => o.mesa_id !== null,
      borrar: () => o.mesa_id !== null,
      sentar: () => o.mesa_id !== null && o.invitacion_id !== null,
      levantar: () => o.invitacion_id !== null,
      zona: () => o.zona !== null && (o.zona !== 'custom' || lleno(o.nombre)),
      editar_zona: () => o.zona_id !== null,
      borrar_zona: () => o.zona_id !== null,
    }),
    { message: 'crear necesita nombre y lugares; editar y borrar, mesa_id; sentar, mesa_id e invitacion_id; levantar, invitacion_id; zona, su tipo (custom con nombre)' },
  )
const opRegalo = z
  .object({
    accion: z.enum(ACCIONES.regalos),
    regalo_id: id.nullable(),
    nombre: textoNulo(160),
    precio_bs: bs,
    tienda: textoNulo(120),
    enlace: z
      .string()
      .trim()
      .max(2048)
      .regex(/^https?:\/\//)
      .nullable(),
    descripcion: textoNulo(400),
    fondo_id: id.nullable(),
    quien: textoNulo(120),
    metodo: z.enum(METODOS_DE_APORTE).nullable(),
  })
  .refine(
    (o) => cumple(o.accion, {
      crear: () => lleno(o.nombre) && o.precio_bs !== null,
      crear_fondo: () => lleno(o.nombre) && o.precio_bs !== null,
      editar: () => o.regalo_id !== null,
      borrar: () => o.regalo_id !== null,
      comprado: () => o.regalo_id !== null,
      liberar: () => o.regalo_id !== null,
      editar_fondo: () => o.fondo_id !== null,
      borrar_fondo: () => o.fondo_id !== null,
      aporte: () => o.fondo_id !== null && o.precio_bs !== null && lleno(o.quien),
    }),
    { message: 'crear y crear_fondo necesitan nombre y precio_bs; editar, borrar, comprado y liberar, regalo_id; editar_fondo y borrar_fondo, fondo_id; aporte, fondo_id, precio_bs y quien' },
  )

const opCortejo = z
  .object({ accion: z.enum(ACCIONES.cortejo), miembro_id: id.nullable(), tipo: z.enum(TIPOS_DE_CORTEJO).nullable(), nombre: textoNulo(160), whatsapp: textoNulo(40), apadrina: textoNulo(200) })
  .refine((o) => cumple(o.accion, { crear: () => lleno(o.nombre) && o.tipo !== null, editar: () => o.miembro_id !== null, borrar: () => o.miembro_id !== null, confirmar: () => o.miembro_id !== null, desconfirmar: () => o.miembro_id !== null }), {
    message: 'crear necesita nombre y tipo; las demás, miembro_id',
  })
const opEnsayo = z
  .object({
    accion: z.enum(ACCIONES.ensayos),
    ensayo_id: id.nullable(),
    fecha_hora: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    lugar: textoNulo(120),
    nota: textoNulo(2000),
    asistentes: z.array(id).max(60).nullable(),
  })
  .refine((o) => (o.accion === 'crear' ? o.fecha_hora !== null : o.ensayo_id !== null), { message: 'crear necesita fecha_hora; borrar, ensayo_id' })
const lineas = (max: number) => z.array(z.string().trim().min(1).max(60)).max(max).nullable()

export type OpInvitado = z.infer<typeof opInvitado>
export type OpTarea = z.infer<typeof opTarea>
export type OpPresupuesto = z.infer<typeof opPresupuesto>
export type OpMomento = z.infer<typeof opMomento>
export type OpCita = z.infer<typeof opCita>
export type OpProveedor = z.infer<typeof opProveedor>
export type OpMesa = z.infer<typeof opMesa>
export type OpRegalo = z.infer<typeof opRegalo>

/** Una fila de la tarjeta de envío: la arma el servidor (enlace y mensaje), nunca el modelo. */
export type FilaDeEnvio = {
  readonly id: string
  readonly nombre: string
  readonly telefono: string | null
  /** El mensaje con su enlace; sin enlace guardado lleva «{enlace}» y la tarjeta lo pide al tocar. */
  readonly mensaje: string
  /** Si el mensaje ya trae el enlace de la invitación. */
  readonly conEnlace: boolean
  /** En los recordatorios: qué recordatorio es, para anotarlo. */
  readonly recordatorio?: 'sin_abrir' | 'sin_respuesta'
}

/** La única tarjeta que queda: el envío por WhatsApp, que necesita el toque de la persona. */
export type Propuesta = { readonly clase: 'envio'; readonly tipo: 'invitacion' | 'recordatorio'; readonly filas: readonly FilaDeEnvio[] }

const esquemas = {
  resumen_del_evento: z.object({}).strict(),
  buscar_invitados: z.object({ texto: z.string().trim().max(120).nullable(), estado: z.enum(ESTADOS_DE_INVITADO).nullable() }).strict(),
  tareas: z.object({ filtro: z.enum(FILTROS_DE_TAREA).nullable() }).strict(),
  presupuesto: z.object({}).strict(),
  proveedores: z.object({}).strict(),
  cronograma: z.object({}).strict(),
  agenda: z.object({ desde: dia.nullable(), hasta: dia.nullable() }).strict(),
  mi_invitacion: z.object({}).strict(),
  mesas: z.object({}).strict(),
  regalos: z.object({}).strict(),
  mensajes: z.object({}).strict(),
  ir_a: z.object({ pantalla: z.enum(PANTALLAS) }).strict(),
  como_se_hace: z.object({ tema: z.enum(TEMAS_DE_AYUDA) }).strict(),
  preparar_envio: z.object({ incluir_enviadas: z.boolean() }).strict(),
  preparar_recordatorios: z.object({}).strict(),
  registrar_invitados: z.object({ invitaciones: esquemaDePropuesta }).strict(),
  cambiar_invitados: operaciones(opInvitado),
  escribir_invitacion: esquemaDeTextos.strict(),
  renombrar_evento: z.object({ titulo: nombre }).strict(),
  gestionar_tareas: operaciones(opTarea),
  gestionar_presupuesto: operaciones(opPresupuesto),
  gestionar_cronograma: operaciones(opMomento),
  gestionar_agenda: operaciones(opCita),
  gestionar_proveedores: operaciones(opProveedor),
  gestionar_mesas: operaciones(opMesa),
  gestionar_regalos: operaciones(opRegalo),
  agradecer_mensajes: z
    .object({ agradecimientos: z.array(z.object({ mensaje_id: id, respuesta: z.string().trim().min(1).max(600) })).min(1).max(MAX_OPERACIONES) })
    .strict(),
  registrar_ingreso: z.object({ invitacion_id: id, personas: z.number().int().min(1).max(60).nullable() }).strict(),
  cortejo: z.object({}).strict(),
  recepcion: z.object({}).strict(),
  extras: z.object({}).strict(),
  opciones_de_invitacion: z
    .object({
      enlace_general: z.enum(['crear', 'quitar']).nullable(),
      save_the_date: z.enum(['crear', 'quitar']).nullable(),
      pedir_cancion: z.boolean().nullable(),
      menus: lineas(6),
      actos: lineas(4),
      sobres: z.boolean().nullable(),
      sobres_texto: textoNulo(400),
      transferencia: z.boolean().nullable(),
      banco: textoNulo(120),
      titular: textoNulo(120),
      cuenta: textoNulo(60),
      nota_de_regalo: textoNulo(400),
    })
    .strict(),
  estilo_de_invitacion: z.object({ color: textoNulo(40), caligrafia: textoNulo(40), titulares: textoNulo(40) }).strict(),
  gestionar_cortejo: operaciones(opCortejo),
  gestionar_recepcion: z
    .object({ accion: z.enum(ACCIONES.recepcion), recepcion_id: id.nullable(), persona: textoNulo(120), whatsapp: textoNulo(40), puerta: textoNulo(60) })
    .strict()
    .refine((o) => (o.accion === 'sumar' ? lleno(o.persona) : o.recepcion_id !== null), { message: 'sumar necesita persona; quitar, recepcion_id' }),
  sumar_planner: z.object({ correo: z.string().trim().email().max(200) }).strict(),
  deshacer_ingreso: z.object({ invitacion_id: id, persona_id: id.nullable() }).strict(),
  pedir_extra: z.object({ extra: z.string().trim().min(1).max(60) }).strict(),
  documentos: z.object({}).strict(),
  puerta: z.object({}).strict(),
  encargo: z.object({}).strict(),
  gestionar_ensayos: operaciones(opEnsayo),
  gestionar_encargo: z
    .object({
      accion: z.enum(ACCIONES.encargo),
      mensaje: textoNulo(3000),
      respuestas: z.object({ secciones: textoNulo(1000), tematica: textoNulo(1000), vestido: textoNulo(1000), decoracion: textoNulo(1000), flores: textoNulo(1000) }).nullable(),
    })
    .strict()
    .refine((o) => (o.accion === 'pedir_cambios' ? (o.mensaje ?? '').trim().length >= 5 : o.accion === 'enviar_datos' ? o.respuestas !== null : true), { message: 'pedir_cambios necesita el mensaje; enviar_datos, las respuestas' }),
  quitar_planner: z.object({ usuario_id: id }).strict(),
  qr_de_transferencia: z.object({ foto_id: id }).strict(),
  borrar_documento: z.object({ documento_id: id }).strict(),
  poner_foto: z.object({ foto_id: id, donde: z.enum(['retrato', 'galeria']), casilla: z.number().int().min(1).max(12).nullable(), rotulo: textoNulo(120) }).strict(),
} as const

type Esquemas = typeof esquemas
// `nombre` es el de la herramienta en `LlamadaValida`: un argumento con ese nombre lo pisaría (pasó con
// `renombrar_evento`). Lo vigila `dominio.test.ts`.
export type LlamadaValida = { [K in keyof Esquemas]: { readonly nombre: K } & z.infer<Esquemas[K]> }[keyof Esquemas]

/** Las herramientas que cambian algo: tras ellas, el panel se vuelve a pintar para enseñarlo. */
export const ESCRITURAS: ReadonlySet<string> = new Set([
  'registrar_invitados',
  'cambiar_invitados',
  'escribir_invitacion',
  'renombrar_evento',
  'gestionar_tareas',
  'gestionar_presupuesto',
  'gestionar_cronograma',
  'gestionar_agenda',
  'gestionar_proveedores',
  'gestionar_mesas',
  'gestionar_regalos',
  'agradecer_mensajes',
  'registrar_ingreso',
  'opciones_de_invitacion',
  'estilo_de_invitacion',
  'gestionar_cortejo',
  'gestionar_recepcion',
  'sumar_planner',
  'deshacer_ingreso',
  'pedir_extra',
  'poner_foto',
  'qr_de_transferencia',
  'borrar_documento',
  'gestionar_ensayos',
  'gestionar_encargo',
  'quitar_planner',
])

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
  const nombreValido = nombreDeHerramienta as keyof Esquemas
  const leido = esquemas[nombreValido].safeParse(crudo)
  if (!leido.success) return { ok: false, error: `Argumentos no válidos: ${leido.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` }
  return { ok: true, llamada: { nombre: nombreValido, ...(leido.data as object) } as LlamadaValida }
}

export type { TemaDeAyuda }
