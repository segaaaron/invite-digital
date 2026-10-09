import { expect, test } from '@playwright/test'

/**
 * Las rutas públicas con un identificador inventado responden **404, nunca 500** (9 de octubre: `/r/no-existe` y
 * `/media/no-existe` daban 500 porque el id llegaba a Postgres sin forma de UUID).
 */
test('un identificador inventado en una ruta pública es «no existe», no un fallo del servidor', async ({ request }) => {
  for (const ruta of ['/r/no-existe', '/media/no-existe', '/r/00000000-0000-0000-0000-000000000000', '/media/00000000-0000-0000-0000-000000000000', '/i/no-existe', '/v/no-existe', '/calendario/no-existe', '/modelos/musica/no-existe']) {
    const r = await request.get(ruta, { maxRedirects: 0 })
    expect(r.status(), ruta).toBe(404)
  }
})
