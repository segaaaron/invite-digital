import { chromium } from '@playwright/test'
async function main() {
  const nav = await chromium.launch()
  const pg = await (await nav.newContext({ viewport: { width: 700, height: 880 }, reducedMotion: 'reduce' })).newPage()
  await pg.goto(`http://localhost:3000/modelos/es/${process.argv[3] ?? 'xv'}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await pg.evaluate(async () => { for (const i of document.images) i.loading = 'eager' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForTimeout(2000)
  const portada = pg.getByRole('button', { name: /abrir la invitaci/i })
  if (await portada.count()) { await portada.first().click(); await pg.waitForTimeout(600) }
  const marco = pg.locator('.theme-phone-frame')
  const objetivo = pg.getByText(process.argv[4] ?? 'Cronograma').first()
  await objetivo.scrollIntoViewIfNeeded()
  await pg.waitForTimeout(700)
  await marco.screenshot({ path: `.v/${process.argv[3] ?? 'x'}.png` })
  await nav.close()
}
main()
