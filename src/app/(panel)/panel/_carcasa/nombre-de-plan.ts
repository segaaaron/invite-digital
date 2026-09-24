import { webPublica } from '@/app/composition/web-publica'
import { isErr } from '@/shared/result'

/**
 * El plan por su nombre («Alta Costura»), no por su clave, para la barra. Lectura cacheada de
 * la web; un plan retirado ya no sale en ella y cae a la clave.
 */
export async function nombreDePlan(slug: string): Promise<string> {
  const planes = await webPublica.planes('es')
  return (isErr(planes) ? undefined : planes.value.find((p) => p.slug === slug)?.name) ?? slug
}
