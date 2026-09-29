/** El aviso por defecto cuando el servidor no respondió: se pinta donde el formulario pinta sus errores. */
export const MENSAJE_SIN_SERVIDOR = 'No se pudo completar: se cortó la conexión o el servidor no respondió. Vuelve a intentarlo; ya quedó anotado.'

const envueltas = new WeakMap<object, unknown>()

/**
 * Una Server Action que **no puede tumbar la pantalla**: si el servidor no responde o responde un error (500,
 * red cortada), en vez de lanzar —y que React cambie la página por la pantalla de error— devuelve `alFallar`,
 * que el formulario pinta como un aviso más, en su sitio. El fallo ya lo anotó el servidor
 * (`registrarFallo`/`onRequestError`). Para `useActionState(sinCaerse(accion), inicial)`.
 *
 * Sin `alFallar`, devuelve `{ status: 'error', message: MENSAJE_SIN_SERVIDOR }`, la forma de casi todos los estados
 * del proyecto; la misma función envuelta se reutiliza (referencia estable entre pintados).
 */
export function sinCaerse<Estado, Datos>(accion: (previo: Estado, datos: Datos) => Promise<Estado>, alFallar?: Estado): (previo: Estado, datos: Datos) => Promise<Estado> {
  if (alFallar === undefined) {
    const ya = envueltas.get(accion)
    if (ya !== undefined) return ya as (previo: Estado, datos: Datos) => Promise<Estado>
  }
  const fallo = (alFallar ?? { status: 'error', message: MENSAJE_SIN_SERVIDOR }) as Estado
  const envuelta = async (previo: Estado, datos: Datos): Promise<Estado> => {
    try {
      return await accion(previo, datos)
    } catch (error) {
      // Las redirecciones y el 404 de Next viajan como excepciones con `digest`: esas no son fallos, se dejan pasar.
      if (error instanceof Error && 'digest' in error && typeof error.digest === 'string' && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR)/.test(error.digest)) throw error
      return fallo
    }
  }
  if (alFallar === undefined) envueltas.set(accion, envuelta)
  return envuelta
}
