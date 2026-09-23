import type { ItineraryRow } from '../../../domain/invitation-content'

/**
 * El cronograma de los XV de `xv-premium.jsx` (`cronoRow` de la maqueta): una fila por hito,
 * la hora en monoespaciada del acento, el momento debajo y, si lo hay, su detalle atenuado,
 * con un filete discontinuo entre filas.
 */
export function CronogramaXv({ filas, acento, filete }: { readonly filas: readonly ItineraryRow[]; readonly acento: string; readonly filete: string }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {filas.map((fila) => (
        <li
          key={`${fila.time}-${fila.label}`}
          style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14, padding: '12px 0', borderBottom: `1px dashed ${filete}` }}
        >
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, fontWeight: 500, color: acento }}>{fila.time}</span>
          <span>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>{fila.label}</span>
            {fila.note === undefined ? null : <span style={{ display: 'block', fontSize: 11, opacity: 0.65, marginTop: 2 }}>{fila.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
