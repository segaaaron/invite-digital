import { revalidatePath, updateTag } from 'next/cache'
import { ETIQUETAS_WEB } from '@/shared/cache/lectura-cacheada'

// Lo que comparten las acciones del admin, partidas por pantalla (`usuarios-actions.ts`,
// `bodas-actions.ts`, `cobro-actions.ts`, `modelos-actions.ts`, `planes-actions.ts`,
// `web-actions.ts`). Sin `'use server'`: aquí no hay acciones, y un fichero de servidor solo
// puede exportar funciones asíncronas.
// ============================================================================
// TODAS las acciones de este fichero empiezan por `await requireAdmin()`, que redirige a
// la puerta sin sesión y devuelve **404** a quien tiene sesión y no es admin. 404 y no
// 403: un 403 confirmaría que la administración existe, y para quien no es admin no
// existe.
//
// Ninguna lleva `requireEventAccess`, y es a propósito: el admin opera **por definición**
// sobre eventos que no son suyos. Están apuntadas como exentas en `verify-tenancy.ts`.
// ============================================================================

export type AdminActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  /**
   * `valores` es lo que se envió. React 19 **vacía el formulario** al terminar la acción, y
   * sin esto un error de validación devolvía cada campo a lo guardado: el admin perdía
   * los textos que acababa de escribir por un tope mal puesto.
   */
  | { status: 'error'; message: string; valores?: Record<string, string> }

export const refrescar = () => {
  revalidatePath('/panel/admin')
  revalidatePath('/panel/admin/usuarios')
  revalidatePath('/panel/admin/eventos')
  revalidatePath('/panel/admin/auditoria')
}

export const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

export const QR_MIMES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Invalida la caché de la web pública: la siguiente visita lee de la base. `updateTag` y no
 * `revalidateTag`, porque se llama desde una Server Action y así quien guarda ve su cambio en la
 * siguiente carga, no la versión anterior mientras se regenera.
 */
export const invalidarLaWeb = (...cuales: (keyof typeof ETIQUETAS_WEB)[]): void => {
  for (const cual of cuales) updateTag(ETIQUETAS_WEB[cual])
}
