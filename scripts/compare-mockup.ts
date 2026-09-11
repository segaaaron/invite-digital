/**
 * Compara los dieciséis diseños **contra la maqueta renderizada**, no contra su código.
 *
 * Es la herramienta que faltaba. La fidelidad se comprobaba leyendo el `.jsx` y mirando
 * capturas sueltas, y así se colaron un peso de letra distinto en los dieciséis, la
 * monoespaciada del sistema en los botones y el reparto de color de seis diseños de XV.
 *
 * Necesita las dos cosas servidas:
 *
 *   pnpm dev                                   · el sitio, en el 3000
 *   cd <carpeta de la maqueta> && python3 -m http.server 8899
 *
 * y un `__cmp.html` en la carpeta de la maqueta que pinte un componente suyo a 390 px con
 * el alto de su contenido. **Bórralo al terminar**: es la carpeta del usuario, no el
 * repositorio.
 *
 *   pnpm tsx scripts/compare-mockup.ts
 */
import { chromium, type Page } from '@playwright/test'

/** Cada diseño nuestro con el componente de la maqueta del que sale. */
const PAREJAS: readonly (readonly [string, string])[] = [
  ['boda', 'WeddingInvite'],
  ['boda-bot', 'WeddingBotanical'],
  ['boda-cin', 'WeddingCinematic'],
  ['boda-ed', 'WeddingEditorial'],
  ['civil', 'CivilWeddingInvite'],
  ['aniv', 'AnniversaryInvite'],
  ['eng', 'EngagementInvite'],
  ['dest', 'DestinationWeddingInvite'],
  ['xv', 'QuinceInvite'],
  ['xv-natalia', 'QuinceInviteNatalia'],
  ['xv-valentina', 'QuinceInviteValentina'],
  ['xv-luciana', 'QuinceInviteLuciana'],
  ['xv-fantasia', 'QuinceInviteFantasia'],
  ['xv-valeria', 'QuinceInviteValeria'],
  ['xv-mariana', 'QuinceInviteMariana'],
  ['xv-isabelle', 'QuinceIsabelleBotanical'],
]

/** Lo que se mide de cada texto que la invitación pinta. */
type Pieza = { texto: string; size: string; weight: string; ls: string; font: string; color: string }

const recoger = (pg: Page, raiz: string) =>
  pg.evaluate((raiz) => {
    const base = document.querySelector(raiz)
    if (base === null) return []
    return [...base.querySelectorAll('*')]
      // Fuera el texto que solo existe para el lector de pantalla: no se ve, y su tamaño
      // y color son los del botón que lo envuelve.
      .filter((e) => e.children.length === 0 && !e.classList.contains('sr-only'))
      .map((e) => {
        const cs = getComputedStyle(e)
        return {
          texto: (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 48),
          size: cs.fontSize,
          weight: cs.fontWeight,
          ls: cs.letterSpacing,
          font: (cs.fontFamily.split(',')[0] ?? '').replace(/['"]/g, '').toLowerCase().replace(/[^a-z]/g, '').replace(/theme$/, '').replace(/garamond$/, ''),
          color: cs.color,
        }
      })
      .filter((p) => p.texto.length > 1)
  }, raiz)

async function main() {
  const nav = await chromium.launch()
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' })
  const m = await ctx.newPage()
  const n = await ctx.newPage()

  for (const [clave, comp] of PAREJAS) {
    await m.goto(`http://localhost:8899/__cmp.html?c=${comp}`, { waitUntil: 'load', timeout: 90000 })
    await m.waitForTimeout(6500)
    await m.evaluate(() => document.fonts.ready)
    await m.evaluate(() => {
      const tapa = [...document.querySelectorAll('div')].find(
        (d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '50',
      )
      ;(tapa as HTMLElement | undefined)?.click()
    })
    await m.waitForTimeout(1500)
    const maqueta: Pieza[] = await recoger(m, '#marco')
    const altoM = await m.evaluate(() => (document.querySelector('#marco') as HTMLElement | null)?.offsetHeight ?? 0)

    await n.goto(`http://localhost:3000/modelos/es/${clave}`, { waitUntil: 'load', timeout: 60000 })
    await n.waitForTimeout(1200)
    const portada = n.getByRole('button', { name: /abrir la invitaci/i })
    if (await portada.count()) { await portada.first().click(); await n.waitForTimeout(500) }
    await n.evaluate(() => document.fonts.ready)
    await n.waitForTimeout(1000)
    const nuestro: Pieza[] = await recoger(n, 'article')
    const altoN = await n.evaluate(() => (document.querySelector('article') as HTMLElement | null)?.scrollHeight ?? 0)

    // Se emparejan **en orden**, no por texto suelto: «12», «19:00» o el nombre de la
    // quinceañera salen varias veces en la misma invitación, y emparejarlos por su texto
    // cruzaba la fecha con el cronograma y daba diferencias que no existían.
    const faltan: string[] = []
    const distintas: string[] = []
    let j = 0
    for (const p of maqueta) {
      const k = nuestro.findIndex((q, i) => i >= j && q.texto === p.texto)
      if (k === -1) {
        faltan.push(p.texto)
        continue
      }
      const q = nuestro[k]
      if (q === undefined) continue
      j = k + 1
      if (p.size !== q.size || p.font !== q.font || p.color !== q.color || p.weight !== q.weight) {
        distintas.push(
          `«${p.texto}» maqueta ${p.size}/${p.weight}/${p.font}/${p.color} · nuestro ${q.size}/${q.weight}/${q.font}/${q.color}`,
        )
      }
    }

    console.log(`\n### ${clave}  (alto maqueta ${altoM} · nuestro ${altoN})`)
    if (faltan.length > 0) console.log('  SIN PINTAR:', faltan.slice(0, 12).join(' | '))
    for (const d of distintas.slice(0, 14)) console.log('  ≠', d)
    if (faltan.length === 0 && distintas.length === 0) console.log('  sin diferencias')
  }
  await nav.close()
}
main()
