'use server'

import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import type { ResultadosDeBusqueda } from '@/modules/admin/domain/busqueda'

/**
 * La búsqueda de ⌘K. Solo al pulsar Enter, nunca mientras se escribe: buscar al teclear exige
 * un temporizador que llama al servidor, y en este proyecto no los hay (dicho por el usuario).
 */
export async function buscarAction(texto: string): Promise<ResultadosDeBusqueda> {
  await requireAdmin()
  return admin.buscar(texto.slice(0, 80))
}
