/**
 * Lo que una Server Action le devuelve a la pantalla: qué pasó y qué decirle a quien pulsó.
 *
 * Es la forma que ya tenían `VentaActionState` y `ClienteActionState` —idénticas— escrita una
 * sola vez, para que un botón suelto (`AccionConAviso`) pueda pintar el aviso de cualquiera de
 * ellas sin que cada módulo tenga que importar el estado del otro.
 */
export type EstadoDeAccion = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

export const SIN_EMPEZAR: EstadoDeAccion = { status: 'idle' }
