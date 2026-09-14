export type HelpTopic = { readonly question: string; readonly answer: string }

/**
 * El contacto de soporte **no vive aquí**: el WhatsApp lo edita el admin en «La web» y llega
 * a la ayuda por props desde la página, que es quien puede leer la base.
 */
export type HelpContact = { readonly numero: string; readonly visible: string; readonly saludo: string }

/**
 * Las preguntas cubren lo que **este** panel hace de verdad. El FAQ de la maqueta no
 * sirve: hablaba de funciones que aquí no existen y de otra marca, y una ayuda que
 * describe lo que no hay es peor que no tener ayuda.
 */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    question: '¿Cómo creo un evento?',
    answer:
      'En el panel, «Nuevo evento». Necesitas el título, la fecha, el idioma en el que hablará la invitación y la plantilla. El idioma es del evento, no del navegador: el invitado verá su página en el idioma que elijas aquí, mire desde donde mire.',
  },
  {
    question: '¿Cómo reparto los enlaces a los invitados?',
    answer:
      'Cada grupo de invitados tiene su propio enlace, con sus cupos. Se crea al añadir el grupo y se copia desde la tabla de invitados. Un enlace por grupo, no por persona: quien lo recibe confirma por todos los suyos sin crearse ninguna cuenta.',
  },
  {
    question: '¿Qué pasa si revoco un enlace?',
    answer:
      'Deja de funcionar al momento y quien lo abra verá que la página no existe. No decimos que el enlace fue revocado: eso confirmaría que existió, y es justo lo que busca quien va probando enlaces ajenos.',
  },
  {
    question: '¿Cómo funciona el modo puerta el día del evento?',
    answer:
      'Se abre desde el evento y ocupa la pantalla entera, pensado para el móvil de quien recibe. Escanea el pase del invitado y canta el nombre, los cupos y la mesa. Puedes instalarlo en la pantalla de inicio del teléfono.',
  },
  {
    question: '¿Y si en el salón no hay señal?',
    answer:
      'El modo puerta sigue funcionando sin conexión: descarga la lista antes de empezar y guarda cada llegada en el teléfono. La cabecera muestra cuántos escaneos quedan por subir; cuando marca cero, todo está guardado en el servidor y puedes cerrar la puerta tranquilo.',
  },
  {
    question: '¿Cómo asigno las mesas?',
    answer:
      'En «Mesas» del evento. Se dibujan las mesas y las zonas del salón, y se arrastran los grupos desde la tira de los que aún no tienen sitio. La mesa asignada viaja al pase del invitado, así que en la puerta se canta sola.',
  },
  {
    question: '¿Cómo funciona la mesa de regalos?',
    answer:
      'Añades regalos con su precio y su tienda, y fondos con su meta. El invitado ve la lista en su invitación y reserva lo que va a traer; un regalo reservado deja de estar disponible para los demás. Corregir un precio no suelta la reserva de quien ya lo apartó.',
  },
  {
    question: '¿Qué significan los límites del plan?',
    answer:
      'Cada plan trae un tope de grupos de invitados y unas funciones incluidas: el plano del salón, la mesa de regalos y el modo puerta. Si una función no viene con el plan, el panel te dice a qué plan sí la trae. Al bajar de plan, la mesa de regalos se congela en vez de desaparecer: lo que un invitado ya reservó se sigue viendo, para que no lo compre dos veces.',
  },
  {
    question: '¿De dónde salen las estadísticas del evento?',
    answer:
      'De las respuestas de los propios invitados: cuántos grupos hay, cuántos respondieron y cuántos confirmaron. Nada más. No medimos ni dispositivos ni de dónde llegó nadie, así que tampoco lo pintamos.',
  },
]
