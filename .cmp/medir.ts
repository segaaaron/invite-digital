import { chromium } from '@playwright/test'

const HITOS = [
  'MIS QUINCE', 'XV', 'AÑOS', 'Sofía', 'Que la vida', 'Agradecida por el amor',
  'Angel Pereira', 'Septiembre', 'Faltan', 'Tu presencia', 'Recepción Social',
  'Cronograma', 'Tiempo de Vals', 'Código de Vestimenta', 'Detalles que Abrazan',
  'Lluvia de Sobres', 'Solo Adultos', 'Confirma tu', 'Gracias por acompañarme', 'Que Dios guarde',
]

async function medir(pg: import('@playwright/test').Page, raiz: string) {
  return pg.evaluate(
    ({ hitos, raiz }) => {
      const base = document.querySelector(raiz) as HTMLElement | null
      const y0 = base ? base.getBoundingClientRect().top + window.scrollY : 0
      const salida: Record<string, { y: number; alto: number; size: string; color: string; font: string }> = {}
      for (const h of hitos) {
        const el = [...(base ?? document).querySelectorAll('*')].find(
          (e) => e.children.length === 0 && (e.textContent ?? '').trim().startsWith(h),
        ) as HTMLElement | undefined
        if (!el) continue
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        salida[h] = {
          y: Math.round(r.top + window.scrollY - y0),
          alto: Math.round(r.height),
          size: cs.fontSize,
          color: cs.color,
          font: cs.fontFamily.split(',')[0].replace(/['"]/g, ''),
        }
      }
      return salida
    },
    { hitos: HITOS, raiz },
  )
}

async function main() {
  const nav = await chromium.launch()
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })

  const m = await ctx.newPage()
  await m.goto('http://localhost:8899/__cmp.html?c=QuinceInvite', { waitUntil: 'load', timeout: 90000 })
  await m.waitForTimeout(7000)
  await m.evaluate(() => document.fonts.ready)
  await m.evaluate(() => {
    const tapa = [...document.querySelectorAll('div')].find(
      (d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '50',
    )
    ;(tapa as HTMLElement | undefined)?.click()
  })
  await m.waitForTimeout(2500)
  const maqueta = await medir(m, '#marco')
  console.log('alto maqueta', await m.evaluate(() => document.querySelector('#marco')?.offsetHeight))

  const n = await ctx.newPage()
  await n.goto(`http://localhost:3000/modelos/es/${process.argv[2] ?? 'xv'}`, { waitUntil: 'load', timeout: 60000 })
  await n.waitForTimeout(3000)
  const portada = n.getByRole('button', { name: /abrir la invitaci/i })
  if (await portada.count()) { await portada.first().click(); await n.waitForTimeout(600) }
  await n.evaluate(() => document.fonts.ready)
  await n.waitForTimeout(1200)
  const nuestro = await medir(n, 'article')
  console.log('alto nuestro', await n.evaluate(() => document.querySelector('article')?.scrollHeight))

  console.log('hito'.padEnd(24), 'maqueta'.padEnd(30), 'nuestro')
  for (const h of HITOS) {
    const a = maqueta[h]
    const b = nuestro[h]
    const fa = a ? `y=${a.y} ${a.size} ${a.font} ${a.color}` : 'FALTA'
    const fb = b ? `y=${b.y} ${b.size} ${b.font} ${b.color}` : 'FALTA'
    const igual = a && b && a.size === b.size && a.font === b.font && a.color === b.color
    console.log(h.padEnd(24), fa.padEnd(46), fb, igual ? '' : '  <<<')
  }
  await nav.close()
}
main()
