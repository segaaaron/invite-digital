'use client'

import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { FileteDeEsencia } from './esencia-ornamentos'
import { PALETA as P } from './esencia.palette'

type Props = {
  /** El lino del fondo. */
  readonly bgAsset: string
  /** «Nos casamos», del diccionario. */
  readonly rotulo: string
  readonly nameA: string | undefined
  readonly nameB: string | undefined
  /** Las iniciales de la tarjeta y del lacre: «V & M». */
  readonly monogram: string
  /** La fecha corta: «20 · 12 · 2027». */
  readonly fecha: string
  /** «Toca para abrir», del diccionario. */
  readonly hint: string
  readonly openLabel: string
}

/** Cuánto dura cada tramo de la apertura, como en la maqueta: la solapa y la carta, el fundido y fuera. */
const FUNDIDO_MS = 1500
const FUERA_MS = 2300

/**
 * La portada de «Esencia» en la maqueta V4 (`EsenciaEnvelope`): un sobre de lino con su lacre.
 *
 * Al tocarlo la solapa gira, la carta con las iniciales asoma, el sobre baja y la portada se
 * funde. Los temporizadores son de la animación, sin red. Con «reducir movimiento» se abre de
 * golpe. Es un `<button>`: con teclado también se abre.
 */
export function EsenciaSobre({ bgAsset, rotulo, nameA, nameB, monogram, fecha, hint, openLabel }: Props) {
  const [tramo, setTramo] = useState<0 | 1 | 2 | 3>(0)

  if (tramo === 3) return null

  const abrir = () => {
    if (tramo !== 0) return
    if (prefiereMenosMovimiento()) {
      setTramo(3)
      return
    }
    setTramo(1)
    setTimeout(() => setTramo(2), FUNDIDO_MS)
    setTimeout(() => setTramo(3), FUERA_MS)
  }
  const abriendo = tramo > 0

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      data-cargando=""
      onClick={abrir}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        cursor: 'pointer',
        border: 'none',
        width: '100%',
        background: P.papel,
        backgroundImage: `url(${bgAsset})`,
        backgroundSize: 'auto 130%',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: P.tinta,
        opacity: tramo === 2 ? 0 : 1,
        transition: 'opacity 0.8s ease',
      }}
      type="button"
    >
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: 34,
          opacity: abriendo ? 0 : 1,
          transform: abriendo ? 'translateY(-8px)' : 'none',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 300, fontSize: 11.2, letterSpacing: '0.3em', color: P.oro, textTransform: 'uppercase' }}>
          {rotulo}
        </span>
        <FileteDeEsencia />
        <span style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 300, fontSize: 40, lineHeight: 1.1, color: P.tinta }}>
          {nameA}
          {nameB === undefined ? null : (
            <>
              {' '}
              <span style={{ fontStyle: 'italic', color: P.oro }}>&amp;</span> {nameB}
            </>
          )}
        </span>
      </span>

      {/* El sobre: fondo, carta, frente, solapa y lacre, de atrás hacia delante. */}
      <span
        aria-hidden
        style={{
          position: 'relative',
          display: 'block',
          width: 'min(334px, 88%)',
          aspectRatio: '1.5',
          perspective: 900,
          transform: abriendo ? 'translateY(40px)' : 'none',
          transition: 'transform 1.2s ease 0.5s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            bottom: -18,
            height: 26,
            borderRadius: '50%',
            background: P.sombraSobre,
            filter: 'blur(12px)',
            opacity: abriendo ? 0 : 1,
            transition: 'opacity 0.6s',
          }}
        />
        <span style={{ position: 'absolute', inset: 0, background: P.sobre, borderRadius: 4, boxShadow: P.sombraDelSobre }} />
        <span
          style={{
            position: 'absolute',
            left: '7%',
            right: '7%',
            top: '8%',
            bottom: '8%',
            background: P.carta,
            borderRadius: 2,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: abriendo ? 'translateY(-55%)' : 'none',
            transition: 'transform 1s ease 0.55s',
            fontFamily: 'var(--font-cormorant)',
            fontSize: 19,
            color: P.tinta,
            letterSpacing: '0.08em',
          }}
        >
          {monogram}
        </span>
        <span style={{ position: 'absolute', inset: 0, zIndex: 3, background: P.frenteSobre, clipPath: 'polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)', borderRadius: 4 }} />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            background: P.brilloSobre,
            clipPath: 'polygon(0 100%, 50% 52%, 100% 100%)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '62%',
            zIndex: abriendo ? 1 : 4,
            transformOrigin: 'top center',
            transform: abriendo ? 'rotateX(180deg)' : 'rotateX(0deg)',
            transition: 'transform 0.8s ease, z-index 0s linear 0.4s',
            filter: `drop-shadow(0 3px 4px ${P.sombraSolapa})`,
          }}
        >
          <span style={{ position: 'absolute', inset: 0, background: P.solapa, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
          <svg preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100">
            <path d="M0.5 0.5 L50 99 L99.5 0.5" fill="none" stroke={P.filoSolapa} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '62%',
            zIndex: 5,
            width: 62,
            height: 62,
            marginLeft: -31,
            marginTop: -31,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${P.lacreClaro}, ${P.oro} 58%, ${P.lacreOscuro})`,
            boxShadow: P.sombraLacre,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-cormorant)',
            fontSize: 15,
            color: P.papel,
            letterSpacing: '0.04em',
            opacity: abriendo ? 0 : 1,
            transform: abriendo ? 'scale(0.7)' : 'scale(1)',
            transition: 'all 0.4s ease',
          }}
        >
          {monogram}
        </span>
      </span>

      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 38,
          opacity: abriendo ? 0 : 1,
          transform: abriendo ? 'translateY(8px)' : 'none',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {fecha === '' ? null : (
          <span style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 400, fontSize: 21, letterSpacing: '0.12em', color: P.gris }}>{fecha}</span>
        )}
        <span
          className="theme-quieto-si-reduce"
          style={{
            marginTop: 30,
            fontFamily: 'var(--font-outfit)',
            fontWeight: 300,
            fontSize: 11.2,
            letterSpacing: '0.24em',
            color: P.tintaSuave,
            textTransform: 'uppercase',
            animation: 'theme-esBlink 2.4s ease-in-out infinite',
          }}
        >
          {hint}
        </span>
      </span>
    </button>
  )
}
