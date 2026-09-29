/**
 * Una Server Action que **no puede tumbar la pantalla**: si el servidor no responde o responde un error (500,
 * red cortada), en vez de lanzar —y que React cambie la página por la pantalla de error— devuelve `alFallar`,
 * que el formulario pinta como un aviso más, en su sitio. El fallo ya lo anotó el servidor
 * (`registrarFallo`/`onRequestError`). Para `useActionState(sinCaerse(accion, fallo), inicial)`.
 */
export function sinCaerse<Estado, Datos>(accion: (previo: Estado, datos: Datos) => Promise<Estado>, alFallar: Estado): (previo: Estado, datos: Datos) => Promise<Estado> {
  return async (previo, datos) => {
    try {
      return await accion(previo, datos)
    } catch (error) {
      // Las redirecciones y el 404 de Next viajan como excepciones con `digest`: esas no son fallos, se dejan pasar.
      if (error instanceof Error && 'digest' in error && typeof error.digest === 'string' && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR)/.test(error.digest)) throw error
      return alFallar
    }
  }
}
