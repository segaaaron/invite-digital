import { unstable_cache } from 'next/cache'
import { err, ok, type Result } from '@/shared/result'

/**
 * Las etiquetas de la caché de la web pública. Una acción del admin que cambie algo visible en
 * la web llama a `updateTag` con la suya; la siguiente visita lee de la base.
 */
export const ETIQUETAS_WEB = {
  /** «La web»: WhatsApp, textos legales, testimonios, SEO. */
  ajustes: 'web:ajustes',
  /** Planes con precio y límites, modelos publicados y categorías. */
  catalogo: 'web:catalogo',
  extras: 'web:extras',
  /** La música de escaparate de cada modelo. */
  modelos: 'web:modelos',
} as const

/** Una hora como máximo aunque nadie invalide: la red de seguridad si algo escribe por fuera del admin. */
export const REVALIDAR_WEB_SEGUNDOS = 3600

type Lectura<A extends unknown[], T, E> = (...args: A) => Promise<Result<T, E>>

type Funcion = (...args: unknown[]) => Promise<unknown>

/** La forma de `unstable_cache` que se usa aquí; se inyecta para probar sin el runtime de Next. */
export type Cachear = (fn: Funcion, keyParts: string[], opciones: { tags: string[]; revalidate: number }) => Funcion

/** El resultado con error viaja dentro de una excepción para que `unstable_cache` no lo guarde. */
class NoSeGuarda<E> extends Error {
  constructor(readonly error: E) {
    super('lectura con error: no se cachea')
  }
}

/**
 * Cachea **entre visitas** una lectura de la web pública, en la caché de datos de Next —memoria y
 * disco del propio contenedor, sin infraestructura aparte—.
 *
 * **Solo se guarda lo que salió bien.** Un `err` —la base no respondió— se devuelve igual que
 * antes pero no se guarda: si se guardara, la web se quedaría una hora sin planes. Una
 * excepción se propaga tal cual, también sin guardarse.
 *
 * **Solo datos públicos y planos.** `unstable_cache` serializa a JSON: un `Date` volvería como
 * texto. Nada con sesión, invitados, pedidos ni medios con contraseña pasa por aquí.
 */
export function lecturaCacheada<A extends unknown[], T, E>(
  leer: Lectura<A, T, E>,
  { clave, etiquetas }: { clave: string; etiquetas: string[] },
  cachear: Cachear = unstable_cache as unknown as Cachear,
): Lectura<A, T, E> {
  const soloLoBueno = async (...args: A): Promise<T> => {
    const resultado = await leer(...args)
    if (!resultado.ok) throw new NoSeGuarda(resultado.error)
    return resultado.value
  }
  const guardada = cachear(soloLoBueno as Funcion, ['web-publica', clave], { tags: etiquetas, revalidate: REVALIDAR_WEB_SEGUNDOS })
  return async (...args: A) => {
    try {
      return ok((await guardada(...args)) as T)
    } catch (causa) {
      if (causa instanceof NoSeGuarda) return err(causa.error as E)
      throw causa
    }
  }
}
