import { isErr, type Result } from '@/shared/result'
import { db, type DbExecutor } from './client'

/** Lo que se lanza para que Drizzle deshaga; nunca sale de aquí. */
class Deshacer extends Error {}

/**
 * Corre `fn` en una transacción y la **deshace también cuando devuelve un error**, no solo
 * cuando lanza. Los casos de uso devuelven el fallo como valor, y Drizzle solo deshace si
 * algo lanza: sin esto, lo escrito antes del error se quedaba guardado a medias.
 */
export const enTransaccion = async <T, E>(fn: (tx: DbExecutor) => Promise<Result<T, E>>): Promise<Result<T, E>> => {
  let fallo: Result<T, E> | null = null
  try {
    return await db.transaction(async (tx) => {
      const resultado = await fn(tx)
      if (isErr(resultado)) {
        fallo = resultado
        throw new Deshacer()
      }
      return resultado
    })
  } catch (causa) {
    if (causa instanceof Deshacer && fallo !== null) return fallo
    throw causa
  }
}
