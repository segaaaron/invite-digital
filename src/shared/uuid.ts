const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Si un identificador **tiene forma** de UUID. Las rutas públicas lo miran antes de ir a la base: Postgres rechaza
 * un `uuid` mal formado con un error, y eso salía como **500** («la base falló») en vez de **404** («no existe»):
 * `/r/no-existe` y `/media/no-existe` (9 de octubre).
 */
export const esUuid = (id: string): boolean => UUID.test(id)
