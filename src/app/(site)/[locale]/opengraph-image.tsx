import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'
import { BRAND } from '@/shared/config/brand'
import { PALETTE } from '@/shared/design/palette'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { LOCALES } from '@/shared/i18n/locales'
import { parseLocaleParam } from '@/shared/i18n/server'

export const size = { width: 1200, height: 630 }
// Only the real locales get an image; anything else is a 404, not a render.
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}
export const contentType = 'image/png'
export const alt = `${BRAND.siteName} — ${BRAND.tagline}`

// Satori renders outside the browser and never sees globals.css, so `var(--color-*)`
// does not exist here; the values come from the shared palette instead of being copied.
const PAGE_BG = PALETTE.bg
const RAISED_BG = PALETTE.bgRaised
const SUNKEN_BG = PALETTE.bgSunken
const INK = PALETTE.ink
const INK_SOFT = PALETTE.inkSoft
const GOLD = PALETTE.gold

// Satori only reads TTF/OTF, so the brand faces ship next to this route as TTF,
// converted from the same woff2 files the site serves.
const FONT_DIR = join(process.cwd(), 'src/shared/seo')

// Memoized: without this every request re-reads ~100 KB of TTF from disk.
let fontsPromise: Promise<Font[]> | null = null

type Font = { name: string; data: Buffer; weight: 400 | 300; style: 'normal' }

const loadFonts = (): Promise<Font[]> => {
  fontsPromise ??= readFonts()
  return fontsPromise
}

const readFonts = async (): Promise<Font[]> => [
  { name: 'Cormorant Garamond', data: await readFile(join(FONT_DIR, 'cormorant-garamond-400.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Jost', data: await readFile(join(FONT_DIR, 'jost-300.ttf')), weight: 300 as const, style: 'normal' as const },
]

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  // Without this, /cualquier-cosa/opengraph-image renders a 200 image even though the
  // page itself is a 404 — an unbounded, unauthenticated satori render per prefix.
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${RAISED_BG} 0%, ${PAGE_BG} 55%, ${SUNKEN_BG} 100%)`,
          padding: '80px',
          fontFamily: 'Cormorant Garamond',
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Jost', fontSize: 30, letterSpacing: 18, color: GOLD }}>LUXURY ATELIER</div>
        <div style={{ display: 'flex', width: 90, height: 1, background: GOLD, margin: '28px 0 36px' }} />
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            lineHeight: 1.15,
            color: INK,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          {dictionary.hero.titleLine1} {dictionary.hero.titleLine2} {dictionary.hero.titleAccent}
        </div>
        <div
          style={{ display: 'flex', fontFamily: 'Jost', marginTop: 40, fontSize: 22, color: INK_SOFT, letterSpacing: 4 }}
        >
          {BRAND.siteName} · {BRAND.tagline}
        </div>
      </div>
    ),
    { ...size, fonts: await loadFonts() },
  )
}
