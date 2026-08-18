import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PALETTE, PALETTE_TOKENS, type PaletteColor } from './palette'

const tokens = readFileSync(join(process.cwd(), 'src/shared/design/tokens.css'), 'utf-8')

const valueOf = (token: string): string | undefined =>
  new RegExp(`${token}:\\s*(#[0-9a-fA-F]{3,8});`).exec(tokens)?.[1]

describe('PALETTE', () => {
  it.each(Object.keys(PALETTE) as PaletteColor[])('%s coincide con su token de tokens.css', (color) => {
    expect(valueOf(PALETTE_TOKENS[color])).toBe(PALETTE[color])
  })
})
