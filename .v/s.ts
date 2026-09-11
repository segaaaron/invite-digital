import { chromium } from '@playwright/test'
async function main() {
  const nav = await chromium.launch()
  const pg = await (await nav.newContext({ viewport: { width: 700, height: 880 }, reducedMotion: 'reduce' })).newPage()
  await pg.goto('http://localhost:3000/modelos/es/xv-natalia', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await pg.evaluate(async () => { for (const i of document.images) i.loading = 'eager' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForTimeout(2000)
  const portada = pg.getByRole('button', { name: /abrir la invitaci/i })
  if (await portada.count()) { await portada.first().click(); await pg.waitForTimeout(600) }
  const marco = pg.locator('.theme-phone-frame')
  for (const n of [3, 6]) {
    await marco.evaluate((e, y) => { (e as HTMLElement).scrollTop = y }, n * 820)
    await pg.waitForTimeout(700)
    await marco.screenshot({ path: `.v/s${n}.png` })
  }
  await nav.close()
}
main()
