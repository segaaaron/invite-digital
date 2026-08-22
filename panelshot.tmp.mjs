import { chromium } from '@playwright/test'
const dir = process.argv[2]
const rutas = process.argv.slice(3)
const b = await chromium.launch()
const p = await b.newContext({ viewport: { width: 1440, height: 1000 } }).then(c => c.newPage())
await p.goto('http://localhost:3000/panel/entrar')
await p.getByLabel('Correo').fill('atelier@invitepremium.bo')
await p.getByLabel('Contraseña').fill('contrasena-de-prueba-1')
await p.getByRole('button', { name: 'Entrar' }).click()
await p.waitForURL('**/panel')
for (const ruta of rutas) {
  const nombre = ruta.split('/').filter(Boolean).pop() || 'panel'
  await p.goto(`http://localhost:3000${ruta}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${dir}/p-${nombre}.png`, fullPage: true })
}
await b.close()
