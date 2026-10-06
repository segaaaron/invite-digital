'use client'

import { useState, type ReactNode } from 'react'

type Props = {
  /** El oro o el morado del diseño: la pestaña elegida y el sobre. */
  readonly acento: string
  /** La tinta sobre la pestaña elegida. */
  readonly sobreAcento: string
  readonly tinta: string
  readonly borde: string
  readonly sombra?: string | undefined
  /** «Lluvia de sobres» y su nota, si el cliente la encendió (o la muestra del diseño). */
  readonly sobres: { readonly rotulo: string; readonly nota: string | undefined } | null
  /** «Transferencia QR» y lo que va dentro: el QR del banco y los datos de la cuenta. */
  readonly transferencia: { readonly rotulo: string; readonly contenido: ReactNode } | null
}

/**
 * Las dos formas de regalar de los XV en la maqueta V4 (`F3GiftTabs`): «Lluvia de sobres» y
 * «Transferencia QR» en dos pestañas. Con una sola forma no hay pestañas: se ve esa.
 */
export function PestanasDeRegalo({ acento, sobreAcento, tinta, borde, sombra, sobres, transferencia }: Props) {
  const [pestana, setPestana] = useState<'sobres' | 'transferencia'>(sobres === null ? 'transferencia' : 'sobres')
  if (sobres === null && transferencia === null) return null

  const boton = (id: 'sobres' | 'transferencia', rotulo: string) => {
    const elegida = pestana === id
    return (
      <button
        aria-pressed={elegida}
        key={id}
        onClick={() => setPestana(id)}
        style={{
          flex: 1,
          minWidth: 0,
          cursor: 'pointer',
          padding: '10px 6px',
          borderRadius: 30,
          border: `1.5px solid ${elegida ? acento : 'transparent'}`,
          background: elegida ? acento : 'transparent',
          color: elegida ? sobreAcento : tinta,
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 10.5,
          letterSpacing: '0.14em',
          fontWeight: 700,
          textTransform: 'uppercase',
          transition: 'all .25s',
        }}
        type="button"
      >
        {rotulo}
      </button>
    )
  }

  return (
    <div style={{ marginTop: 24, textAlign: 'center', color: tinta }}>
      {sobres === null || transferencia === null ? null : (
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 30, border: `1px solid ${borde}` }}>
          {boton('sobres', sobres.rotulo)}
          {boton('transferencia', transferencia.rotulo)}
        </div>
      )}
      {pestana === 'sobres' && sobres !== null ? (
        <div style={{ padding: '18px 4px 2px' }}>
          <svg aria-hidden height="40" style={{ display: 'block', margin: '0 auto' }} viewBox="0 0 54 40" width="54">
            <rect fill="none" height="36" rx="3" stroke={acento} strokeWidth="1.6" width="50" x="2" y="2" />
            <path d="M3 4 L27 22 L51 4" fill="none" stroke={acento} strokeWidth="1.6" />
          </svg>
          {transferencia === null ? (
            <div style={{ marginTop: 10, fontFamily: 'var(--font-dm-sans)', fontSize: 15, fontWeight: 700, color: tinta, textShadow: sombra }}>{sobres.rotulo}</div>
          ) : null}
          {sobres.nota === undefined ? null : (
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, lineHeight: 1.6, marginTop: 10, color: tinta, textShadow: sombra }}>{sobres.nota}</div>
          )}
        </div>
      ) : transferencia !== null ? (
        <div style={{ padding: '16px 4px 0' }}>{transferencia.contenido}</div>
      ) : null}
    </div>
  )
}
