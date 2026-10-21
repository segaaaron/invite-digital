import { devices, expect, test } from '@playwright/test'

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

/**
 * **La cabecera se decide por aparato, no por ancho** (20 oct, pedido del usuario).
 *
 * Un corte en píxeles siempre deja a alguien del lado equivocado: un iPhone 17 Pro Max mide 440 justos y
 * el mismo teléfono en horizontal mide 814, donde la fila entera no cabe y el logotipo se partía. Lo que
 * de verdad distingue un celular es que se toca (`hover: none` y `pointer: coarse`), y eso lo dice el
 * navegador en cualquier aparato y orientación.
 */
test('un celular en horizontal lleva menú aunque sea ancho, y una computadora del mismo ancho no', async ({ browser }) => {
  const celular = await browser.newContext({ ...devices['iPhone 15 Pro Max landscape'] })
  const enCelular = await celular.newPage()
  await enCelular.goto('/es')
  await expect(enCelular.getByRole('button', { name: 'Menú' })).toBeVisible()
  await expect(enCelular.locator('header').getByRole('link', { name: 'Bodas', exact: true })).toBeHidden()
  await celular.close()

  const computadora = await browser.newContext({ viewport: { width: 932, height: 430 }, hasTouch: false, isMobile: false })
  const enComputadora = await computadora.newPage()
  await enComputadora.goto('/es')
  await expect(enComputadora.locator('header').getByRole('link', { name: 'Bodas', exact: true })).toBeVisible()
  await expect(enComputadora.getByRole('button', { name: 'Menú' })).toBeHidden()
  await computadora.close()
})
