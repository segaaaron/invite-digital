/**
 * Las columnas de la tabla de la cartera (maqueta E03): Fecha · Evento · Cliente · Etapa · Avance · acciones. Viven
 * fuera de `EventAdminRow` (que es `'use client'`): una constante exportada de un módulo de cliente llega al servidor
 * como referencia, no como texto, y la cabecera salía sin columnas.
 */
export const COLUMNAS_DE_CARTERA = 'min-[860px]:grid-cols-[64px_minmax(0,1.7fr)_minmax(0,1fr)_120px_minmax(0,1.1fr)_auto]'
