import type { CSSProperties, ReactNode } from 'react'

type Props = {
  readonly rotulo: string
  /** El botón de la maqueta de cada diseño: fondo, tinta, letra, relleno y radio. */
  readonly estilo: CSSProperties
  /** La mesa de verdad (la ranura `registry`). `null` en el escaparate y la vista previa. */
  readonly children: ReactNode
  /** Sin mesa: en la muestra se enseña el botón (es parte del diseño); en una invitación, nada. */
  readonly muestra: boolean
}

/**
 * «VER MESA DE REGALOS» (PDF 9 oct): las bodas de la maqueta cierran la mesa de regalos con ese
 * botón. Con mesa detrás, abre lo que el cliente cargó (formas de regalar y la lista) sin
 * empujar el resto de la invitación; con `<details>` nativo, sin estado.
 */
export function VerMesaDeRegalos({ rotulo, estilo, children, muestra }: Props) {
  const boton: CSSProperties = { display: 'inline-block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.15em', ...estilo }
  if (children === null || children === undefined) return muestra ? <div style={{ marginTop: 22 }}><span style={boton}>{rotulo}</span></div> : null
  return (
    <details style={{ marginTop: 22 }}>
      <summary className="list-none [&::-webkit-details-marker]:hidden" style={{ ...boton, cursor: 'pointer' }}>
        {rotulo}
      </summary>
      <div style={{ marginTop: 22, textAlign: 'left' }}>{children}</div>
    </details>
  )
}
