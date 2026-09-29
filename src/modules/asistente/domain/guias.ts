/**
 * Cómo se hace cada cosa en el panel, **escrito por nosotros**: Arturo no se inventa pantallas ni
 * botones, los lee de aquí (`como_se_hace`). La ruta es relativa al evento (`/invitados`).
 */
export const TEMAS_DE_AYUDA = [
  'agregar_invitados',
  'importar_lista',
  'enviar_invitaciones',
  'recordatorios',
  'mi_invitacion',
  'mesas',
  'regalos',
  'mensajes',
  'ingreso',
  'equipo',
  'tareas',
  'presupuesto',
  'proveedores',
  'cronograma',
] as const
export type TemaDeAyuda = (typeof TEMAS_DE_AYUDA)[number]

export const GUIAS: Record<TemaDeAyuda, { readonly texto: string; readonly ruta: string }> = {
  agregar_invitados: {
    ruta: '/invitados?panel=alta',
    texto: 'En Invitados, «+ Añadir invitado»: nombre, si viene solo o acompañado y el nombre de cada acompañante. También puedes pedírmelo a mí: dime los nombres y su WhatsApp.',
  },
  importar_lista: { ruta: '/invitados?panel=importar', texto: 'En Invitados, «Importar»: subes un CSV y cada fila dice si entró o por qué no.' },
  enviar_invitaciones: {
    ruta: '/invitados?panel=envio',
    texto: 'En Invitados, «Enviar invitaciones»: cada invitado tiene su botón que abre tu WhatsApp con el mensaje y su enlace ya escritos. También puedes copiar el enlace o compartir su QR.',
  },
  recordatorios: { ruta: '/invitados', texto: 'Cuando hay a quién recordar, Invitados enseña la tarjeta «Recordatorios» con un botón de WhatsApp por persona.' },
  mi_invitacion: { ruta: '/configuracion', texto: 'En «Mi invitación» escribes los textos por pasos (portada, fecha y lugar, familia, detalles y música) y ves la vista previa al lado.' },
  mesas: { ruta: '/mesas', texto: 'En Mesas creas las mesas con su cupo, sientas a cada invitación y puedes repartir automáticamente lo que falta.' },
  regalos: { ruta: '/regalos', texto: 'En Regalos eliges las formas de regalar (lluvia de sobres, transferencia con el QR de tu banco) y, si tu plan la trae, la lista de regalos.' },
  mensajes: { ruta: '/mensajes', texto: 'En Mensajes está el libro de firmas: lo que te escriben al confirmar. Con «Agradecer» les respondes y lo ven en su invitación.' },
  ingreso: { ruta: '/checkin', texto: 'En «Ingreso al evento» la recepción escanea el QR de cada pase o escribe su código corto, y ves quién ya llegó.' },
  equipo: { ruta: '/equipo', texto: 'En Equipo sumas a tu planner y al personal de recepción (entran con un enlace y un PIN el día del evento).' },
  tareas: { ruta: '/planner/tareas', texto: 'En «Plan de tareas» tienes lo que falta por hacer con su fecha; puedes crear el plan con la plantilla de tu fiesta.' },
  presupuesto: { ruta: '/planner/presupuesto', texto: 'En Presupuesto fijas el total, lo repartes por categoría y registras anticipos, cuotas y saldos.' },
  proveedores: { ruta: '/planner/proveedores', texto: 'En Proveedores llevas cada servicio con su contacto y estado, de «cotizando» a «confirmado».' },
  cronograma: { ruta: '/planner/cronograma', texto: 'En Cronograma armas los momentos de la noche con su hora; los que marques salen en el itinerario de tu invitación.' },
}
