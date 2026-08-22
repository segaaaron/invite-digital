import { chromium } from '@playwright/test'
const dir = process.argv[2]
const secciones = process.argv.slice(3)
const b = await chromium.launch()
const p = await b.newContext({ viewport: { width: 1440, height: 1000 } }).then(c => c.newPage())
await p.goto('http://localhost:3000/es', { waitUntil: 'networkidle' })
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await p.waitForTimeout(2500)
await p.evaluate(() => window.scrollTo(0, 0))
await p.waitForTimeout(1200)
for (const id of secciones) {
  const el = await p.$(`section#${id}`)
  if (el) await el.screenshot({ path: `${dir}/now-${id}.png` })
}
await b.close()
