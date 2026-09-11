import { chromium } from '@playwright/test'
async function main() {
  const nav = await chromium.launch()
  const pg = await (await nav.newContext({ viewport: { width: 390, height: 900 } })).newPage()
  await pg.goto('http://localhost:3000/modelos/es/xv', { waitUntil: 'load' })
  await pg.waitForTimeout(2500)
  const b = pg.locator('button[type=submit]').first()
  console.log(await b.evaluate((e) => getComputedStyle(e).fontFamily))
  await nav.close()
}
main()
