/** El tope de RFC 5321: más largo no llega a ningún buzón. */
export const MAX_CORREO = 254

/**
 * Cada trozo del dominio excluye el punto, así que solo hay una forma de partirlo y la regex
 * no vuelve atrás. La de antes (`[^\s@]+\.[^\s@]+`) sí: un correo largo de `a.a.a.…` colgaba
 * el único contenedor desde el login.
 */
const FORMA = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/

/** Si tiene forma de correo. La misma regla para el alta, el login, los pedidos y las consultas. */
export const esCorreo = (correo: string): boolean => correo.length <= MAX_CORREO && FORMA.test(correo)
