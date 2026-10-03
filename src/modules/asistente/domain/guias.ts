/**
 * Cómo se hace cada cosa en el panel, **escrito por nosotros**: Luxury no se inventa pantallas ni
 * botones, los lee de aquí (`como_se_hace`). La ruta es relativa al evento (`/invitados`).
 */
export const TEMAS_DE_AYUDA = [
  'agregar_invitados',
  'importar_lista',
  'enlace_general',
  'preguntas_al_confirmar',
  'save_the_date',
  'colores_y_letra',
  'enviar_invitaciones',
  'recordatorios',
  'mi_invitacion',
  'diseno_por_encargo',
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
  importar_lista: { ruta: '/invitados?panel=importar', texto: 'En Invitados, «Importar CSV»: copias las columnas de tu Excel o Google Sheets (nombre, cupos y WhatsApp) y las pegas; cada fila dice si entró o por qué no.' },
  enlace_general: {
    ruta: '/invitados',
    texto: 'En Invitados, «Enlace general»: un solo enlace para el grupo de la familia. Quien lo abre escribe su nombre y quiénes van con él, y recibe su invitación con su pase; aparece en tu lista.',
  },
  save_the_date: {
    ruta: '/configuracion',
    texto: 'El save the date se pide en Extras. Con él, en «Personalizar invitación», «Crear el save the date» te da un enlace con la portada de tu diseño, los nombres, la fecha, cuánto falta y «Agregar a mi calendario».',
  },
  colores_y_letra: {
    ruta: '/configuracion',
    texto: 'En Gala e Imperial, en «Personalizar invitación», «Colores y letra»: eliges el color de los titulares, filetes y botones de tu diseño y su letra caligráfica, y lo ves al momento en tu invitación. Las ilustraciones y fotos no cambian. Solo salen los colores que se leen bien sobre tu diseño.',
  },
  preguntas_al_confirmar: {
    ruta: '/configuracion',
    texto: 'En «Personalizar invitación», «Preguntas al confirmar»: pides la canción que no puede faltar, los menús para elegir y a qué actos va (civil, iglesia, fiesta). Lo contestado sale en tu Resumen.',
  },
  enviar_invitaciones: {
    ruta: '/invitados?panel=envio',
    texto: 'En Invitados, «Enviar invitaciones»: cada invitado tiene su botón que abre tu WhatsApp con el mensaje y su enlace ya escritos. También puedes copiar el enlace o compartir su QR.',
  },
  recordatorios: { ruta: '/invitados', texto: 'Cuando hay a quién recordar, Invitados enseña la tarjeta «Recordatorios» con un botón de WhatsApp por persona.' },
  mi_invitacion: { ruta: '/configuracion', texto: 'En «Personalizar invitación» completas cada sección en el orden en que se ve tu invitación (nombres, fecha y lugar, familia, detalles, fotos y música) y ves la vista previa al lado. Las fotos son las que tiene tu diseño; la portada es la del diseño y no se cambia.' },
  diseno_por_encargo: {
    ruta: '/configuracion',
    texto:
      'Si tu plan es de diseño por encargo, arriba de «Personalizar invitación» ves los pasos: escribes tus datos y fotos y pulsas «Enviar mis datos para diseñar»; te avisamos cuando la versión esté lista; la apruebas o pides cambios (una ronda es un solo mensaje con todos tus cambios). Se reparte cuando la apruebas y pagas el saldo.',
  },
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
