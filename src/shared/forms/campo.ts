/**
 * El texto de un campo de formulario, vacío si no viene. Es lo que las Server Actions
 * escribían a mano setenta veces como `String(fd.get('x') ?? '')`, más tres ayudantes locales
 * idénticos. Mismo resultado: validar el valor sigue siendo cosa de cada acción.
 */
export const campo = (fd: FormData, nombre: string): string => String(fd.get(nombre) ?? '')
