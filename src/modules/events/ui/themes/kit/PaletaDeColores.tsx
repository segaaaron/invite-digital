/**
 * Los colores sugeridos del código de vestimenta: una fila de círculos.
 *
 * Los colores vienen del contenido del evento, no del diseño; el borde sí es del diseño, para
 * que un marfil se distinga sobre un papel marfil.
 */
export function PaletaDeColores({ colores, borde, etiqueta, tam = 30, marginTop = 16 }: { colores: readonly string[] | undefined; borde: string; etiqueta: string; tam?: number; marginTop?: number }) {
  if (colores === undefined || colores.length === 0) return null
  return (
    <ul aria-label={etiqueta} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, listStyle: 'none', margin: `${marginTop}px 0 0`, padding: 0 }}>
      {colores.map((color) => (
        <li
          key={color}
          style={{ width: tam, height: tam, borderRadius: '50%', background: color, border: `1.5px solid ${borde}`, boxShadow: '0 2px 6px rgba(0,0,0,.12)' }}
          title={color}
        />
      ))}
    </ul>
  )
}
