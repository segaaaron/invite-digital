/**
 * Una celda de CSV que **no se convierte en otra cosa** al abrirla en una hoja de cálculo.
 *
 * Dos peligros distintos y los dos del mismo texto —el nombre que escribió un cliente en su pedido—:
 *
 * 1. **Fórmulas.** Una celda que empieza por `=`, `+`, `-` o `@` la evalúa Excel, y con `WEBSERVICE`
 *    o `HYPERLINK` eso saca datos de la hoja hacia fuera. Se le pone delante una comilla simple,
 *    que es lo que la hoja entiende como «esto es texto». También con espacios delante: Excel los
 *    ignora al decidir si evalúa.
 * 2. **Separadores dentro del texto.** Entrecomillar solo cuando había coma, comilla o salto de
 *    línea dejaba pasar el **punto y coma** —el separador en un Excel en español, que es el que se
 *    usa en Bolivia— y el **retorno de carro** suelto: `Juan;=1+1;` abría una celda nueva que ya
 *    empezaba por `=` y se evaluaba sin protección (F16 del escaneo del 19 oct). Se entrecomilla
 *    ante cualquiera de los dos separadores, los dos saltos y el tabulador.
 */
export function celdaCsv(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  // Un número con signo **no** es una fórmula. Sin esta salida, «-50.00» —lo que falta de una
  // partida ya pagada de más— entraba con apóstrofo, la hoja lo leía como texto y la columna de
  // dinero dejaba de sumar: una protección contra fórmulas que rompía la planilla que protege.
  const esNumero = /^-?\d+([.,]\d+)?$/.test(texto)
  const seguro = !esNumero && /^\s*[=+\-@]/.test(texto) ? `'${texto}` : texto
  return /["\n\r,;\t]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro
}
