export type { Event, EventStatus } from './domain/event'
export { acceptsResponses } from './domain/event'
export { FIESTAS, fiestaDeCategoria, mismaFiesta, VOCABULARIO, type Fiesta, type Vocabulario } from './domain/fiesta'
export type { EventError, EventErrorKind } from './domain/errors'
export type { EventRepository } from './application/ports'

/**
 * **Aquí NO se exportan las Server Actions, y costó una prueba entera descubrirlo.**
 *
 * Se añadió `staff-actions` a este índice para que el panel admin reutilizara el alta de
 * acceso del cliente. El efecto fue que **todo el que importa `@/modules/events` pasó a
 * arrastrar el contenedor completo**: `rsvp` solo quería el tipo `Event` y se trajo el
 * mundo, con dependencia circular incluida —`respondToInvitation is not a function`,
 * porque el contenedor estaba a medio construir—.
 *
 * Este índice expone **tipos y funciones puras**. Lo que necesite una acción la importa
 * por su ruta concreta desde la frontera, que es donde el contenedor ya está cargado de
 * todos modos.
 */
