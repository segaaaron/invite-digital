/**
 * Lo que se escapa sin que nadie lo capture —una página que revienta, una Server Action que lanza, un
 * route handler que falla— lo recoge Next aquí (`onRequestError`) y va al registro de fallos con su
 * ruta y su pila. Es la red de debajo de `registrarFallo`: lo que nadie previó también queda escrito.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routePath: string; routeType: string },
): Promise<void> {
  // El `import` dentro del `if`, como pide Next: webpack compila este fichero también para el borde y solo
  // quita la rama muerta así. Con un `return` antes, el borde intentaba empaquetar `node:crypto` y
  // `next dev` servía 500 en todas las páginas.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { esCorteDelCliente, guardarFallo } = await import('@/shared/observability/fallos')
    if (esCorteDelCliente(error)) return
    const accion = request.headers['next-action']
    await guardarFallo({
      servicio: `${context.routeType}:${context.routePath}`,
      partes: [error instanceof Error ? error : new Error(String(error))],
      ruta: request.path,
      accion: typeof accion === 'string' ? accion : null,
    }).catch((causa: unknown) => console.error('[fallos] no se pudo guardar el fallo de la petición:', causa))
  }
}
