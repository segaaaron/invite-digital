import { chromium } from '@playwright/test'
async function main() {
  const clave = process.argv[2] ?? 'xv'
  const nav = await chromium.launch()
  const pg = await (await nav.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' })).newPage()
  await pg.goto(`http://localhost:3000/i/jU6VM6W_pZf_IFWJGhtAvn`, { waitUntil: 'load', timeout: 60000 })
  await pg.waitForTimeout(3000)
  const portada = pg.getByRole('button', { name: /abrir la invitaci/i })
  if (await portada.count()) { await portada.first().click(); await pg.waitForTimeout(600) }
  await pg.evaluate(async () => { for (const i of document.images) i.loading = 'eager' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForTimeout(1500)
  console.log('alto', await pg.evaluate(() => document.documentElement.scrollHeight))
  await pg.screenshot({ path: `.cmp/${clave}-nuestro.png`, fullPage: true })
  await nav.close()
}
main()
