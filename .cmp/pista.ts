import { chromium } from '@playwright/test'
async function main() {
  const nav = await chromium.launch()
  const pg = await (await nav.newContext({ viewport: { width: 390, height: 900 } })).newPage()
  await pg.goto('http://localhost:3000/i/jU6VM6W_pZf_IFWJGhtAvn', { waitUntil: 'load' })
  await pg.waitForTimeout(2500)
  console.log(
    await pg.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((e) => e.children.length === 0 && (e.textContent ?? '').trim() === 'Tiempo de Vals')
        .map((e) => {
          const cs = getComputedStyle(e)
          return `${e.tagName} size=${cs.fontSize} color=${cs.color} padre=${e.parentElement?.tagName}`
        })
        .join('\n'),
    ),
  )
  await nav.close()
}
main()
