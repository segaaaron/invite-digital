type Props = {
  readonly color: string
  readonly glyph?: string
  readonly glyphColor?: string
}

/** El filete con un glifo en medio que separa secciones. */
export function Divider({ color, glyph = '✦', glyphColor = 'currentColor' }: Props) {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0', color: glyphColor }}>
      <div style={{ flex: 1, height: 1, background: color }} />
      <div style={{ fontSize: 12, opacity: 0.7 }}>{glyph}</div>
      <div style={{ flex: 1, height: 1, background: color }} />
    </div>
  )
}
