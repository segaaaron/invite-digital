import { expect, test } from '@playwright/test'
import {
  borrar,
  cerrarDb,
  debeCambiarla,
  hashActualDe,
  NUEVA_PASSWORD,
  PROVISIONAL,
  RECUPERA,
  seedCodigo,
  seedProvisional,
} from './fixtures/identidad'

/**
 * La contraseña provisional y la recuperación con código.
 *
 * Lo que esta suite vigila es que el panel **no se abra** mientras la contraseña la haya
 * escrito otro: la que el admin teclea al dar de alta viaja por correo, y quien la
 * escribió podría entrar como el cliente.
 *
 * Va en serie y con pocos inicios de sesión a propósito: son tres por cuenta y minuto, y
 * cinco por IP. Repartirlos sin contarlos tumba esta suite y las vecinas.
 */
test.describe.configure({ mode: 'serial' })

test.describe('la contraseña provisional', () => {
  // IP propia: el limitador cuenta cinco inicios por IP, y en el CI todas las suites salen de
  // 127.0.0.1. Sin proxy delante, la app lee `x-real-ip` tal cual; la cuenta sigue limitada.
  test.use({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.3' } })

  test.beforeAll(async () => {
    await seedProvisional()
  })

  // Sin `cerrarDb()` aquí: los dos `describe` de este fichero comparten el pool del
  // fixture, y el primero que lo cerrara dejaría al otro escribiendo contra una conexión
  // muerta —«write CONNECTION_ENDED»—. Se cierra una sola vez, al final del fichero.
  test.afterAll(async () => {
    await borrar()
  })

  /**
   * Un solo test para todo el flujo, y no dos, por dos motivos.
   *
   * El primero es que **`mode: 'serial'` no comparte la sesión**: garantiza el orden y que
   * los siguientes se salten si uno falla, pero cada test recibe su propio contexto. Un
   * segundo test que diera por hecha la sesión del primero arrancaba sin cookie, acababa
   * en la puerta y esperaba treinta segundos un campo que allí no existe. Pasó.
   *
   * El segundo es el limitador: son tres inicios de sesión por cuenta y minuto, y este
   * flujo ya gasta dos.
   */
  test('el panel no se abre hasta que elige su contraseña', async ({ page }) => {
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(PROVISIONAL.email)
    await page.getByLabel('Contraseña').fill(PROVISIONAL.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Directo a cambiarla, sin pasar por el resumen.
    await expect(page).toHaveURL(/\/panel\/cuenta$/)
    await expect(page.getByText(/Elige tu contraseña antes de seguir/)).toBeVisible()

    // Y el resto del panel devuelve aquí mismo mientras siga provisional: esto es el
    // corte de verdad, no el aviso de la pantalla. Es justo lo que estuvo roto — la
    // página se redirigía a sí misma en bucle y dejaba fuera a todo el mundo.
    await page.goto('/panel')
    await expect(page).toHaveURL(/\/panel\/cuenta$/)

    // La cambia.
    await page.getByLabel('Contraseña actual').fill(PROVISIONAL.password)
    await page.getByLabel('Contraseña nueva').fill(NUEVA_PASSWORD)
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()

    // Cambiarla cierra todas las sesiones —incluida esta—, así que devuelve a la puerta.
    await expect(page).toHaveURL(/\/panel\/entrar/)
    expect(await debeCambiarla()).toBe(false)

    // Y ahora sí entra al panel con la suya.
    await page.getByLabel('Correo').fill(PROVISIONAL.email)
    await page.getByLabel('Contraseña').fill(NUEVA_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    // Margen largo: entrar son dos argon2 (comprobar y, antes, el cambio) y en el runner del
    // CI tardan más que los cinco segundos por defecto. En local pasaba; allí no.
    await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+|\/admin)?$/, { timeout: 20_000 })
  })
})

test.describe('recuperar la contraseña con código', () => {
  // IP propia: el limitador cuenta cinco inicios por IP, y en el CI todas las suites salen de
  // 127.0.0.1. Sin proxy delante, la app lee `x-real-ip` tal cual; la cuenta sigue limitada.
  test.use({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.3' } })

  test.afterAll(async () => {
    await borrar()
    await cerrarDb()
  })

  test('la pantalla existe y no dice si el correo tiene cuenta', async ({ page }) => {
    await seedProvisional(RECUPERA)
    await page.goto('/panel/recuperar')

    await page.getByLabel('Tu correo').fill('no-existe-nadie-asi@invitepremium.bo')
    await page.getByRole('button', { name: /Enviarme un código/ }).click()

    // La misma respuesta exista o no: lo contrario convertiría esto en una forma de
    // averiguar quién es cliente del atelier.
    await expect(page.getByText(/Si ese correo tiene cuenta/)).toBeVisible()
  })

  test('con el código correcto se cambia la contraseña', async ({ page }) => {
    // El código lo elige la prueba y siembra su hash: en la base solo vive el SHA-256, así
    // que no hay forma de «leerlo» ni abriendo la tabla.
    await seedCodigo('424242', RECUPERA.email)
    const antes = await hashActualDe(RECUPERA.email)

    await page.goto('/panel/recuperar')
    await page.getByLabel('Tu correo').fill(RECUPERA.email)
    await page.getByRole('button', { name: /Enviarme un código/ }).click()
    await expect(page.getByText(/Si ese correo tiene cuenta/)).toBeVisible()

    // Pedirlo invalida el anterior, así que se vuelve a sembrar el que conocemos.
    await seedCodigo('424242', RECUPERA.email)
    await page.getByLabel('Código del correo').fill('424242')
    await page.getByLabel('Contraseña nueva').fill('recuperada-por-codigo-1')
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()

    await expect(page.getByText(/Contraseña cambiada/)).toBeVisible()

    // Y la contraseña **cambió de verdad**, comprobado contra la base y no intentando
    // entrar. Aquí había un inicio de sesión y fallaba en la pasada completa con
    // «Demasiados intentos»: el limitador son cinco **por IP** y minuto, y las suites
    // vecinas ya los han gastado cuando le toca a esta. Aislada pasaba, que es lo que
    // hacía parecer un fallo de producto lo que era la prueba compitiendo por cupo.
    expect(await hashActualDe(RECUPERA.email)).not.toBe(antes)
  })

  test('un código equivocado no cambia nada', async ({ page }) => {
    await seedProvisional(RECUPERA)
    await seedCodigo('111111', RECUPERA.email)
    const antes = await hashActualDe(RECUPERA.email)

    await page.goto('/panel/recuperar')
    await page.getByLabel('Tu correo').fill(RECUPERA.email)
    await page.getByRole('button', { name: /Enviarme un código/ }).click()
    await seedCodigo('111111', RECUPERA.email)

    await page.getByLabel('Código del correo').fill('999999')
    await page.getByLabel('Contraseña nueva').fill('no-deberia-aplicarse-1')
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()

    // Por el texto y no por `getByRole('alert')` a secas: Next inyecta en cada página su
    // propio anunciador de rutas, que **también** es `role="alert"` y está vacío, así que
    // el localizador casaba con dos elementos y el modo estricto lo rechazaba.
    await expect(page.getByText(/El código no es válido/)).toBeVisible()

    // Y lo que de verdad importa: **no cambió nada**. Se comprueba contra la base y no
    // intentando entrar, por dos motivos: es directo —el hash guardado es el mismo— y no
    // gasta uno de los tres intentos por minuto que admite el limitador.
    expect(await hashActualDe(RECUPERA.email)).toBe(antes)
  })
})
