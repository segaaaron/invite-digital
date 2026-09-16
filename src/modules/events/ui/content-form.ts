/**
 * El puente entre lo que el formulario tiene en pantalla y lo que se guarda.
 *
 * Está aparte del componente y sin React a propósito: es la parte que puede perder una
 * fila o inventar una clave, y es la que conviene probar sin montar nada.
 *
 * El valor sigue viajando a la acción como JSON en un campo oculto, y quien decide qué es
 * válido sigue siendo el dominio, en el servidor. Esto solo deja de pedirle al atelier que
 * escriba las llaves y las comas a mano.
 */

import type { FormaBloque } from './content-shapes'

/**
 * Lo que el formulario tiene escrito, todo como texto.
 *
 * Un solo tipo para las tres formas —campos, campos con lista, filas— porque el
 * componente es uno y guarda un solo estado; el bloque que no usa `filas` la deja vacía.
 */
export type EstadoBloque = {
  readonly campos: Readonly<Record<string, string>>
  readonly lista: readonly string[]
  readonly filas: readonly Readonly<Record<string, string>>[]
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/**
 * Un valor guardado, como texto de formulario.
 *
 * Solo se leen cadenas: lo que hubiera de otro tipo en el `jsonb` no lo pinta ningún
 * diseño, y pasarlo por `String()` metería un «[object Object]» en un campo.
 */
const comoTexto = (valor: unknown): string => (typeof valor === 'string' ? valor : '')

/**
 * La marca de tiempo, recortada a lo que admite `datetime-local`.
 *
 * El navegador ignora el valor que no case con `YYYY-MM-DDTHH:mm` y pinta el campo
 * **vacío**: el atelier vería una cuenta atrás sin fecha justo cuando sí la tiene.
 */
const comoFechaLocal = (valor: unknown): string => comoTexto(valor).slice(0, 16)

/** Lo que hay que pintar al abrir el bloque. */
export function estadoInicial(forma: FormaBloque, guardado: unknown): EstadoBloque {
  if (forma.form === 'filas') {
    const filas = Array.isArray(guardado) ? guardado : []
    return {
      campos: {},
      lista: [],
      filas: filas.map((fila) => filaDesde(forma.fields, fila)),
    }
  }

  const bloque = esObjeto(guardado) ? guardado : {}
  if (forma.anfitriones !== undefined) return anfitrionesIniciales(forma, bloque)

  const campos: Record<string, string> = {}
  for (const campo of forma.fields) {
    campos[campo.key] = campo.kind === 'fecha' ? comoFechaLocal(bloque[campo.key]) : comoTexto(bloque[campo.key])
  }

  const crudaLista = forma.list === undefined ? [] : bloque[forma.list.key]
  return {
    campos,
    lista: Array.isArray(crudaLista) ? crudaLista.map(comoTexto) : [],
    filas: [],
  }
}

/**
 * Los anfitriones: el título en su campo, cada papel en el suyo y los padrinos en la lista.
 *
 * Lo guardado antes de que hubiera papeles era una lista de nombres, y los diseños la leían
 * por posición: se reparte igual, para que abrir el formulario no cambie a nadie de sitio.
 */
function anfitrionesIniciales(forma: Extract<FormaBloque, { form: 'campos' }>, bloque: Record<string, unknown>): EstadoBloque {
  const campos: Record<string, string> = { label: comoTexto(bloque.label) }
  const papeles = forma.fields.filter((campo) => campo.key !== 'label').map((campo) => campo.key)

  if (esObjeto(bloque.roles)) {
    const roles = bloque.roles
    for (const clave of papeles) campos[clave] = comoTexto(roles[clave])
    return { campos, lista: Array.isArray(roles.godparents) ? roles.godparents.map(comoTexto) : [], filas: [] }
  }

  const nombres = Array.isArray(bloque.names) ? bloque.names.map(comoTexto) : []
  papeles.forEach((clave, indice) => {
    campos[clave] = nombres[indice] ?? ''
  })
  return { campos, lista: nombres.slice(papeles.length), filas: [] }
}

function filaDesde(campos: FormaBloque['fields'], cruda: unknown): Record<string, string> {
  const fila = esObjeto(cruda) ? cruda : {}
  const salida: Record<string, string> = {}
  for (const campo of campos) salida[campo.key] = comoTexto(fila[campo.key])
  return salida
}

/** Una fila vacía, para el botón de añadir. */
export function filaVacia(campos: FormaBloque['fields']): Record<string, string> {
  return filaDesde(campos, {})
}

const recortado = (valor: string | undefined): string => (valor ?? '').trim()

/** Un objeto con solo los campos escritos. Sin ninguno queda `{}`, que es como se quita el bloque. */
function objetoDesde(campos: FormaBloque['fields'], valores: Readonly<Record<string, string>>): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const campo of campos) {
    const valor = recortado(valores[campo.key])
    if (valor !== '') salida[campo.key] = valor
  }
  return salida
}

/**
 * Lo que se envía a la acción.
 *
 * Un bloque de campos sale como objeto y uno de filas como lista, porque es lo que el
 * dominio espera de cada sección. Vacío no es `null`: `{}` y `[]` son lo que el dominio
 * lee como «esta sección ya no está», que es la única forma que tiene el atelier de
 * quitarla.
 */
export function aValor(forma: FormaBloque, estado: EstadoBloque): unknown {
  if (forma.form === 'filas') {
    return estado.filas
      .map((fila) => objetoDesde(forma.fields, fila))
      .filter((fila) => Object.keys(fila).length > 0)
  }

  if (forma.anfitriones !== undefined) {
    const escrito = objetoDesde(forma.fields, estado.campos)
    const { label, ...roles } = escrito
    const padrinos = estado.lista.map(recortado).filter((valor) => valor !== '')
    const conPadrinos: Record<string, unknown> = padrinos.length > 0 ? { ...roles, godparents: padrinos } : roles
    return {
      ...(label === undefined ? {} : { label }),
      ...(Object.keys(conPadrinos).length > 0 ? { roles: conPadrinos } : {}),
    }
  }

  const salida: Record<string, unknown> = objetoDesde(forma.fields, estado.campos)

  if (forma.list !== undefined) {
    const valores = estado.lista.map(recortado).filter((valor) => valor !== '')
    if (valores.length > 0) salida[forma.list.key] = valores
  }

  return salida
}
