import { chromium } from '@playwright/test'
const REF = 'file:///Users/miguelangelsaraviabelmonte/Documents/vallhalla%20web%20images/Sitio%20Web%20Invitaciones%20Digitales/InvitePremium%20Ivory.dc.html'
const PARES = [['top','hero'],['experiencia','experiencia'],['movil','movil'],['colecciones','colecciones'],['diferencia','diferencia'],['precios','precios'],['modelos','modelos'],['contacto','contacto']]
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } })
const medir = async (page, id) => page.$eval(`section#${id}`, (el) => el.querySelectorAll('img, video, canvas, svg').length).catch(() => null)
const ref = await ctx.newPage(); await ref.goto(REF, { waitUntil: 'networkidle' }); await ref.waitForTimeout(1000)
const app = await ctx.newPage(); await app.goto('http://localhost:3000/es', { waitUntil: 'networkidle' })
await app.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await app.waitForTimeout(2500)
for (const [r, a] of PARES) console.log(`${r.padEnd(14)} maqueta ${await medir(ref, r)}  app ${await medir(app, a)}`)
await b.close()
