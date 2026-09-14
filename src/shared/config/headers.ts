/**
 * Cabeceras que el proxy escribe en la **petición** para que los Server Components las
 * lean con `headers()`.
 *
 * Están aquí y no escritas a mano en cada sitio porque el nombre tiene que coincidir en
 * dos ficheros que no se importan entre sí —el proxy y quien lo lee—, y una errata ahí no
 * da error: simplemente llega vacío.
 */

/** El nonce de la política de seguridad de contenido. */
export const NONCE_HEADER = 'x-nonce'

/**
 * La ruta que se está sirviendo.
 *
 * Un Server Component no puede saber en qué dirección está, y el guard de sesión lo
 * necesita para no mandar a cambiar la contraseña a quien **ya** está en esa pantalla.
 */
export const PATHNAME_HEADER = 'x-pathname'
