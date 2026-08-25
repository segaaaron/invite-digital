/**
 * Imprimir **solo** lo marcado con `data-para-imprimir`, dejando fuera el resto de la
 * página.
 *
 * Existe porque las dos cosas que el panel manda al papel —el pase de la puerta y la hoja
 * de reparto— viven dentro de una pantalla llena de controles, y no se pueden mover a una
 * ruta propia como el plan del banquete: dibujan un enlace que **acaba de nacer en el
 * navegador** y del que la base solo guarda el SHA-256. Abrirlo en otra pestaña dejaría
 * ese enlace escrito en la barra de direcciones y en el historial.
 *
 * La regla que esconde lo demás está en `globals.css` y se cuelga de esta marca.
 */
export const PRINT_MARK = 'tarjeta'

export function printMarkedOnly(): void {
  document.body.dataset.imprimiendo = PRINT_MARK
  try {
    window.print()
  } finally {
    // En `finally`: si imprimir revienta o el usuario cancela, una marca olvidada deja
    // en blanco la siguiente impresión de cualquier otra cosa del panel.
    delete document.body.dataset.imprimiendo
  }
}
