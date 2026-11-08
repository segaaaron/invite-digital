import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'

const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()

// El panel es del atelier: entra con su sesión guardada. El invitado sube con su propio contexto, sin ella.
test.use({ storageState: AUTH_STATE })

test.afterAll(async () => {
  await closeInvitationDb()
})

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/** El invitado sube con su propio contexto, sin la sesión del atelier. */
async function subirComoInvitado(browser: import('@playwright/test').Browser, token: string): Promise<void> {
  const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const pagina = await contexto.newPage()
  await pagina.goto(`/i/${token}/fotos`)
  await pagina.setInputFiles('input[type=file]', { name: 'boda.png', mimeType: 'image/png', buffer: PNG })
  await expect(pagina.locator('main ul li')).toHaveCount(1)
  await contexto.close()
}

test('el atelier ve el álbum con su tope y descarga todas las fotos en un ZIP', async ({ page, browser }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-album-e2e', plan: 'imperial' })
  await subirComoInvitado(browser, token)

  await page.goto(`/dashboard/events/${eventSlug}/album`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Álbum compartido')
  // Imperial incluye el álbum: mil fotos para todo el evento.
  await expect(page.getByText('1 de 1000 fotos')).toBeVisible()

  const respuesta = await page.request.get(`/dashboard/events/${eventSlug}/album/download`)
  expect(respuesta.status()).toBe(200)
  expect(respuesta.headers()['content-type']).toBe('application/zip')
  const cuerpo = await respuesta.body()
  // «PK»: la firma de un ZIP. Y es la foto subida, no un ZIP vacío.
  expect(cuerpo.subarray(0, 2).toString('latin1')).toBe('PK')
  expect(cuerpo.includes(Buffer.from('foto-0001.webp'))).toBe(true)

  await deleteEvent(eventSlug)
})

test('sin álbum en el plan, la pantalla lo explica y lleva a Extras; la descarga no existe', async ({ page }) => {
  const { eventSlug } = await seedInvitation({ slug: 'boda-sin-album-e2e', plan: 'atelier' })

  await page.goto(`/dashboard/events/${eventSlug}/album`)
  await expect(page.getByText('El álbum no está en tu plan')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver Extras' })).toHaveAttribute('href', `/dashboard/events/${eventSlug}/extras`)
  expect((await page.request.get(`/dashboard/events/${eventSlug}/album/download`)).status()).toBe(404)

  await deleteEvent(eventSlug)
})

test('un invitado ve el álbum lleno cuando se agotó el tope del evento', async ({ browser }) => {
  // Atelier con álbum comprado = 500; se llena con el tope real rebajado a mano: se siembra un evento con plan
  // Imperial y se comprueba en la pantalla del invitado que, con fotos de otros invitados ya en el tope, no ofrece subir.
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-album-lleno-e2e', plan: 'imperial' })
  const sql = (await import('postgres')).default(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
  try {
    const [evento] = await sql<{ id: string }[]>`select id from events where slug = ${eventSlug}`
    const [grupo] = await sql<{ id: string }[]>`select id from guest_groups where event_id = ${evento!.id} limit 1`
    // 1.000 filas de foto de otros grupos: es el tope de Imperial.
    await sql`
      insert into guest_groups (event_id, label, seats, token_hash)
      select ${evento!.id}, 'Otra familia', 2, decode(md5(random()::text || n::text), 'hex')
      from generate_series(1, 50) n
    `
    const otros = await sql<{ id: string }[]>`select id from guest_groups where event_id = ${evento!.id} and id <> ${grupo!.id}`
    for (let i = 0; i < 1000; i += 1) {
      await sql`
        insert into event_media (event_id, content_type, original_name, byte_size, uploaded_by_group_id)
        values (${evento!.id}, 'image/webp', 'x.webp', 10, ${otros[i % otros.length]!.id})
      `
    }

    const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const pagina = await contexto.newPage()
    await pagina.goto(`/i/${token}/fotos`)
    await expect(pagina.getByText('El álbum ya está lleno')).toBeVisible()
    await expect(pagina.locator('input[type=file]')).toHaveCount(0)
    await contexto.close()
  } finally {
    await sql.end()
    await deleteEvent(eventSlug)
  }
})
