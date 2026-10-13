/**
 * Las columnas del equipo, las mismas en su encabezado y en cada fila. En su propio módulo y no en `UserAdmin`
 * (cliente): exportada desde un fichero `'use client'`, la página del servidor recibía una referencia de cliente en
 * vez de la cadena y el encabezado salía en una sola columna.
 */
export const COLUMNAS_DE_EQUIPO = 'min-[860px]:grid-cols-[minmax(0,1.6fr)_150px_110px_130px_40px]'
