/**
 * El mensaje de un campo que no pasa la validación del formulario, en el idioma de la página.
 *
 * Sustituye a la burbuja del navegador («Please fill out this field.»), que sale en el idioma
 * del sistema y con su propia piel. Lee `validity`: lo que el campo ya declara —`required`,
 * `type="email"`, `minLength`, `min`, `pattern`…— sigue siendo la regla; esto solo lo dice.
 */
export type CampoValidable = Pick<HTMLInputElement, 'validity' | 'type' | 'minLength' | 'maxLength' | 'min' | 'max' | 'title' | 'validationMessage' | 'value'>

const ES = {
  obligatorio: 'Este campo es obligatorio.',
  casilla: 'Marca esta casilla para continuar.',
  opcion: 'Elige una opción.',
  archivo: 'Elige un archivo.',
  correo: 'Escribe un correo válido, como nombre@correo.com.',
  enlace: 'Escribe un enlace completo, que empiece por https://.',
  corto: (min: number, lleva: number) => `Escribe al menos ${min} caracteres (llevas ${lleva}).`,
  largo: (max: number) => `Como máximo ${max} caracteres.`,
  minimo: (min: string) => `El mínimo es ${min}.`,
  maximo: (max: string) => `El máximo es ${max}.`,
  numero: 'Escribe un número válido.',
  formato: 'El formato no es válido.',
  paso: 'Ese valor no es válido aquí.',
}

const EN: typeof ES = {
  obligatorio: 'This field is required.',
  casilla: 'Check this box to continue.',
  opcion: 'Choose an option.',
  archivo: 'Choose a file.',
  correo: 'Enter a valid email, like name@email.com.',
  enlace: 'Enter a full link, starting with https://.',
  corto: (min, lleva) => `Use at least ${min} characters (you have ${lleva}).`,
  largo: (max) => `At most ${max} characters.`,
  minimo: (min) => `The minimum is ${min}.`,
  maximo: (max) => `The maximum is ${max}.`,
  numero: 'Enter a valid number.',
  formato: 'The format is not valid.',
  paso: 'That value is not valid here.',
}

export function mensajeDeValidacion(campo: CampoValidable, etiqueta: 'select' | 'textarea' | 'input', idioma: string): string {
  const t = idioma.startsWith('en') ? EN : ES
  const v = campo.validity
  if (v.valueMissing) {
    if (campo.type === 'checkbox') return t.casilla
    if (campo.type === 'radio' || etiqueta === 'select') return t.opcion
    if (campo.type === 'file') return t.archivo
    return t.obligatorio
  }
  if (v.typeMismatch) return campo.type === 'email' ? t.correo : campo.type === 'url' ? t.enlace : t.formato
  if (v.badInput) return t.numero
  if (v.tooShort) return t.corto(campo.minLength, campo.value.length)
  if (v.tooLong) return t.largo(campo.maxLength)
  if (v.rangeUnderflow) return t.minimo(campo.min)
  if (v.rangeOverflow) return t.maximo(campo.max)
  if (v.patternMismatch) return campo.title.trim() !== '' ? campo.title : t.formato
  if (v.stepMismatch) return t.paso
  // `setCustomValidity`: el texto lo escribió quien la puso.
  return campo.validationMessage || t.formato
}
