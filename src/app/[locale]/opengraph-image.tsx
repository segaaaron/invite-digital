import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { BRAND } from '@/shared/config/brand'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${BRAND.siteName} — ${BRAND.tagline}`

/**
 * Satori renders this outside the browser: it never sees globals.css, so the tokens
 * cannot be referenced by `var()` and the palette has to be inlined here. Same
 * exception as the 3D scene materials — these are image pixels, not page CSS.
 */
const PAGE_BG = '#f6f1e9'
const RAISED_BG = '#fdfaf4'
const INK = '#2b2723'
const INK_SOFT = '#58514a'
const GOLD = '#c19b4a'

// Satori only reads TTF/OTF, so the brand faces ship next to this route as TTF,
// converted from the same woff2 files the site serves.
const FONT_DIR = join(process.cwd(), 'src/shared/seo')

const loadFonts = async () => [
  { name: 'Cormorant Garamond', data: await readFile(join(FONT_DIR, 'cormorant-garamond-400.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Jost', data: await readFile(join(FONT_DIR, 'jost-300.ttf')), weight: 300 as const, style: 'normal' as const },
]

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw) ?? 'en'
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
          background: `linear-gradient(135deg, ${RAISED_BG} 0%, ${PAGE_BG} 55%, #efe7dc 100%)`,
          padding: '80px',
          fontFamily: 'Cormorant Garamond',
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Jost', fontSize: 30, letterSpacing: 18, color: GOLD }}>LUXE</div>
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
          {BRAND.siteName} · {BRAND.city}
        </div>
      </div>
    ),
    { ...size, fonts: await loadFonts() },
  )
}
