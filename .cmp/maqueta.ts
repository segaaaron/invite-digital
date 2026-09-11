import { chromium } from '@playwright/test'
async function main() {
  const comp = process.argv[2] ?? 'QuinceInvite'
  const clave = process.argv[3] ?? 'xv'
  const nav = await chromium.launch()
  const pg = await (await nav.newContext({ viewport: { width: 420, height: 900 }, reducedMotion: 'reduce' })).newPage()
  pg.on('pageerror', (e) => console.log('ERROR', String(e).slice(0, 160)))
  await pg.goto(`http://localhost:8899/__cmp.html?c=${comp}`, { waitUntil: 'load', timeout: 90000 })
  await pg.waitForTimeout(7000)
  await pg.evaluate(() => document.fonts.ready)
  // La portada de apertura tapa la invitación: se abre con un clic sobre el div fijo.
  await pg.evaluate(() => {
    const tapa = [...document.querySelectorAll('div')].find(
      (d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '50',
    )
    ;(tapa as HTMLElement | undefined)?.click()
  })
  await pg.waitForTimeout(2500)
  const alto = await pg.locator('#marco').evaluate((e) => (e as HTMLElement).offsetHeight)
  console.log('alto', alto)
  await pg.locator('#marco').screenshot({ path: `.cmp/${clave}-maqueta.png` })
  await nav.close()
}
main()
